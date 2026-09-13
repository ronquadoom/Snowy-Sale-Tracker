const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 4173);
const HOST = '0.0.0.0';
const GROUP_ID = process.env.ROBLOX_GROUP_ID || '370302186';
const ROOT = __dirname;
const ROBLOX_TRANSACTIONS_URL = `https://economy.roblox.com/v2/groups/${GROUP_ID}/transactions`;

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

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}

function normalizeTransaction(transaction) {
  const details = transaction.details || {};
  const assetId = details.id || details.assetId || details.itemId || '';
  const assetName = details.name || details.assetName || transaction.description || (assetId ? `Asset ${assetId}` : 'Unknown asset');
  const agent = transaction.agent || {};
  const revenue = transaction.currency && transaction.currency.amount;
  return {
    id: String(transaction.id || `${assetId}-${transaction.created || Math.random()}`),
    buyer: agent.id ? String(agent.id) : '',
    date: transaction.created || '',
    location: details.location || details.saleLocation || 'Roblox',
    universe: details.universe || '',
    assetId: assetId ? String(assetId) : '',
    assetName: String(assetName),
    assetType: details.type || details.assetType || 'ASSET',
    holdStatus: transaction.isPending ? 'Held' : 'Released',
    // This is the Robux amount deposited into the group for the transaction.
    revenue: typeof revenue === 'number' ? revenue : null,
    price: null,
  };
}

async function getLiveSales() {
  if (!process.env.ROBLOX_COOKIE) {
    return { configured: false, sales: [], message: 'ROBLOX_COOKIE is not configured on the server.' };
  }

  const query = new URLSearchParams({ transactionType: 'Sale', limit: '100', sortOrder: 'Desc' });
  const response = await fetch(`${ROBLOX_TRANSACTIONS_URL}?${query}`, {
    headers: {
      accept: 'application/json',
      // Keep the session secret on the server. It is never sent to the browser.
      cookie: `.ROBLOSECURITY=${process.env.ROBLOX_COOKIE}`,
    },
  });

  if (!response.ok) {
    return { configured: true, sales: [], message: `Roblox returned HTTP ${response.status}.` };
  }

  const payload = await response.json();
  return {
    configured: true,
    sales: Array.isArray(payload.data) ? payload.data.map(normalizeTransaction).filter((sale) => sale.assetId || sale.assetName) : [],
    fetchedAt: new Date().toISOString(),
  };
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, groupId: GROUP_ID, liveSalesConfigured: Boolean(process.env.ROBLOX_COOKIE) });
  }
  if (url.pathname === '/api/sales') {
    try {
      const result = await getLiveSales();
      return json(res, result.configured && result.message ? 502 : 200, result);
    } catch (error) {
      return json(res, 502, { configured: true, sales: [], message: 'Unable to reach Roblox live sales right now.' });
    }
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

server.listen(PORT, HOST, () => {
  console.log(`Snowy’sz tracker listening on ${HOST}:${PORT}`);
  console.log(`Live sales API: ${process.env.ROBLOX_COOKIE ? 'configured' : 'not configured'}`);
});
