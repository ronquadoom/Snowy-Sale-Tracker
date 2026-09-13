const test = require('node:test');
const assert = require('node:assert/strict');

// The sales feed shares the worker pool that the in-stock tracker now owns, so
// the limited-only filter is re-verified here after that refactor.
const { getLiveSales, assetDetailsCache } = require('../server');
const fixtures = require('./fixtures/catalog-details');

const realFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = realFetch;
  assetDetailsCache.clear();
  delete process.env.ROBLOX_COOKIE;
});

test('getLiveSales keeps limited sales and drops normal ones', async () => {
  process.env.ROBLOX_COOKIE = 'test-session';
  const transactions = {
    data: [
      {
        id: 't1',
        created: new Date().toISOString(),
        isPending: false,
        agent: { id: 42, name: 'Buyer42' },
        details: { id: fixtures.brownHairFieryHorns.AssetId, name: 'Brown Hair', location: 'Website' },
        currency: { amount: 45 },
      },
      {
        id: 't2',
        created: new Date().toISOString(),
        isPending: false,
        agent: { id: 43, name: 'Buyer43' },
        details: { id: fixtures.nonLimitedRainbowHorns.AssetId, name: 'Animated Rainbow Horns', location: 'Website' },
        currency: { amount: 66 },
      },
    ],
  };

  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.includes('/transactions')) return { ok: true, status: 200, json: async () => transactions };
    const id = target.split('/v2/assets/')[1].split('/')[0];
    const payload = String(fixtures.brownHairFieryHorns.AssetId) === id
      ? fixtures.brownHairFieryHorns
      : fixtures.nonLimitedRainbowHorns;
    return { ok: true, status: 200, json: async () => payload };
  };

  const result = await getLiveSales();
  assert.equal(result.status, 'live');
  assert.equal(result.sales.length, 1);
  assert.equal(result.sales[0].assetId, String(fixtures.brownHairFieryHorns.AssetId));
  assert.equal(result.sales[0].revenue, 45);
  assert.deepEqual(result.scanStats, { transactions: 2, limited: 1, nonLimited: 1, unknown: 0, skipped: 0 });
});

test('getLiveSales stays empty without a cookie', async () => {
  delete process.env.ROBLOX_COOKIE;
  const result = await getLiveSales();
  assert.equal(result.status, 'live-required');
  assert.equal(result.configured, false);
  assert.deepEqual(result.sales, []);
});
