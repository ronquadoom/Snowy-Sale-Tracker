const test = require('node:test');
const assert = require('node:assert/strict');

const { server } = require('../server');
const { resetStockCache, SUPPLIED_ASSET_IDS } = require('../stock-tracker');
const fixtures = require('./fixtures/catalog-details');

const realFetch = globalThis.fetch;

// Two IDs answer "in stock", two answer "sold out", two answer "not limited",
// and every remaining supplied ID answers "sold out" so the sweep still covers
// all 141 links.
const IN_STOCK_IDS = [String(fixtures.brownHairFieryHorns.AssetId), String(fixtures.silverStarCrown.AssetId)];
const SOLD_OUT_IDS = [String(fixtures.soldOutDashie.AssetId), String(fixtures.soldOutClockworkShades.AssetId)];
const NON_LIMITED_IDS = [String(fixtures.nonLimitedRainbowHorns.AssetId), String(fixtures.nonLimitedTornadoHat.AssetId)];

function stubFetch() {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const id = String(url).split('/v2/assets/')[1].split('/')[0];
    const payload = IN_STOCK_IDS.includes(id)
      ? fixtures[IN_STOCK_IDS.indexOf(id) === 0 ? 'brownHairFieryHorns' : 'silverStarCrown']
      : NON_LIMITED_IDS.includes(id)
        ? fixtures.nonLimitedRainbowHorns
        : fixtures.soldOutClockworkShades;
    return { ok: true, status: 200, json: async () => ({ ...payload, AssetId: Number(id), TargetId: Number(id) }) };
  };
  return calls;
}

function listen() {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

test.afterEach(() => {
  globalThis.fetch = realFetch;
  resetStockCache();
});

test('GET /api/in-stock returns only in-stock limited 3,000-copy runs over the supplied IDs', async () => {
  const calls = stubFetch();
  delete process.env.ROBLOX_COOKIE; // the tracker must work without a session
  const port = await listen();
  try {
    const response = await realFetch(`http://127.0.0.1:${port}/api/in-stock`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.trackedIds, SUPPLIED_ASSET_IDS.length);
    assert.equal(payload.trackedIds, 141);
    assert.equal(payload.requiredTotalStock, 3000);
    assert.equal(payload.complete, true);
    assert.deepEqual(payload.items.map((item) => item.assetId), IN_STOCK_IDS);
    assert.equal(payload.inStockCopies, 2952 + 2864);
    assert.equal(payload.totals.inStock, 2);
    assert.equal(payload.totals.nonLimited, NON_LIMITED_IDS.length);
    assert.equal(
      payload.totals.inStock + payload.totals.soldOut + payload.totals.nonLimited + payload.totals.stockMismatch + payload.totals.unknownStock + payload.totals.unavailable,
      141,
      'every supplied ID is accounted for',
    );

    assert.equal(calls.length, 141, 'one public catalog lookup per supplied ID');
    assert.ok(calls.every((url) => url.startsWith('https://economy.roblox.com/v2/assets/')));

    const health = await (await realFetch(`http://127.0.0.1:${port}/api/health`)).json();
    assert.equal(health.liveSalesConfigured, false);
    assert.deepEqual(health.stockTracker, { trackedIds: 141, requiredTotalStock: 3000, configured: true });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/in-stock?refresh=1 forces a new sweep', async () => {
  stubFetch();
  const port = await listen();
  try {
    const first = await (await realFetch(`http://127.0.0.1:${port}/api/in-stock`)).json();
    assert.equal(first.cached, false);
    const repeated = await (await realFetch(`http://127.0.0.1:${port}/api/in-stock`)).json();
    assert.equal(repeated.cached, true);
    const forced = await (await realFetch(`http://127.0.0.1:${port}/api/in-stock?refresh=1`)).json();
    assert.equal(forced.cached, false);
    assert.equal(forced.inStockCopies, first.inStockCopies);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
