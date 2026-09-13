const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 4173);
const HOST = '0.0.0.0';
const GROUP_ID = process.env.ROBLOX_GROUP_ID || '370302186';
const ROOT = __dirname;
const USER_AGENT = 'SnowyszLiveSalesTracker/1.0 (limited UGC sales only)';
const ROBLOX_TRANSACTIONS_URL = `https://economy.roblox.com/v2/groups/${GROUP_ID}/transactions`;
const ASSET_DETAILS_CACHE_TTL_MS = 10 * 60 * 1000;
const ASSET_DETAILS_CONCURRENCY = 8;
const ASSET_DETAILS_BUDGET_MS = 12 * 1000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Caches Roblox asset details (limited status + name) between polls so each
// asset is only looked up once every ten minutes. Asset details are public
// and need no session, unlike the group transactions endpoint.
const assetDetailsCache = new Map(); // assetId -> { fetchedAt, details }
const assetDetailsInflight = new Map(); // assetId -> Promise<details>

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}

function normalizeCookie(rawValue) {
  let value = String(rawValue || '').trim();
  value = value.replace(/^cookie\s*:\s*/i, '').replace(/^['"]|['"]$/g, '');
  if (/\.ROBLOSECURITY\s*=/i.test(value)) value = value.split(';')[0].split('=').slice(1).join('=').trim();
  return value.replace(/^['"]|['"]$/g, '').trim();
}

async function getAssetDetails(assetId) {
  const key = String(assetId);
  const cached = assetDetailsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < ASSET_DETAILS_CACHE_TTL_MS) return cached.details;
  if (assetDetailsInflight.has(key)) return assetDetailsInflight.get(key);

  const task = (async () => {
    try {
      const response = await fetch(`https://economy.roblox.com/v2/assets/${encodeURIComponent(key)}/details`, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      });
      if (!response.ok) throw new Error(`Asset details HTTP ${response.status}`);
      const details = await response.json();
      assetDetailsCache.set(key, { fetchedAt: Date.now(), details });
      return details;
    } catch (error) {
      // Negative cache: unavailable or deleted assets are not re-queried
      // on every poll within the TTL window.
      assetDetailsCache.set(key, { fetchedAt: Date.now(), details: null });
      return null;
    }
  })();
  assetDetailsInflight.set(key, task);
  try {
    return await task;
  } finally {
    assetDetailsInflight.delete(key);
  }
}

function normalizeTransaction(transaction, assetDetails) {
  const details = transaction.details || {};
  const agent = transaction.agent || {};
  const revenue = transaction.currency && typeof transaction.currency.amount === 'number'
    ? transaction.currency.amount
    : null;
  const isLimited = Boolean(assetDetails && assetDetails.IsLimited);
  const isLimitedUnique = Boolean(assetDetails && assetDetails.IsLimitedUnique);
  return {
    id: String(transaction.id || `${details.id || 'sale'}-${transaction.created || ''}`),
    buyerId: agent.id ? String(agent.id) : '',
    buyerName: String(agent.name || ''),
    date: String(transaction.created || ''),
    location: String(details.location || details.saleLocation || ''),
    universe: String(details.universe || ''),
    assetId: String(assetDetails?.AssetId || details.id || ''),
    assetName: String(assetDetails?.Name || details.name || 'Unknown asset'),
    assetType: String(details.type || 'Asset'),
    holdStatus: transaction.isPending ? 'Held' : 'Released',
    // Robux deposited into the group for this transaction (real API value).
    // The Revenue › Sales feed does not expose the per-sale price, so no
    // price is ever invented or shown.
    revenue,
    isLimited,
    isLimitedUnique,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function getLiveSales() {
  const cookieValue = normalizeCookie(process.env.ROBLOX_COOKIE);
  if (!cookieValue) {
    return {
      status: 'live-required',
      configured: false,
      connected: false,
      limitedOnly: true,
      sales: [],
      message: 'LIVE REQUIRED — set the private ROBLOX_COOKIE environment variable on the Render backend to enable the live Roblox Revenue › Sales feed.',
    };
  }

  let response;
  try {
    const query = new URLSearchParams({ transactionType: 'Sale', limit: '100', sortOrder: 'Desc' });
    response = await fetch(`${ROBLOX_TRANSACTIONS_URL}?${query}`, {
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
        // The session secret never leaves the server; it is not exposed to the browser.
        cookie: `.ROBLOSECURITY=${cookieValue}`,
      },
    });
  } catch (error) {
    return {
      status: 'api-error',
      configured: true,
      connected: false,
      limitedOnly: true,
      sales: [],
      message: 'API ERROR — the backend could not reach the Roblox live sales API right now.',
    };
  }

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'API ERROR — Roblox rejected the session, or the account cannot view group revenue. Check ROBLOX_COOKIE on the Render backend.'
      : `API ERROR — Roblox returned HTTP ${response.status}.`;
    return {
      status: 'api-error',
      configured: true,
      connected: false,
      limitedOnly: true,
      sales: [],
      robloxStatus: response.status,
      message,
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    return {
      status: 'api-error',
      configured: true,
      connected: false,
      limitedOnly: true,
      sales: [],
      message: 'API ERROR — Roblox returned an unreadable response.',
    };
  }

  const transactions = Array.isArray(payload.data) ? payload.data : [];
  const deadline = Date.now() + ASSET_DETAILS_BUDGET_MS;

  // Verify every candidate sale against the public asset-details API and keep
  // ONLY limited / limited-unique UGC items. Normal (non-limited) sales are
  // dropped entirely. Cached lookups keep later polls fast; if the time
  // budget runs out, unknown assets are left for the next poll rather than
  // guessed at.
  const results = await mapWithConcurrency(transactions, ASSET_DETAILS_CONCURRENCY, async (transaction) => {
    const details = transaction.details || {};
    const assetId = details.id || details.assetId;
    if (!assetId) return { kind: 'skipped' };
    if (Date.now() > deadline && !assetDetailsCache.has(String(assetId))) return { kind: 'unknown' };
    const assetDetails = await getAssetDetails(assetId);
    if (!assetDetails) return { kind: 'unknown' };
    const isLimited = Boolean(assetDetails.IsLimited || assetDetails.IsLimitedUnique);
    if (!isLimited) return { kind: 'nonlimited' };
    return { kind: 'limited', sale: normalizeTransaction(transaction, assetDetails) };
  });

  const sales = results.filter((result) => result.kind === 'limited').map((result) => result.sale);
  const count = (kind) => results.filter((result) => result.kind === kind).length;

  return {
    status: 'live',
    configured: true,
    connected: true,
    limitedOnly: true,
    sales,
    fetchedAt: new Date().toISOString(),
    scanStats: {
      transactions: transactions.length,
      limited: count('limited'),
      nonLimited: count('nonlimited'),
      unknown: count('unknown'),
      skipped: count('skipped'),
    },
  };
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    const configured = Boolean(normalizeCookie(process.env.ROBLOX_COOKIE));
    return json(res, 200, {
      ok: true,
      groupId: GROUP_ID,
      liveSalesConfigured: configured,
      status: configured ? 'configured' : 'live-required',
    });
  }
  if (url.pathname === '/api/sales') {
    const result = await getLiveSales();
    const status = result.status === 'api-error' ? 502 : 200;
    return json(res, status, result);
  }
  return json(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname);
  if (requested === '/') requested = '/index.html';
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Snowy'sz tracker listening on ${HOST}:${PORT}`);
    console.log(`Live sales API: ${process.env.ROBLOX_COOKIE ? 'configured' : 'not configured (LIVE REQUIRED)'}`);
  });
}

module.exports = { getLiveSales, getAssetDetails, normalizeTransaction, assetDetailsCache, server };
