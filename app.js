const iconPaths = {
  radio: '<path d="M5 8.5a10 10 0 0 1 14 0M8 11.5a6 6 0 0 1 8 0M12 15h.01"/><circle cx="12" cy="15" r="1"/>',
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

// Decorative fallback tiles only — purely visual placeholders shown behind the
// real Roblox thumbnail. They are not data and never invent sale information.
const GLYPHS = ['✦', '✧', '◈', '◉', '◇', '✺', '❄', '✵'];
const TILE_COLORS = ['#8ecbff', '#a8c9ff', '#9fd8ff', '#b8a9ff', '#8ff0d8', '#c3d9ff', '#7adcff', '#a5e8ff'];

function seedFrom(value) {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

function tileMeta(record) {
  const seed = seedFrom(record.assetId || record.assetName);
  return { glyph: GLYPHS[seed % GLYPHS.length], color: TILE_COLORS[seed % TILE_COLORS.length] };
}

const state = {
  filter: 'all', // 'all' | 'limited' | 'unique'
  query: '',
  showAll: false,
  status: 'live-required', // 'live-required' | 'live' | 'api-error'
  message: '',
  sales: [],
  fetchedAt: null,
};

// In-stock limited UGC tracker (Roblox public catalog API, no session needed).
const stockState = {
  report: null,
  status: 'idle', // 'idle' | 'live' | 'partial' | 'error'
  showAll: false,
  message: '',
};
const STOCK_PAGE_SIZE = 12;
let stockPollStarted = false;
let pollStarted = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatRobux(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'R$—';
  return `R$${Number(value).toLocaleString('en-US')}`;
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

// A sale is "limited" only when Roblox flagged the asset as limited or
// limited-unique in the live asset-details response.
function isLimitedRecord(record) {
  return Boolean(record.isLimited || record.isLimitedUnique);
}

function isInFilter(record) {
  if (!isLimitedRecord(record)) return false; // normal sales are never shown
  const query = state.query.toLowerCase();
  const haystack = `${record.assetName} ${record.assetId} ${record.buyerName} ${record.buyerId} ${record.location}`.toLowerCase();
  if (query && !haystack.includes(query)) return false;
  if (state.filter === 'limited') return Boolean(record.isLimited && !record.isLimitedUnique);
  if (state.filter === 'unique') return Boolean(record.isLimitedUnique);
  return true;
}

function filteredSales() {
  return state.sales.filter(isInFilter);
}

function showToast(message) {
  const toast = $('#toast');
  $('#toastMessage').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function thumbMarkup(record) {
  const tile = tileMeta(record);
  const fallback = `<span class="thumb-fallback" style="--thumb-color:${tile.color}">${tile.glyph}</span>`;
  if (!record.assetId) return fallback;
  return `${fallback}<img data-thumb-id="${escapeHtml(record.assetId)}" alt="" loading="lazy" onerror="this.remove()" />`;
}

function saleMarkup(record, index) {
  const limitedLabel = record.isLimitedUnique ? 'LIMITED UNIQUE' : 'LIMITED';
  const buyer = record.buyerName ? escapeHtml(record.buyerName) : record.buyerId ? `Buyer ${escapeHtml(record.buyerId)}` : 'Buyer unavailable';
  const location = record.location ? `<span class="source">${escapeHtml(record.location)}</span><span class="arrow">→</span>` : '';
  const held = record.holdStatus === 'Held' ? '<span class="held-flag">HELD</span>' : '';
  const url = record.assetId ? `https://www.roblox.com/catalog/${escapeHtml(record.assetId)}` : 'https://www.roblox.com/catalog';
  return `<article class="sale-row ${index === 0 ? 'hot' : ''}" style="animation-delay:${index * 18}ms" data-item-url="${url}" tabindex="0" role="link" aria-label="Open ${escapeHtml(record.assetName)} on Roblox">
    <div class="sale-thumb">${thumbMarkup(record)}</div>
    <div class="sale-main">
      <div class="sale-title-line"><strong>${escapeHtml(record.assetName)}</strong><span class="market-tag ${record.isLimitedUnique ? 'unique-tag' : 'limited-tag'}">${limitedLabel}</span></div>
      <div class="sale-meta">${location}<span class="buyer">${buyer}</span>${held}</div>
    </div>
    <div class="sale-value">${formatRobux(record.revenue)}<small>${relativeTime(record.date)}</small></div>
  </article>`;
}

function attachCatalogLinks(selector) {
  $$(selector).forEach((row) => {
    const url = row.dataset.itemUrl;
    if (!url) return;
    const open = () => window.open(url, '_blank', 'noopener');
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
}

function loadThumbnails() {
  const images = $$('img[data-thumb-id]').filter((image) => !image.dataset.queued);
  if (!images.length) return;
  images.forEach((image) => {
    image.dataset.queued = '1';
  });
  const ids = [...new Set(images.map((image) => image.dataset.thumbId))].slice(0, 200);
  fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${ids.join(',')}&size=150x150&format=Png`)
    .then((response) => response.json())
    .then((payload) => {
      const urls = new Map((Array.isArray(payload.data) ? payload.data : []).map((entry) => [String(entry.targetId), entry.imageUrl]));
      images.forEach((image) => {
        const imageUrl = urls.get(image.dataset.thumbId);
        if (imageUrl) image.src = imageUrl;
        else image.remove();
      });
    })
    .catch(() => images.forEach((image) => image.remove()));
}

function updateStats() {
  const limited = state.sales.filter(isLimitedRecord);
  const unique = limited.filter((sale) => sale.isLimitedUnique);
  const plain = limited.filter((sale) => sale.isLimited && !sale.isLimitedUnique);
  $('#salesCount').textContent = limited.length;
  $('#uniqueSalesCount').textContent = unique.length;
  const revenues = limited.map((sale) => sale.revenue).filter((value) => Number.isFinite(value));
  $('#realRevenue').textContent = revenues.length ? formatRobux(revenues.reduce((sum, value) => sum + value, 0)) : 'R$—';
  const dates = limited.map((sale) => Date.parse(sale.date)).filter(Number.isFinite);
  const latest = dates.length ? Math.max(...dates) : null;
  $('#lastSale').textContent = latest ? relativeTime(new Date(latest).toISOString()) : '—';
  const oneHourAgo = Date.now() - 3600000;
  const recent = limited.filter((sale) => Number.isFinite(Date.parse(sale.date)) && Date.parse(sale.date) >= oneHourAgo);
  const recentRevenues = recent.map((sale) => sale.revenue).filter((value) => Number.isFinite(value));
  $('#paceRate').innerHTML = recent.length ? `${recent.length}<small>/hr</small>` : '—';
  $('#averageOrder').textContent = recentRevenues.length ? formatRobux(recentRevenues.reduce((sum, value) => sum + value, 0) / recentRevenues.length) : 'R$—';
  $('#totalEntries').textContent = limited.length;
  $('#entryCount').textContent = filteredSales().length;
  $('#countAll').textContent = limited.length;
  $('#countLimited').textContent = plain.length;
  $('#countUnique').textContent = unique.length;
}

function renderEmptyState() {
  const icon = $('#noResults').querySelector('[data-icon]');
  if (state.status === 'live-required') {
    icon.innerHTML = iconSvg('clock');
    $('#noResultsTitle').textContent = 'LIVE REQUIRED';
    $('#noResultsText').textContent = 'The dashboard is empty until the live Roblox Revenue › Sales API is connected. Set the private ROBLOX_COOKIE environment variable on the Render backend, then redeploy. No sales are invented while waiting.';
  } else if (state.status === 'api-error') {
    icon.innerHTML = iconSvg('search-x');
    $('#noResultsTitle').textContent = 'API ERROR';
    $('#noResultsText').textContent = state.message || 'The live Roblox sales API could not be reached from the backend.';
  } else if (!state.sales.length) {
    icon.innerHTML = iconSvg('radio');
    $('#noResultsTitle').textContent = 'NO LIMITED SALES';
    $('#noResultsText').textContent = 'The live API is connected, but none of the latest 100 transactions are limited UGC sales. Normal sales are intentionally hidden.';
  } else {
    icon.innerHTML = iconSvg('search');
    $('#noResultsTitle').textContent = 'No matching limited sales';
    $('#noResultsText').textContent = 'Try a different filter or search term.';
  }
}

function renderFeed() {
  const filtered = filteredSales();
  const visible = state.showAll ? filtered : filtered.slice(0, 9);
  $('#saleList').innerHTML = visible.map(saleMarkup).join('');
  $('#saleList').hidden = visible.length === 0;
  $('#noResults').hidden = visible.length !== 0;
  $('#showingCount').textContent = visible.length;
  $('#filteredTotal').textContent = filtered.length;
  $('#loadMoreButton').hidden = filtered.length <= 9;
  $('#loadMoreButton').innerHTML = state.showAll ? `SHOW LESS ${iconSvg('chevron-down')}` : `LOAD MORE ${iconSvg('chevron-down')}`;
  const feedLabels = { all: 'ALL LIMITED SALES', limited: 'LIMITED SALES', unique: 'LIMITED UNIQUE SALES' };
  $('#feedEyebrow').textContent = `SNOWY'SZ / ${feedLabels[state.filter] || 'LIVE LIMITED SALES'}`;
  renderEmptyState();
  attachCatalogLinks('.sale-row');
  loadThumbnails();
}

function renderTopItems() {
  const grouped = new Map();
  state.sales.filter(isLimitedRecord).forEach((record) => {
    const key = String(record.assetId || record.assetName);
    const existing = grouped.get(key) || { name: record.assetName, assetId: record.assetId, count: 0, revenue: 0, isLimitedUnique: false };
    existing.count += 1;
    if (Number.isFinite(record.revenue)) existing.revenue += record.revenue;
    existing.isLimitedUnique = existing.isLimitedUnique || record.isLimitedUnique;
    grouped.set(key, existing);
  });
  const top = [...grouped.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 6);
  if (!top.length) {
    $('#topItems').innerHTML = '<div class="rail-empty">Waiting for live limited sales…</div>';
    return;
  }
  $('#topItems').innerHTML = top.map((entry, index) => {
    const tile = tileMeta(entry);
    const tag = entry.isLimitedUnique ? 'LIMITED UNIQUE' : 'LIMITED';
    const url = entry.assetId ? `https://www.roblox.com/catalog/${escapeHtml(entry.assetId)}` : 'https://www.roblox.com/catalog';
    return `<div class="top-item" data-item-url="${url}" tabindex="0" role="link">
      <span class="top-rank">${index + 1}</span>
      <div class="top-thumb" style="--thumb-color:${tile.color}">${entry.assetId ? `<span class="thumb-fallback">${tile.glyph}</span><img data-thumb-id="${escapeHtml(entry.assetId)}" alt="" loading="lazy" onerror="this.remove()" />` : `<span class="thumb-fallback">${tile.glyph}</span>`}</div>
      <div class="top-item-copy"><strong>${escapeHtml(entry.name)}</strong><span>${tag} · ${entry.count} VERIFIED</span></div>
      <div class="top-item-value">${formatRobux(entry.revenue)}<small>${entry.count} sold</small></div>
    </div>`;
  }).join('');
  attachCatalogLinks('.top-item');
  loadThumbnails();
}

function renderPace() {
  const recent = state.sales.filter((record) => isLimitedRecord(record) && Number.isFinite(Date.parse(record.date)) && Date.now() - Date.parse(record.date) <= 600000);
  const graph = $('#paceGraph');
  if (!recent.length) {
    graph.className = 'pace-graph is-empty';
    graph.innerHTML = '<span class="graph-empty">Waiting for live limited sales to plot pace</span>';
    return;
  }
  const buckets = Array(10).fill(0);
  recent.forEach((record) => {
    const age = Math.floor((Date.now() - Date.parse(record.date)) / 60000);
    buckets[Math.min(9, Math.max(0, age))] += 1;
  });
  const max = Math.max(...buckets, 1);
  graph.className = 'pace-graph';
  graph.innerHTML = `<div class="pace-bars">${buckets.reverse().map((value) => `<i class="pace-bar" style="height:${value ? Math.max(12, value / max * 100) : 3}%" title="${value} limited sale${value === 1 ? '' : 's'}"></i>`).join('')}</div>`;
}

function renderRevenue() {
  const limited = state.sales.filter(isLimitedRecord);
  const revenues = limited.map((sale) => sale.revenue).filter((value) => Number.isFinite(value));
  const total = revenues.reduce((sum, value) => sum + value, 0);
  if (!limited.length) {
    $('#revenueList').innerHTML = '<div class="rail-empty">No live limited revenue yet</div>';
    return;
  }
  $('#revenueList').innerHTML = `<div class="revenue-row"><span class="revenue-name"><i class="revenue-dot cyan"></i> Limited UGC sales</span><strong>${revenues.length ? formatRobux(total) : 'R$—'}<small>${limited.length} verified sale${limited.length === 1 ? '' : 's'}</small></strong></div>`;
}

function stockItemMarkup(item, index) {
  const tile = tileMeta(item);
  const total = Number(item.totalStock) || 0;
  const left = Number(item.stock) || 0;
  const percent = total > 0 ? Math.max(2, Math.round((left / total) * 100)) : 0;
  const flag = item.forSale ? '' : '<span class="stock-flag">PRIMARY SALE OFF</span>';
  const url = item.url || (item.assetId ? `https://www.roblox.com/catalog/${escapeHtml(item.assetId)}` : 'https://www.roblox.com/catalog');
  return `<article class="stock-card" style="animation-delay:${index * 16}ms" data-item-url="${url}" tabindex="0" role="link" aria-label="Open ${escapeHtml(item.displayName || item.name)} on Roblox">
    <div class="stock-thumb">${tile ? `<span class="thumb-fallback" style="--thumb-color:${tile.color}">${tile.glyph}</span>` : ''}${item.assetId ? `<img data-thumb-id="${escapeHtml(item.assetId)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</div>
    <div class="stock-copy">
      <div class="stock-title-line"><strong>${escapeHtml(item.displayName || item.name || `Item ${item.assetId}`)}</strong><span class="market-tag ${item.limitedType === 'Limited Unique' ? 'unique-tag' : 'limited-tag'}">${escapeHtml((item.limitedType || 'limited').toUpperCase())}</span>${flag}</div>
      <div class="stock-meter"><i style="width:${percent}%"></i></div>
      <div class="stock-numbers"><span><b>${left.toLocaleString('en-US')}</b> / ${total.toLocaleString('en-US')} left</span><span class="stock-price">${formatRobux(item.priceInRobux)}</span></div>
    </div>
  </article>`;
}

function renderStock() {
  const report = stockState.report;
  const pill = $('#stockPill');
  const totals = report?.totals || { inStock: 0, soldOut: 0, nonLimited: 0, stockMismatch: 0, unknownStock: 0, unavailable: 0 };
  const items = report?.items || [];

  $('#stockInStock').textContent = totals.inStock || 0;
  $('#stockCopies').textContent = Number(report?.inStockCopies || 0).toLocaleString('en-US');
  $('#stockSoldOut').textContent = totals.soldOut || 0;
  $('#stockNonLimited').textContent = totals.nonLimited || 0;
  $('#stockMismatch').textContent = totals.stockMismatch || 0;
  $('#stockUnverified').textContent = (totals.unknownStock || 0) + (totals.unavailable || 0);
  $('#stockTotalInStock').textContent = totals.inStock || 0;
  $('#stockTracked').textContent = report?.trackedIds ?? 141;
  $('#stockIdCount').textContent = report?.trackedIds ?? 141;
  if (report?.requiredTotalStock) {
    $('#stockMismatchLabel').textContent = `NOT ${Number(report.requiredTotalStock).toLocaleString('en-US')} RUN`;
  }

  const stateLabels = { live: 'LIVE CATALOG', partial: 'PARTIAL SCAN', error: 'API ERROR', idle: 'SCANNING' };
  pill.classList.toggle('waiting', stockState.status === 'idle');
  pill.classList.toggle('loaded', stockState.status === 'live');
  pill.classList.toggle('partial', stockState.status === 'partial');
  pill.classList.toggle('error', stockState.status === 'error');
  $('#stockPillLabel').textContent = stateLabels[stockState.status] || 'SCANNING';
  pill.querySelector('[data-icon]').innerHTML = iconSvg(stockState.status === 'live' ? 'radio' : stockState.status === 'error' ? 'search-x' : 'clock');
  pill.title = stockState.message || 'Roblox public catalog API';

  const visible = stockState.showAll ? items : items.slice(0, STOCK_PAGE_SIZE);
  $('#stockList').innerHTML = visible.map(stockItemMarkup).join('');
  $('#stockList').hidden = items.length === 0;
  $('#stockEmpty').hidden = items.length !== 0;
  if (items.length === 0 && stockState.status === 'error') {
    $('#stockEmptyTitle').textContent = 'CATALOG API UNREACHABLE';
    $('#stockEmptyText').textContent = stockState.message || 'Roblox did not answer the catalog scan. Nothing is guessed while it is unreachable.';
  } else if (items.length === 0) {
    $('#stockEmptyTitle').textContent = 'NOTHING IN STOCK';
    $('#stockEmptyText').textContent = 'No supplied ID is currently a limited 3,000-copy run with copies left. Nothing is invented to fill this panel.';
  }
  $('#stockShowing').textContent = visible.length;
  $('#stockShowAllButton').hidden = items.length <= STOCK_PAGE_SIZE;
  $('#stockShowAllButton').innerHTML = stockState.showAll ? `SHOW FIRST ${STOCK_PAGE_SIZE} ${iconSvg('chevron-down')}` : `SHOW ALL ${items.length} ${iconSvg('chevron-down')}`;

  if (report) {
    const excluded = [
      `${totals.soldOut || 0} sold out`,
      `${totals.nonLimited || 0} non-limited`,
      `${totals.stockMismatch || 0} not a ${Number(report.requiredTotalStock || 3000).toLocaleString('en-US')}-copy run`,
      `${(totals.unknownStock || 0) + (totals.unavailable || 0)} unverified`,
    ].join(' · ');
    const coverage = report.complete ? `${report.trackedIds} of ${report.trackedIds} IDs verified` : 'scan still running';
    $('#stockNote').textContent = `${coverage} · excluded: ${excluded}${report.cached ? ' · cached result' : ''} · ${relativeTime(report.fetchedAt)}`;
  } else if (stockState.status === 'error') {
    $('#stockNote').textContent = stockState.message;
  }

  attachCatalogLinks('.stock-card');
  loadThumbnails();
}

async function pollInStock(force = false) {
  try {
    const response = await fetch(`/api/in-stock${force ? '?refresh=1' : ''}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (Array.isArray(payload.items)) {
      const before = stockState.report ? stockState.report.inStockCopies : null;
      stockState.report = payload;
      stockState.status = payload.complete ? 'live' : 'partial';
      stockState.message = '';
      if (force && before !== null && before !== payload.inStockCopies) {
        showToast(`In-stock scan updated · ${payload.inStockCopies.toLocaleString('en-US')} copies left`);
      }
    } else {
      stockState.status = 'error';
      stockState.message = 'The catalog scan could not be completed on the backend.';
    }
  } catch (error) {
    stockState.status = 'error';
    stockState.message = 'The catalog API is not reachable from this deployment.';
  }
  renderStock();
}

function startStockPolling() {
  if (stockPollStarted) return;
  stockPollStarted = true;
  pollInStock(false);
  setInterval(() => pollInStock(true), 300000);
}

function renderConnection() {
  const pill = $('#connectionPill');
  pill.classList.toggle('waiting', state.status === 'live-required');
  pill.classList.toggle('loaded', state.status === 'live');
  pill.classList.toggle('error', state.status === 'api-error');
  $('#connectionLabel').textContent = state.status === 'live' ? 'LIVE API' : state.status === 'api-error' ? 'API ERROR' : 'LIVE REQUIRED';
  pill.querySelector('[data-icon]').innerHTML = iconSvg(state.status === 'live' ? 'radio' : state.status === 'api-error' ? 'search-x' : 'clock');
  pill.title = state.status === 'live'
    ? `Connected · ${state.sales.length} limited sale${state.sales.length === 1 ? '' : 's'} in the latest 100 transactions`
    : state.message || 'Waiting for the live Roblox Revenue › Sales API';
  const dot = $('.status-dot');
  dot.style.background = state.status === 'live' ? 'var(--sky)' : state.status === 'api-error' ? 'var(--danger)' : 'var(--amber)';
}

function renderAll() {
  updateStats();
  renderFeed();
  renderTopItems();
  renderPace();
  renderRevenue();
  renderConnection();
  renderStock();
}

async function pollLiveSales(showNotice = false) {
  try {
    const response = await fetch('/api/sales', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (payload.status === 'live' && Array.isArray(payload.sales)) {
      const before = state.sales.map((sale) => `${sale.id}:${sale.date}:${sale.revenue}`).join('|');
      // Keep limited records only — a defensive check on top of the server filter.
      state.sales = payload.sales.filter(isLimitedRecord);
      state.status = 'live';
      state.message = '';
      state.fetchedAt = payload.fetchedAt || null;
      const after = state.sales.map((sale) => `${sale.id}:${sale.date}:${sale.revenue}`).join('|');
      if (showNotice && before !== after) showToast(`Live feed updated · ${state.sales.length} limited sale${state.sales.length === 1 ? '' : 's'}`);
    } else if (payload.status === 'api-error') {
      state.status = 'api-error';
      state.message = payload.message || 'The live Roblox sales API could not be reached from the backend.';
      if (showNotice) showToast(state.message);
    } else {
      // live-required: the backend has no ROBLOX_COOKIE yet. Stay empty.
      state.status = 'live-required';
      state.message = payload.message || '';
      state.sales = [];
    }
  } catch (error) {
    state.status = 'api-error';
    state.message = 'The live API is not reachable from this deployment.';
  }
  renderAll();
  return state.status === 'live';
}

function startLivePolling() {
  if (pollStarted) return;
  pollStarted = true;
  pollLiveSales(false);
  setInterval(() => pollLiveSales(true), 60000);
}

$$('.feed-filter').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    state.showAll = false;
    $$('.feed-filter').forEach((item) => item.classList.toggle('active', item === button));
    renderFeed();
    updateStats();
  });
});

$('#searchInput').addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  state.showAll = false;
  renderFeed();
  updateStats();
});

$('#loadMoreButton').addEventListener('click', () => {
  state.showAll = !state.showAll;
  renderFeed();
});

$('#refreshButton').addEventListener('click', () => {
  const icon = $('#refreshButton').querySelector('[data-icon]');
  icon.classList.add('spinning');
  setTimeout(() => icon.classList.remove('spinning'), 650);
  pollLiveSales(true);
});

$('#stockRefreshButton').addEventListener('click', () => {
  const icon = $('#stockRefreshButton').querySelector('[data-icon]');
  icon.classList.add('spinning');
  setTimeout(() => icon.classList.remove('spinning'), 650);
  pollInStock(true);
});

$('#stockShowAllButton').addEventListener('click', () => {
  stockState.showAll = !stockState.showAll;
  renderStock();
});

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
  state.filter = 'all';
  state.query = '';
  state.showAll = false;
  $('#searchInput').value = '';
  $$('.feed-filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
  revenueMenu.setAttribute('hidden', '');
  revenueTrigger.setAttribute('aria-expanded', 'false');
  renderFeed();
  updateStats();
  showToast('Revenue › Sales · live limited sales feed');
});

renderAll();
startLivePolling();
startStockPolling();
