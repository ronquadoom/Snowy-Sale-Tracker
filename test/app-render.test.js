const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { classifyAsset, buildStockReport } = require('../stock-tracker');
const fixtures = require('./fixtures/catalog-details');

// Builds a real tracker payload (same code the server runs) so the front end
// is rendered from genuine tracker output, not hand-written JSON.
function realReport() {
  const classified = [
    classifyAsset(fixtures.brownHairFieryHorns.AssetId, fixtures.brownHairFieryHorns),
    classifyAsset(fixtures.silverStarCrown.AssetId, fixtures.silverStarCrown),
    classifyAsset(fixtures.soldOutClockworkShades.AssetId, fixtures.soldOutClockworkShades),
    classifyAsset(fixtures.nonLimitedRainbowHorns.AssetId, fixtures.nonLimitedRainbowHorns),
    classifyAsset(fixtures.smallRunLimited.AssetId, fixtures.smallRunLimited),
    classifyAsset('140555190593821', null),
  ];
  return buildStockReport(classified, { ids: ['a', 'b', 'c', 'd', 'e', 'f'], fetchedAt: new Date().toISOString() });
}

function makeElement() {
  const element = {
    // The real DOM stringifies on assignment; mirror that so the assertions
    // read what a browser would show.
    set textContent(value) { this._text = String(value); },
    get textContent() { return this._text; },
    set innerHTML(value) { this._html = String(value); },
    get innerHTML() { return this._html; },
    _text: '',
    _html: '',
    hidden: false,
    dataset: {},
    style: {},
    classList: {
      set: new Set(),
      add(...names) { names.forEach((name) => this.set.add(name)); },
      remove(...names) { names.forEach((name) => this.set.delete(name)); },
      toggle(name, on) {
        if (on === undefined) this.set.has(name) ? this.set.delete(name) : this.set.add(name);
        else if (on) this.set.add(name);
        else this.set.delete(name);
      },
      contains(name) { return this.set.has(name); },
    },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    hasAttribute() { return false; },
    removeAttribute() {},
    querySelector() { return makeElement(); },
    closest() { return null; },
    remove() {},
  };
  return element;
}

function loadApp({ inStock, fail = false }) {
  const elements = new Map();
  const byId = (selector) => {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  };
  const document = {
    querySelector: byId,
    querySelectorAll: (selector) => {
      if (selector === '[data-icon]') return [makeElement(), makeElement()];
      return [];
    },
    addEventListener() {},
  };

  const fetchImpl = async (url) => {
    if (fail) throw new Error('offline');
    const body = String(url).includes('/api/in-stock')
      ? inStock
      : { status: 'live-required', sales: [], message: '' };
    return { ok: true, status: 200, json: async () => body };
  };

  const sandbox = {
    document,
    window: { open() {} },
    fetch: fetchImpl,
    console,
    // Timers are neutralised: the test drives rendering, not the poll loop.
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => ({ unref() {} }),
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'app.js' });
  return { elements, byId };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('renders only in-stock limited 3,000-copy runs with real copy counts', async () => {
  const report = realReport();
  const { byId } = loadApp({ inStock: report });
  await flush();
  await flush();

  assert.equal(byId('#stockInStock').textContent, '2');
  assert.equal(byId('#stockCopies').textContent, (2952 + 2864).toLocaleString('en-US'));
  assert.equal(byId('#stockSoldOut').textContent, '1');
  assert.equal(byId('#stockNonLimited').textContent, '1');
  assert.equal(byId('#stockMismatch').textContent, '1');
  assert.equal(byId('#stockUnverified').textContent, '1');
  assert.equal(byId('#stockMismatchLabel').textContent, 'NOT 3,000 RUN');
  assert.equal(byId('#stockPillLabel').textContent, 'LIVE CATALOG');
  assert.equal(byId('#stockPill').classList.contains('loaded'), true);
  assert.equal(byId('#stockTracked').textContent, '6');
  assert.equal(byId('#stockTotalInStock').textContent, '2');

  const html = byId('#stockList').innerHTML;
  assert.ok(html.includes('<b>2,952</b> / 3,000 left'), 'shows remaining copies against the 3,000 run');
  assert.ok(html.includes('LIMITED UNIQUE'));
  assert.ok(html.includes('[⏳CHEAP] Brown Hair + Fiery Horns Crown Clockwork'));
  assert.ok(html.includes('Silver Star Crown'));
  assert.ok(html.includes('https://www.roblox.com/catalog/110236444124364'));
  assert.ok(!html.includes('Clockwork Shades'), 'sold-out runs are never rendered');
  assert.ok(!html.includes('Animated Rainbow Horns'), 'non-limited items are never rendered');
  assert.ok(!html.includes('Smaller Test Run Crown'), 'non-3,000 runs are never rendered');
  assert.equal(byId('#stockList').hidden, false);
  assert.equal(byId('#stockEmpty').hidden, true);
  assert.equal(byId('#stockShowing').textContent, '2');
  assert.ok(byId('#stockNote').textContent.includes('excluded: 1 sold out'));
  assert.ok(byId('#stockNote').textContent.includes('6 of 6 IDs verified'));
});

test('falls back to the supplied label and flags a closed primary sale', async () => {
  const report = buildStockReport(
    [classifyAsset(fixtures.soldOutDashie.AssetId, { ...fixtures.soldOutDashie, Remaining: 42 })],
    { ids: ['x'], fetchedAt: new Date().toISOString() },
  );
  const { byId } = loadApp({ inStock: report });
  await flush();
  await flush();

  const html = byId('#stockList').innerHTML;
  assert.ok(html.includes('unnamed'), 'the supplied label stands in for a "-" name');
  assert.ok(html.includes('PRIMARY SALE OFF'), 'a closed primary sale is flagged, not hidden');
  assert.ok(html.includes('<b>42</b> / 3,000 left'));
});

test('shows an honest empty state when nothing qualifies', async () => {
  const report = buildStockReport(
    [
      classifyAsset(fixtures.soldOutDashie.AssetId, fixtures.soldOutDashie),
      classifyAsset(fixtures.nonLimitedRainbowHorns.AssetId, fixtures.nonLimitedRainbowHorns),
    ],
    { ids: ['x', 'y'], fetchedAt: new Date().toISOString() },
  );
  const { byId } = loadApp({ inStock: report });
  await flush();
  await flush();

  assert.equal(byId('#stockList').innerHTML, '');
  assert.equal(byId('#stockEmpty').hidden, false);
  assert.equal(byId('#stockEmptyTitle').textContent, 'NOTHING IN STOCK');
  assert.equal(byId('#stockInStock').textContent, '0');
  assert.equal(byId('#stockCopies').textContent, '0');
  assert.equal(byId('#stockPillLabel').textContent, 'LIVE CATALOG');
});

test('reports an API error instead of inventing stock', async () => {
  const { byId } = loadApp({ inStock: null, fail: true });
  await flush();
  await flush();

  assert.equal(byId('#stockPillLabel').textContent, 'API ERROR');
  assert.equal(byId('#stockPill').classList.contains('error'), true);
  assert.equal(byId('#stockEmptyTitle').textContent, 'CATALOG API UNREACHABLE');
  assert.equal(byId('#stockList').innerHTML, '');
});

test('marks an unfinished sweep partial rather than reporting a full total', async () => {
  const report = { ...realReport(), complete: false };
  const { byId } = loadApp({ inStock: report });
  await flush();
  await flush();

  assert.equal(byId('#stockPillLabel').textContent, 'PARTIAL SCAN');
  assert.equal(byId('#stockPill').classList.contains('partial'), true);
  assert.ok(byId('#stockNote').textContent.includes('scan still running'));
});
