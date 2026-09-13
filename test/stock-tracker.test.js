const test = require('node:test');
const assert = require('node:assert/strict');

const tracker = require('../stock-tracker');
const fixtures = require('./fixtures/catalog-details');

const {
  STATUS,
  SUPPLIED_ASSET_IDS,
  TOTAL_STOCK_REQUIREMENT,
  classifyAsset,
  buildStockReport,
  fetchAssetDetails,
  scanInStockItems,
  getInStockReport,
  resetStockCache,
  mapWithConcurrency,
} = tracker;

// --- helpers ---------------------------------------------------------------

function okResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

// Maps assetId -> payload | 'missing' | 'error' | a Response stub.
function makeFetch(map, extra = {}) {
  const calls = new Map();
  const impl = async (url) => {
    const id = String(url).split('/v2/assets/')[1].split('/')[0];
    calls.set(id, (calls.get(id) || 0) + 1);
    const entry = map[id];
    if (entry instanceof Function) return entry(id, calls.get(id));
    if (entry === 'missing') return { ok: false, status: 404, json: async () => ({}) };
    if (entry === 'error') throw new Error('network down');
    if (entry === undefined) return extra.default === undefined ? { ok: false, status: 404, json: async () => ({}) } : okResponse(extra.default);
    return okResponse(entry);
  };
  return { impl, calls, callCount: () => [...calls.values()].reduce((sum, n) => sum + n, 0) };
}

test.beforeEach(() => resetStockCache());
test.afterEach(() => resetStockCache());

// --- the supplied list -----------------------------------------------------

test('tracks exactly the 141 supplied IDs', () => {
  assert.equal(SUPPLIED_ASSET_IDS.length, 141);
  assert.equal(new Set(SUPPLIED_ASSET_IDS).size, 141, 'supplied IDs must be unique');
  for (const id of SUPPLIED_ASSET_IDS) assert.match(id, /^\d{10,}$/);
  assert.equal(TOTAL_STOCK_REQUIREMENT, 3000);
});

// --- classification --------------------------------------------------------

test('keeps a limited 3,000-copy run that still has stock', () => {
  const result = classifyAsset(fixtures.brownHairFieryHorns.AssetId, fixtures.brownHairFieryHorns);
  assert.equal(result.status, STATUS.IN_STOCK);
  assert.equal(result.item.stock, 2952);
  assert.equal(result.item.totalStock, 3000);
  assert.equal(result.item.limitedType, 'Limited Unique');
  assert.equal(result.item.priceInRobux, 65);
  assert.equal(result.item.url, 'https://www.roblox.com/catalog/110236444124364');
  assert.equal(result.item.displayName, '[⏳CHEAP] Brown Hair + Fiery Horns Crown Clockwork');
});

test('falls back to the supplied label when Roblox has no usable name', () => {
  const result = classifyAsset(fixtures.soldOutDashie.AssetId, fixtures.soldOutDashie);
  assert.equal(result.item.name, '-');
  assert.equal(result.item.suppliedLabel, 'unnamed');
  assert.equal(result.item.displayName, 'unnamed');
});

test('excludes sold-out limited runs', () => {
  for (const fixture of [fixtures.soldOutDashie, fixtures.soldOutClockworkShades]) {
    const result = classifyAsset(fixture.AssetId, fixture);
    assert.equal(result.status, STATUS.SOLD_OUT);
    assert.equal(result.item.stock, 0);
    assert.equal(result.item.totalStock, 3000);
  }
});

test('excludes non-limited items', () => {
  for (const fixture of [fixtures.nonLimitedRainbowHorns, fixtures.nonLimitedTornadoHat]) {
    const result = classifyAsset(fixture.AssetId, fixture);
    assert.equal(result.status, STATUS.NON_LIMITED);
    assert.equal(result.item.limitedType, null);
  }
});

test('excludes limited runs that are not 3,000 copies', () => {
  const result = classifyAsset(fixtures.smallRunLimited.AssetId, fixtures.smallRunLimited);
  assert.equal(result.status, STATUS.STOCK_MISMATCH);
  assert.equal(result.item.totalStock, 2500);
});

test('excludes items whose total stock Roblox does not report', () => {
  const result = classifyAsset(fixtures.classicLimited.AssetId, fixtures.classicLimited);
  assert.equal(result.status, STATUS.UNKNOWN_STOCK);
  assert.equal(result.item.limitedType, 'Limited');
  assert.equal(result.item.totalStock, null, 'a missing print run is never guessed');
  assert.equal(result.item.priceInRobux, null, 'a null price must not read as R$0');
});

test('excludes items whose remaining stock Roblox does not report', () => {
  const noRemaining = { ...fixtures.silverStarCrown, Remaining: null };
  const result = classifyAsset(noRemaining.AssetId, noRemaining);
  assert.equal(result.status, STATUS.UNKNOWN_STOCK);
  assert.equal(result.item.stock, null);
});

test('excludes deleted or unreachable items', () => {
  assert.equal(classifyAsset('123', null).status, STATUS.UNAVAILABLE);
  assert.equal(classifyAsset('123', {}).status, STATUS.UNAVAILABLE);
});

// --- report aggregation ----------------------------------------------------

test('reports totals, copy counts, and stock-descending order', () => {
  const classified = [
    classifyAsset(fixtures.soldOutDashie.AssetId, fixtures.soldOutDashie),
    classifyAsset(fixtures.silverStarCrown.AssetId, fixtures.silverStarCrown),
    classifyAsset(fixtures.nonLimitedRainbowHorns.AssetId, fixtures.nonLimitedRainbowHorns),
    classifyAsset(fixtures.brownHairFieryHorns.AssetId, fixtures.brownHairFieryHorns),
    classifyAsset('999999', null),
  ];
  const report = buildStockReport(classified, { ids: classified.map((entry) => entry.item.assetId) });

  assert.equal(report.status, 'ok');
  assert.equal(report.complete, true);
  assert.equal(report.requiredTotalStock, 3000);
  assert.deepEqual(report.items.map((item) => item.stock), [2952, 2864], 'most stock first');
  assert.equal(report.inStockCopies, 2952 + 2864);
  assert.equal(report.soldCopies, (3000 - 2952) + (3000 - 2864));
  assert.deepEqual(report.totals, {
    inStock: 2,
    soldOut: 1,
    nonLimited: 1,
    stockMismatch: 0,
    unknownStock: 0,
    unavailable: 1,
  });
  assert.equal(report.excludedCount, 3);
  assert.equal(report.excluded, undefined, 'excluded detail is opt-in');
});

test('marks an unfinished sweep partial instead of reporting a false total', () => {
  const classified = [classifyAsset(fixtures.silverStarCrown.AssetId, fixtures.silverStarCrown)];
  const report = buildStockReport(classified, { ids: ['a', 'b', 'c'] });
  assert.equal(report.trackedIds, 3);
  assert.equal(report.complete, false);
  assert.equal(report.status, 'partial');
});

// --- fetching --------------------------------------------------------------

test('fetch treats a 404 as "not found" and a network failure as unavailable', async () => {
  const missing = makeFetch({ '1': 'missing' });
  assert.equal(await fetchAssetDetails('1', { fetchImpl: missing.impl, retryDelayMs: 1 }), null);
  assert.equal(missing.callCount(), 1, 'a 404 is not retried');

  const broken = makeFetch({ '2': 'error' });
  assert.equal(await fetchAssetDetails('2', { fetchImpl: broken.impl, retryDelayMs: 1 }), null);
  assert.equal(broken.callCount(), 2, 'a network failure is retried once');
});

test('fetch retries a rate limit and then returns the payload', async () => {
  const flaky = makeFetch({
    '3': () => (flaky.calls.get('3') === 1 ? { ok: false, status: 429, json: async () => ({}) } : okResponse(fixtures.silverStarCrown)),
  });
  const details = await fetchAssetDetails('3', { fetchImpl: flaky.impl, retryDelayMs: 1 });
  assert.equal(details.AssetId, fixtures.silverStarCrown.AssetId);
  assert.equal(flaky.callCount(), 2);
});

// --- full sweep ------------------------------------------------------------

test('sweeps a list of IDs and returns only in-stock limited 3,000-copy runs', async () => {
  const ids = [
    String(fixtures.brownHairFieryHorns.AssetId),
    String(fixtures.silverStarCrown.AssetId),
    String(fixtures.soldOutDashie.AssetId),
    String(fixtures.soldOutClockworkShades.AssetId),
    String(fixtures.nonLimitedRainbowHorns.AssetId),
    String(fixtures.nonLimitedTornadoHat.AssetId),
    String(fixtures.smallRunLimited.AssetId),
    String(fixtures.classicLimited.AssetId),
    '140555190593821', // answered with the default 404 below
  ];
  const fake = makeFetch({
    [ids[0]]: fixtures.brownHairFieryHorns,
    [ids[1]]: fixtures.silverStarCrown,
    [ids[2]]: fixtures.soldOutDashie,
    [ids[3]]: fixtures.soldOutClockworkShades,
    [ids[4]]: fixtures.nonLimitedRainbowHorns,
    [ids[5]]: fixtures.nonLimitedTornadoHat,
    [ids[6]]: fixtures.smallRunLimited,
    [ids[7]]: fixtures.classicLimited,
    [ids[8]]: 'missing',
  });

  const report = await scanInStockItems({ ids, fetchImpl: fake.impl, concurrency: 4, cacheTtlMs: 1000 });

  assert.equal(report.trackedIds, 9);
  assert.equal(report.complete, true);
  assert.deepEqual(report.items.map((item) => item.assetId), [ids[0], ids[1]]);
  assert.equal(report.inStockCopies, 2952 + 2864);
  assert.deepEqual(report.totals, { inStock: 2, soldOut: 2, nonLimited: 2, stockMismatch: 1, unknownStock: 1, unavailable: 1 });
  for (const item of report.items) {
    assert.equal(item.totalStock, 3000);
    assert.ok(item.stock > 0);
    assert.ok(item.limitedType);
  }

  // Second sweep inside the cache TTL must not re-hit the catalog API.
  const callsAfterFirst = fake.callCount();
  const cached = await scanInStockItems({ ids, fetchImpl: fake.impl, cacheTtlMs: 1000 });
  assert.equal(fake.callCount(), callsAfterFirst);
  assert.equal(cached.inStockCopies, report.inStockCopies);
});

test('reuses an in-flight report and rescans only when forced', async () => {
  const ids = [String(fixtures.silverStarCrown.AssetId), String(fixtures.soldOutDashie.AssetId)];
  const fake = makeFetch({ [ids[0]]: fixtures.silverStarCrown, [ids[1]]: fixtures.soldOutDashie });

  const first = await getInStockReport({ ids, fetchImpl: fake.impl, cacheTtlMs: 0 });
  assert.equal(first.cached, false);
  assert.equal(first.totals.inStock, 1);

  const second = await getInStockReport({ ids, fetchImpl: fake.impl, cacheTtlMs: 0 });
  assert.equal(second.cached, true, 'a burst of refreshes must not re-sweep');

  const third = await getInStockReport({ ids, fetchImpl: fake.impl, cacheTtlMs: 0, force: true });
  assert.equal(third.cached, false);
  assert.equal(fake.callCount(), 4, 'two IDs fetched twice: once per sweep');
});

test('includes excluded detail only when asked', async () => {
  const ids = [String(fixtures.soldOutDashie.AssetId), String(fixtures.nonLimitedRainbowHorns.AssetId)];
  const fake = makeFetch({ [ids[0]]: fixtures.soldOutDashie, [ids[1]]: fixtures.nonLimitedRainbowHorns });
  const report = await scanInStockItems({ ids, fetchImpl: fake.impl, includeExcluded: true, cacheTtlMs: 0 });
  assert.deepEqual(report.excluded.map((entry) => entry.status), [STATUS.SOLD_OUT, STATUS.NON_LIMITED]);
});

test('worker pool runs everything exactly once and keeps order', async () => {
  const seen = [];
  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 3, async (value) => {
    seen.push(value);
    return value * 2;
  });
  assert.deepEqual(results, [2, 4, 6, 8, 10]);
  assert.deepEqual(seen.slice().sort(), [1, 2, 3, 4, 5]);
});
