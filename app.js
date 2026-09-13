const iconPaths = {
  radio: '<path d="M5 8.5a10 10 0 0 1 14 0M8 11.5a6 6 0 0 1 8 0M12 15h.01"/><circle cx="12" cy="15" r="1"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  'bar-chart': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  'trending-up': '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11M3 5v6h6M4 13a8.1 8.1 0 0 0 14.8 3L21 13m0 6v-6h-6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'search-x': '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || ''}</svg>`;
}

document.querySelectorAll('[data-icon]').forEach((node) => {
  node.innerHTML = iconSvg(node.dataset.icon);
});

const palette = [
  ['#8c78ff', 'rgba(104,83,255,.30)', '✦'],
  ['#a579ff', 'rgba(149,82,255,.26)', '✧'],
  ['#ce79ff', 'rgba(196,73,255,.23)', '♛'],
  ['#54c7ff', 'rgba(49,167,255,.25)', '◈'],
  ['#4ed5ec', 'rgba(35,200,222,.25)', '◉'],
  ['#e878c8', 'rgba(230,71,191,.25)', '◒'],
  ['#6e9cff', 'rgba(68,116,255,.24)', '◇'],
  ['#f08bdd', 'rgba(230,83,200,.24)', '✺'],
  ['#8ba6ff', 'rgba(79,116,255,.26)', '✦'],
  ['#9da6b8', 'rgba(117,143,190,.22)', '✶'],
];

function titleFromSlug(slug, index) {
  const title = slug.replace(/-/g, ' ');
  return title.toLowerCase() === 'unnamed' ? `Unnamed UGC item ${index + 1}` : title;
}

function itemFromLink(entry, index) {
  const [assetId, slug] = entry.split('|');
  const name = titleFromSlug(slug, index);
  const lower = name.toLowerCase();
  const [color, glow, glyph] = palette[index % palette.length];
  const isFace = /shades|face|emote|troll/i.test(lower);
  const isLimited = /limited|limitted/i.test(lower);
  return {
    id: `${assetId}-${index}`,
    name,
    assetId,
    slug,
    url: `https://www.roblox.com/catalog/${assetId}/${slug}`,
    type: 'ASSET',
    category: isFace ? 'face' : 'head',
    limited: isLimited,
    cheap: /cheap/i.test(lower),
    sparkle: /sparkle/i.test(lower),
    skybox: /skybox/i.test(lower),
    color,
    glow,
    glyph,
  };
}

const catalogItems = assetLinks.map(itemFromLink);
const catalogById = new Map(catalogItems.map((item) => [String(item.assetId), item]));
const catalogNonLimitedCount = catalogItems.filter((item) => !item.limited).length;

const state = { filter: 'nonlimited', query: '', showAll: false };
let verifiedSales = loadSavedSales();
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadSavedSales() {
  try {
    const saved = JSON.parse(localStorage.getItem('snowysz-verified-sales'));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveSales() {
  try {
    localStorage.setItem('snowysz-verified-sales', JSON.stringify(verifiedSales));
  } catch (error) {
    // The feed still works for the current session if storage is unavailable.
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatRobux(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'R$—';
  return `R$${Number(value).toLocaleString('en-US')}`;
}

function parseRobux(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '');
  const number = Number(cleaned.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function normalizeHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') { field += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === ',' && !quoted) { row.push(field); field = ''; continue; }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += character;
  }
  if (field.length || row.length) { row.push(field); if (row.some((cell) => cell.trim() !== '')) rows.push(row); }
  return rows;
}

function headerIndex(headers, names) {
  return headers.findIndex((header) => names.includes(normalizeHeader(header)));
}

function parseSalesCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV has no sale rows.');
  const headers = rows[0];
  const columns = {
    buyer: headerIndex(headers, ['buyeruserid', 'buyerid', 'buyer']),
    date: headerIndex(headers, ['saledatetime', 'saledate', 'date']),
    location: headerIndex(headers, ['salelocation', 'location']),
    universe: headerIndex(headers, ['universe']),
    assetId: headerIndex(headers, ['assetid', 'itemid']),
    assetName: headerIndex(headers, ['assetname', 'itemname', 'name']),
    assetType: headerIndex(headers, ['assettype', 'itemtype', 'type']),
    holdStatus: headerIndex(headers, ['holdstatus', 'status']),
    revenue: headerIndex(headers, ['revenue']),
    price: headerIndex(headers, ['price']),
  };
  if (columns.assetId < 0 && columns.assetName < 0) throw new Error('Asset ID or Asset Name column was not found.');
  const get = (cells, index) => index >= 0 ? String(cells[index] || '').trim() : '';
  return rows.slice(1).map((cells, index) => {
    const assetId = get(cells, columns.assetId);
    const assetName = get(cells, columns.assetName) || catalogById.get(assetId)?.name || `Unknown item ${index + 1}`;
    const catalogItem = catalogById.get(assetId);
    return {
      id: `${assetId || assetName}-${index}-${Date.now()}`,
      buyer: get(cells, columns.buyer),
      date: get(cells, columns.date),
      location: get(cells, columns.location) || 'Roblox',
      universe: get(cells, columns.universe),
      assetId,
      assetName,
      assetType: get(cells, columns.assetType) || catalogItem?.type || 'ASSET',
      holdStatus: get(cells, columns.holdStatus),
      revenue: parseRobux(get(cells, columns.revenue)),
      price: parseRobux(get(cells, columns.price)),
    };
  }).filter((record) => record.assetId || record.assetName);
}

function itemMeta(record) {
  const known = catalogById.get(String(record.assetId));
  if (known) return known;
  const lower = String(record.assetName || '').toLowerCase();
  const [color, glow, glyph] = palette[Math.abs(String(record.assetId || record.assetName).length) % palette.length];
  return {
    id: record.assetId || record.assetName,
    assetId: record.assetId,
    name: record.assetName,
    url: record.assetId ? `https://www.roblox.com/catalog/${record.assetId}` : 'https://www.roblox.com/catalog',
    category: /shades|face|emote|troll/i.test(lower) ? 'face' : 'head',
    limited: /limited|limitted/i.test(lower),
    cheap: /cheap/i.test(lower),
    sparkle: /sparkle/i.test(lower),
    skybox: /skybox/i.test(lower),
    color,
    glow,
    glyph,
  };
}

function isNonLimited(record) {
  return !itemMeta(record).limited;
}

function isInFilter(record) {
  const item = itemMeta(record);
  const query = state.query.toLowerCase();
  const queryMatch = !query || `${record.assetName} ${record.assetId} ${record.buyer} ${record.location}`.toLowerCase().includes(query);
  if (!queryMatch) return false;
  if (state.filter === 'nonlimited') return !item.limited;
  if (state.filter === 'limited') return item.limited;
  if (state.filter === 'cheap') return item.cheap;
  if (state.filter === 'head') return item.category === 'head';
  if (state.filter === 'face') return item.category === 'face';
  if (state.filter === 'sparkle') return item.sparkle;
  if (state.filter === 'skybox') return item.skybox;
  return true;
}

function showToast(message) {
  const toast = $('#toast');
  $('#toastMessage').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function relativeTime(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function fallbackThumb(item, small = false) {
  return `<span class="${small ? '' : 'thumb-'}fallback" style="--thumb-color:${item.color};">${item.glyph}</span>`;
}

function thumbMarkup(item, small = false) {
  if (!item.assetId) return fallbackThumb(item, small);
  return `${fallbackThumb(item, small)}<img data-thumb-id="${escapeHtml(item.assetId)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.remove()" />`;
}

function saleMarkup(record, index) {
  const item = itemMeta(record);
  const amount = record.revenue ?? record.price;
  const buyer = record.buyer ? `Buyer ${record.buyer}` : 'Buyer ID unavailable';
  const url = item.url || `https://www.roblox.com/catalog/${record.assetId}`;
  return `<article class="sale-row ${index === 0 ? 'hot' : ''}" style="animation-delay:${index * 18}ms" data-item-url="${escapeHtml(url)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(record.assetName)} on Roblox">
    <div class="sale-thumb" style="--thumb-color:${item.color};--thumb-glow:${item.glow}">${thumbMarkup(item)}</div>
    <div class="sale-main">
      <div class="sale-title-line"><strong>${escapeHtml(record.assetName)}</strong><span class="asset-tag">${escapeHtml(record.assetType || 'ASSET')}</span><span class="market-tag ${item.limited ? 'limited-tag' : 'nonlimited-tag'}">${item.limited ? 'LIMITED' : 'NON-LIMITED'}</span></div>
      <div class="sale-meta"><span class="source">${escapeHtml(record.location || 'Roblox')}</span><span class="arrow">→</span><span class="buyer">${escapeHtml(buyer)}</span></div>
    </div>
    <div class="sale-value">${formatRobux(amount)}<small>${relativeTime(record.date)}</small></div>
  </article>`;
}

function getFilterCounts() {
  const count = (test) => verifiedSales.filter(test).length;
  return {
    all: verifiedSales.length,
    nonlimited: count((record) => isNonLimited(record)),
    limited: count((record) => !isNonLimited(record)),
    cheap: count((record) => itemMeta(record).cheap),
    head: count((record) => itemMeta(record).category === 'head'),
    face: count((record) => itemMeta(record).category === 'face'),
    sparkle: count((record) => itemMeta(record).sparkle),
    skybox: count((record) => itemMeta(record).skybox),
  };
}

function updateCounts() {
  const counts = getFilterCounts();
  $('#salesCount').textContent = catalogNonLimitedCount;
  $('#totalEntries').textContent = verifiedSales.length;
  $('#verifiedSalesCount').textContent = counts.nonlimited;
  $$('.feed-filter').forEach((button) => {
    const count = button.querySelector('b');
    if (count) count.textContent = counts[button.dataset.filter] ?? 0;
  });
  updateVerifiedStats();
}

function updateVerifiedStats() {
  const nonLimited = verifiedSales.filter((record) => isNonLimited(record));
  const revenueValues = nonLimited.map((record) => record.revenue).filter((value) => Number.isFinite(value));
  const revenue = revenueValues.reduce((sum, value) => sum + value, 0);
  $('#realRevenue').textContent = revenueValues.length ? formatRobux(revenue) : 'R$—';
  const dates = nonLimited.map((record) => Date.parse(record.date)).filter(Number.isFinite);
  const latest = dates.length ? Math.max(...dates) : null;
  $('#lastSale').textContent = latest ? relativeTime(new Date(latest).toISOString()) : '—';
  const oneHourAgo = Date.now() - 3600000;
  const recent = nonLimited.filter((record) => Date.parse(record.date) >= oneHourAgo);
  const recentRevenue = recent.map((record) => record.revenue).filter((value) => Number.isFinite(value));
  $('#paceRate').innerHTML = recent.length ? `${recent.length}<small>/hr</small>` : '—';
  $('#averageOrder').textContent = recentRevenue.length ? formatRobux(recentRevenue.reduce((sum, value) => sum + value, 0) / recentRevenue.length) : 'R$—';
  $('#entryCount').textContent = state.filter === 'all' && !state.query ? verifiedSales.length : verifiedSales.filter(isInFilter).length;
}

function renderFeed() {
  const filtered = verifiedSales.filter(isInFilter);
  const visible = state.showAll ? filtered : filtered.slice(0, 9);
  const hasSales = verifiedSales.length > 0;
  $('#saleList').innerHTML = visible.map(saleMarkup).join('');
  $('#saleList').hidden = visible.length === 0;
  $('#noResults').hidden = visible.length !== 0;
  $('#showingCount').textContent = visible.length;
  $('#filteredTotal').textContent = filtered.length;
  $('#loadMoreButton').hidden = filtered.length <= 9;
  $('#loadMoreButton').innerHTML = state.showAll ? `SHOW LESS ${iconSvg('chevron-down')}` : `LOAD MORE ${iconSvg('chevron-down')}`;
  const feedLabels = { all: 'ALL VERIFIED SALES', nonlimited: 'NON-LIMITED SALES', limited: 'LIMITED SALES', cheap: 'CHEAP ITEM SALES', head: 'HEAD ACCESSORY SALES', face: 'FACE / EMOTE SALES', sparkle: 'SPARKLE SERIES SALES', skybox: 'SKYBOX ITEM SALES' };
  $('#feedEyebrow').textContent = `SNOWY'SZ / ${feedLabels[state.filter] || 'VERIFIED SALES'}`;
  if (hasSales && visible.length === 0) {
    $('#noResultsTitle').textContent = 'No matching verified sales';
    $('#noResultsText').textContent = 'Try a different filter or search term.';
  } else {
    $('#noResultsTitle').textContent = 'No verified sales loaded';
    $('#noResultsText').textContent = 'Export Sales of Goods from Roblox Revenue › Sales, then import the CSV here.';
  }
  attachCatalogLinks('.sale-row');
  loadThumbnails();
  updateVerifiedStats();
}

function renderTopItems() {
  const grouped = new Map();
  verifiedSales.filter(isNonLimited).forEach((record) => {
    const key = String(record.assetId || record.assetName);
    const existing = grouped.get(key) || { item: itemMeta(record), name: record.assetName, count: 0, revenue: 0 };
    existing.count += 1;
    if (Number.isFinite(record.revenue)) existing.revenue += record.revenue;
    grouped.set(key, existing);
  });
  const top = [...grouped.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 6);
  if (!top.length) {
    $('#topItems').innerHTML = '<div class="rail-empty">No verified non-limited sales yet</div>';
    return;
  }
  $('#topItems').innerHTML = top.map((entry, index) => `<div class="top-item" data-item-url="${escapeHtml(entry.item.url)}" tabindex="0" role="link">
    <span class="top-rank">${index + 1}</span><div class="top-thumb" style="--thumb-color:${entry.item.color}">${thumbMarkup(entry.item, true)}</div>
    <div class="top-item-copy"><strong>${escapeHtml(entry.name)}</strong><span>NON-LIMITED · ${entry.count} VERIFIED</span></div><div class="top-item-value">${formatRobux(entry.revenue)}<small>${entry.count} sold</small></div>
  </div>`).join('');
  attachCatalogLinks('.top-item');
  loadThumbnails();
}

function renderPace() {
  const recent = verifiedSales.filter((record) => isNonLimited(record) && Number.isFinite(Date.parse(record.date)) && Date.now() - Date.parse(record.date) <= 600000);
  const graph = $('#paceGraph');
  if (!recent.length) {
    graph.className = 'pace-graph is-empty';
    graph.innerHTML = '<span class="graph-empty">Import verified sales to plot pace</span>';
    return;
  }
  const buckets = Array(10).fill(0);
  recent.forEach((record) => {
    const age = Math.floor((Date.now() - Date.parse(record.date)) / 60000);
    buckets[Math.min(9, Math.max(0, age))] += 1;
  });
  const max = Math.max(...buckets, 1);
  graph.className = 'pace-graph';
  graph.innerHTML = `<div class="pace-bars">${buckets.reverse().map((value) => `<i class="pace-bar" style="height:${value ? Math.max(12, value / max * 100) : 3}%" title="${value} verified sale${value === 1 ? '' : 's'}"></i>`).join('')}</div>`;
}

function renderRevenue() {
  const nonLimited = verifiedSales.filter(isNonLimited);
  const revenueValues = nonLimited.map((record) => record.revenue).filter((value) => Number.isFinite(value));
  const total = revenueValues.reduce((sum, value) => sum + value, 0);
  if (!nonLimited.length) {
    $('#revenueList').innerHTML = '<div class="rail-empty">No verified revenue loaded</div>';
    return;
  }
  $('#revenueList').innerHTML = `<div class="revenue-row"><span class="revenue-name"><i class="revenue-dot cyan"></i> Non-limited sales</span><strong>${revenueValues.length ? formatRobux(total) : 'R$—'}<small>${nonLimited.length} verified</small></strong></div>`;
}

function renderAll() {
  updateCounts();
  renderFeed();
  renderTopItems();
  renderPace();
  renderRevenue();
  const hasData = verifiedSales.length > 0;
  const connection = $('#connectionToggle');
  connection.classList.toggle('waiting', !hasData);
  connection.classList.toggle('loaded', hasData);
  connection.setAttribute('aria-pressed', String(hasData));
  $('#connectionLabel').textContent = hasData ? 'CSV LOADED' : 'CSV REQUIRED';
  connection.querySelector('[data-icon]').innerHTML = iconSvg(hasData ? 'check' : 'upload');
  document.querySelector('.status-dot').style.background = hasData ? 'var(--green)' : 'var(--muted-2)';
}

function openImporter() {
  $('#salesFileInput').click();
}

async function handleFile(file) {
  if (!file) return;
  try {
    const records = parseSalesCsv(await file.text());
    if (!records.length) throw new Error('No sale rows were found in that file.');
    verifiedSales = records;
    saveSales();
    state.filter = 'nonlimited';
    state.query = '';
    state.showAll = false;
    $('#searchInput').value = '';
    $$('.feed-filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'nonlimited'));
    renderAll();
    showToast(`Loaded ${records.length} verified sale${records.length === 1 ? '' : 's'} from Roblox`);
  } catch (error) {
    showToast(error.message || 'Could not read that CSV');
  }
}

$$('.feed-filter').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    state.showAll = false;
    $$('.feed-filter').forEach((item) => item.classList.toggle('active', item === button));
    renderFeed();
  });
});

$('#searchInput').addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  state.showAll = false;
  renderFeed();
});

$('#loadMoreButton').addEventListener('click', () => {
  state.showAll = !state.showAll;
  renderFeed();
});

$('#importButton').addEventListener('click', openImporter);
$('#emptyImportButton').addEventListener('click', openImporter);
$('#salesFileInput').addEventListener('change', (event) => handleFile(event.target.files[0]));
$('#connectionToggle').addEventListener('click', openImporter);

const revenueTrigger = $('#revenueTrigger');
const revenueMenu = $('#revenueMenu');
revenueTrigger.addEventListener('click', (event) => {
  event.stopPropagation();
  const isOpen = revenueMenu.hasAttribute('hidden');
  if (isOpen) revenueMenu.removeAttribute('hidden');
  else revenueMenu.setAttribute('hidden', '');
  revenueTrigger.setAttribute('aria-expanded', String(isOpen));
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.topbar')) {
    revenueMenu.setAttribute('hidden', '');
    revenueTrigger.setAttribute('aria-expanded', 'false');
  }
});
$('#salesNavItem').addEventListener('click', () => {
  state.filter = 'nonlimited';
  state.query = '';
  state.showAll = false;
  $('#searchInput').value = '';
  $$('.feed-filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'nonlimited'));
  revenueMenu.setAttribute('hidden', '');
  revenueTrigger.setAttribute('aria-expanded', 'false');
  renderFeed();
  showToast('Revenue › Sales · showing verified non-limited sales');
});

updateCounts();
renderAll();
