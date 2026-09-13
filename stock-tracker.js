// In-stock limited UGC tracker.
//
// Scans the 141 supplied Snowy'sz catalog IDs through Roblox's public catalog
// API (economy.roblox.com asset details — no session, no cookie) and keeps ONLY
// items that are:
//   1. limited (IsLimited, IsLimitedUnique, or the collectible's IsLimited flag),
//   2. printed in a total stock run of exactly 3,000 copies, and
//   3. still in stock (Remaining > 0).
// Sold-out items, non-limited items, and items that cannot prove the 3,000-copy
// run are excluded from the list but counted, so the dashboard can say why.
// No stock number is ever invented: if Roblox does not report it, the item is
// excluded instead of guessed at.

const { suppliedCatalog, assetIds: SUPPLIED_ASSET_IDS } = require('./catalog-ids');

const ASSET_DETAILS_URL = 'https://economy.roblox.com/v2/assets';
const USER_AGENT = 'SnowyszInStockTracker/1.0 (public catalog API, limited UGC only)';

// Every tracked item must be a 3,000-copy limited run.
const TOTAL_STOCK_REQUIREMENT = Number(process.env.UGC_TOTAL_STOCK || 3000);
const SCAN_CONCURRENCY = Number(process.env.UGC_SCAN_CONCURRENCY || 8);
const REQUEST_TIMEOUT_MS = Number(process.env.UGC_REQUEST_TIMEOUT_MS || 10000);
const REQUEST_RETRIES = 1; // one retry for 429 / 5xx only
const RETRY_DELAY_MS = Number(process.env.UGC_RETRY_DELAY_MS || 400);
const STOCK_CACHE_TTL_MS = Number(process.env.UGC_CACHE_TTL_MS || 60000);
const MIN_SCAN_INTERVAL_MS = Number(process.env.UGC_MIN_SCAN_INTERVAL_MS || 45000);

const STATUS = Object.freeze({
  IN_STOCK: 'in-stock',
  SOLD_OUT: 'sold-out',
  NON_LIMITED: 'non-limited',
  STOCK_MISMATCH: 'stock-mismatch',
  UNKNOWN_STOCK: 'unknown-stock',
  UNAVAILABLE: 'unavailable',
});

const EXCLUDED_STATUSES = Object.freeze([
  STATUS.SOLD_OUT,
  STATUS.NON_LIMITED,
  STATUS.STOCK_MISMATCH,
  STATUS.UNKNOWN_STOCK,
  STATUS.UNAVAILABLE,
]);

// assetId -> { fetchedAt, details } (details === null means "looked up, not found")
const stockDetailsCache = new Map();
const inflightDetails = new Map(); // assetId -> Promise
const inflightScans = new Map(); // scanKey -> Promise
let lastScanAt = 0;
let lastReport = null;
let warmupTimer = null;

function catalogUrl(assetId) {
  return `https://www.roblox.com/catalog/${assetId}`;
}

// Roblox uses null for "not reported". Number(null) is 0, so null / empty /
// boolean values must be rejected explicitly — otherwise a missing stock or
// price would silently read as zero.
function finiteNumber(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function limitedType(details) {
  const collectibleLimited = Boolean(details?.CollectiblesItemDetails?.IsLimited);
  if (details?.IsLimitedUnique) return 'Limited Unique';
  if (details?.IsLimited || collectibleLimited) return 'Limited';
  return null;
}

// Reads exactly what Roblox reports. Missing / non-numeric values stay null so
// the classifier can exclude the item rather than assume a number.
function readAsset(assetId, details) {
  const collectible = details?.CollectiblesItemDetails || null;
  const apiName = typeof details?.Name === 'string' ? details.Name.trim() : '';
  return {
    assetId: String(details?.AssetId || assetId),
    name: apiName,
    limitedType: limitedType(details),
    isLimited: Boolean(details?.IsLimited),
    isLimitedUnique: Boolean(details?.IsLimitedUnique),
    // Total print run. For UGC collectibles Roblox reports it under
    // CollectiblesItemDetails.TotalQuantity.
    totalStock: finiteNumber(collectible?.TotalQuantity),
    // Copies still available for the primary sale.
    stock: finiteNumber(details?.Remaining),
    priceInRobux: finiteNumber(details?.PriceInRobux),
    forSale: Boolean(details?.IsForSale),
    assetTypeId: finiteNumber(details?.AssetTypeId),
    collectibleItemId: typeof details?.CollectibleItemId === 'string' ? details.CollectibleItemId : null,
  };
}

function suppliedLabelFor(assetId) {
  const entry = suppliedCatalog.find((item) => String(item.assetId) === String(assetId));
  return entry ? entry.suppliedLabel : null;
}

// The single place an item is judged against the three requirements.
function classifyAsset(assetId, details) {
  // A missing, empty, or malformed payload means "Roblox told us nothing", so
  // the item is excluded as unavailable rather than judged on defaults.
  if (!details || typeof details !== 'object' || Array.isArray(details) || !Object.keys(details).length) {
    return { status: STATUS.UNAVAILABLE, item: { assetId: String(assetId), name: '', totalStock: null, stock: null } };
  }

  const item = readAsset(assetId, details);
  item.suppliedLabel = suppliedLabelFor(assetId) || item.suppliedLabel || null;
  item.url = catalogUrl(item.assetId);
  item.displayName = item.name && item.name !== '-' ? item.name : (item.suppliedLabel || `Item ${item.assetId}`);

  // 1. Non-limited items are never tracked.
  if (!item.limitedType) return { status: STATUS.NON_LIMITED, item };
  // 2. The 3,000-copy requirement must be provable and exact.
  if (item.totalStock === null) return { status: STATUS.UNKNOWN_STOCK, item };
  if (item.totalStock !== TOTAL_STOCK_REQUIREMENT) return { status: STATUS.STOCK_MISMATCH, item };
  // 3. Sold-out runs are dropped; only copies still in stock are tracked.
  if (item.stock === null) return { status: STATUS.UNKNOWN_STOCK, item };
  if (item.stock <= 0) return { status: STATUS.SOLD_OUT, item };

  return { status: STATUS.IN_STOCK, item };
}

function emptyTotals() {
  return {
    inStock: 0,
    soldOut: 0,
    nonLimited: 0,
    stockMismatch: 0,
    unknownStock: 0,
    unavailable: 0,
  };
}

const TOTAL_KEYS = Object.freeze({
  [STATUS.IN_STOCK]: 'inStock',
  [STATUS.SOLD_OUT]: 'soldOut',
  [STATUS.NON_LIMITED]: 'nonLimited',
  [STATUS.STOCK_MISMATCH]: 'stockMismatch',
  [STATUS.UNKNOWN_STOCK]: 'unknownStock',
  [STATUS.UNAVAILABLE]: 'unavailable',
});

// Turns classified entries into the payload the dashboard renders.
function buildStockReport(classified, options = {}) {
  const ids = options.ids || classified.map((entry) => entry.item.assetId);
  const totals = emptyTotals();
  const items = [];
  const excluded = [];

  for (const entry of classified) {
    totals[TOTAL_KEYS[entry.status]] = (totals[TOTAL_KEYS[entry.status]] || 0) + 1;
    if (entry.status === STATUS.IN_STOCK) items.push(entry.item);
    else excluded.push({ status: entry.status, item: entry.item });
  }

  items.sort((a, b) => (b.stock || 0) - (a.stock || 0) || String(a.assetId).localeCompare(String(b.assetId)));
  const inStockCopies = items.reduce((sum, item) => sum + (item.stock || 0), 0);
  const soldCopies = items.reduce((sum, item) => sum + Math.max(0, (item.totalStock || 0) - (item.stock || 0)), 0);
  const partial = totals.inStock + totals.soldOut + totals.nonLimited + totals.stockMismatch + totals.unknownStock + totals.unavailable < ids.length;

  return {
    source: 'roblox-public-catalog-api',
    trackedIds: ids.length,
    requiredTotalStock: TOTAL_STOCK_REQUIREMENT,
    status: totals.inStock + totals.soldOut + totals.nonLimited + totals.stockMismatch + totals.unknownStock + totals.unavailable === ids.length ? 'ok' : 'partial',
    complete: !partial,
    items,
    inStockCopies,
    soldCopies,
    totals,
    excludedCount: excluded.length,
    excluded: options.includeExcluded ? excluded : undefined,
    fetchedAt: options.fetchedAt || new Date().toISOString(),
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
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}

async function fetchAssetDetails(assetId, options = {}) {
  const doFetch = options.fetchImpl || ((...args) => globalThis.fetch(...args));
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const retries = options.retries ?? REQUEST_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await doFetch(`${ASSET_DETAILS_URL}/${encodeURIComponent(assetId)}/details`, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      if (response.status === 404) return null; // deleted or never existed — not an error
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      if (!response.ok) throw new Error(`Catalog API HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      return null; // network failure / timeout: excluded, never guessed
    }
  }
  return null;
}

async function getCachedDetails(assetId, options = {}) {
  const key = String(assetId);
  const now = Date.now();
  const cached = stockDetailsCache.get(key);
  if (cached && now - cached.fetchedAt < (options.cacheTtlMs ?? STOCK_CACHE_TTL_MS)) return cached.details;
  if (inflightDetails.has(key)) return inflightDetails.get(key);

  const task = (async () => {
    const details = await fetchAssetDetails(assetId, options);
    stockDetailsCache.set(key, { fetchedAt: Date.now(), details });
    return details;
  })();
  inflightDetails.set(key, task);
  try {
    return await task;
  } finally {
    inflightDetails.delete(key);
  }
}

// Full sweep of the supplied IDs. Concurrent lookups are capped so the public
// API is not hammered, and results are cached for STOCK_CACHE_TTL_MS.
async function scanInStockItems(options = {}) {
  const ids = (options.ids || SUPPLIED_ASSET_IDS).map(String);
  const fetchedAt = new Date().toISOString();

  const classified = await mapWithConcurrency(ids, options.concurrency ?? SCAN_CONCURRENCY, async (assetId) => {
    const details = await getCachedDetails(assetId, options);
    return classifyAsset(assetId, details);
  });

  const report = buildStockReport(classified, {
    ids,
    fetchedAt,
    includeExcluded: Boolean(options.includeExcluded),
  });
  lastScanAt = Date.now();
  lastReport = report;
  return report;
}

// Endpoint entry point: serves the cached report when it is fresh enough so a
// burst of dashboard refreshes never triggers a second 141-request sweep.
async function getInStockReport(options = {}) {
  const key = options.includeExcluded ? 'full' : 'summary';
  if (inflightScans.has(key)) return inflightScans.get(key);
  const fresh = lastReport && Date.now() - lastScanAt < (options.minIntervalMs ?? MIN_SCAN_INTERVAL_MS);
  if (fresh && !options.force) return { ...lastReport, cached: true };

  const task = scanInStockItems(options)
    .then((report) => ({ ...report, cached: false }))
    .finally(() => inflightScans.delete(key));
  inflightScans.set(key, task);
  return task;
}

// Keeps the dashboard warm after somebody has asked for it once.
function startStockWarmup(options = {}) {
  if (warmupTimer) return warmupTimer;
  const intervalMs = options.intervalMs ?? Number(process.env.UGC_POLL_MS || 300000);
  if (!intervalMs) return null;
  warmupTimer = setInterval(() => {
    getInStockReport({ force: true }).catch(() => {});
  }, intervalMs);
  warmupTimer.unref?.();
  return warmupTimer;
}

function stopStockWarmup() {
  if (warmupTimer) clearInterval(warmupTimer);
  warmupTimer = null;
}

function resetStockCache() {
  stockDetailsCache.clear();
  inflightDetails.clear();
  inflightScans.clear();
  lastScanAt = 0;
  lastReport = null;
  stopStockWarmup();
}

module.exports = {
  STATUS,
  EXCLUDED_STATUSES,
  TOTAL_STOCK_REQUIREMENT,
  STOCK_CACHE_TTL_MS,
  SCAN_CONCURRENCY,
  SUPPLIED_ASSET_IDS,
  suppliedCatalog,
  catalogUrl,
  readAsset,
  classifyAsset,
  buildStockReport,
  mapWithConcurrency,
  fetchAssetDetails,
  scanInStockItems,
  getInStockReport,
  startStockWarmup,
  stopStockWarmup,
  resetStockCache,
  stockDetailsCache,
};
