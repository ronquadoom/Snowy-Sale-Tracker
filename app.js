const iconPaths = {
  radio: '<path d="M5 8.5a10 10 0 0 1 14 0M8 11.5a6 6 0 0 1 8 0M12 15h.01"/><circle cx="12" cy="15" r="1"/>',
  'bar-chart': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  'trending-up': '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11M3 5v6h6M4 13a8.1 8.1 0 0 0 14.8 3L21 13m0 6v-6h-6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
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
const buyers = ['@snowfall', '@aurorafrost', '@icecube', '@cloudyvoid', '@starrysnow', '@frostdaze', '@auroracode', '@winterbyte', '@icylogic', '@moonlit'];

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
  const isCheap = /cheap/i.test(lower);
  const isSparkle = /sparkle/i.test(lower);
  const isSkybox = /skybox/i.test(lower);
  const isRainbow = /rainbow/i.test(lower);
  const amount = isCheap ? 65 : isLimited ? 95 : 85;
  const ageMinutes = index < 9 ? index + 1 : 10 + Math.floor(index * 1.7);
  return {
    id: `${assetId}-${index}`,
    name,
    assetId,
    slug,
    url: `https://www.roblox.com/catalog/${assetId}/${slug}`,
    type: 'ASSET',
    flag: index === 0 ? 'NEW' : '',
    category: isFace ? 'face' : 'head',
    limited: isLimited,
    cheap: isCheap,
    sparkle: isSparkle,
    skybox: isSkybox,
    rainbow: isRainbow,
    daily: true,
    amount,
    buyer: buyers[index % buyers.length],
    age: `${ageMinutes}m ago`,
    sales: Math.max(1, 8 - Math.floor(index / 18)),
    glyph,
    color,
    glow,
    hot: index === 0,
  };
}

const feedItems = assetLinks.map(itemFromLink);
const totalEntries = feedItems.length;
const state = { filter: 'all', query: '', showAll: false, connected: true };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function showToast(message) {
  const toast = $('#toast');
  $('#toastMessage').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function filterCounts() {
  return {
    all: totalEntries,
    cheap: feedItems.filter((item) => item.cheap).length,
    limited: feedItems.filter((item) => item.limited).length,
    head: feedItems.filter((item) => item.category === 'head').length,
    face: feedItems.filter((item) => item.category === 'face').length,
    sparkle: feedItems.filter((item) => item.sparkle).length,
    skybox: feedItems.filter((item) => item.skybox).length,
  };
}

function updateCounts() {
  const counts = filterCounts();
  $('#totalEntries').textContent = totalEntries;
  $('#footerTotal').textContent = totalEntries;
  $('#salesCount').textContent = totalEntries;
  $$('.feed-filter').forEach((button) => {
    const count = button.querySelector('b');
    if (count) count.textContent = counts[button.dataset.filter] ?? 0;
  });
}

function matches(item) {
  const q = state.query.toLowerCase();
  const searchMatch = !q || `${item.name} ${item.category} ${item.buyer}`.toLowerCase().includes(q);
  let filterMatch = true;
  if (state.filter === 'cheap') filterMatch = item.cheap;
  if (state.filter === 'limited') filterMatch = item.limited;
  if (state.filter === 'head') filterMatch = item.category === 'head';
  if (state.filter === 'face') filterMatch = item.category === 'face';
  if (state.filter === 'sparkle') filterMatch = item.sparkle;
  if (state.filter === 'skybox') filterMatch = item.skybox;
  return searchMatch && filterMatch;
}

function fallbackThumb(item, small = false) {
  return `<span class="${small ? '' : 'thumb-'}fallback" style="--thumb-color:${item.color};">${item.glyph}</span>`;
}

function thumbMarkup(item, small = false) {
  return `${fallbackThumb(item, small)}<img data-thumb-id="${item.assetId}" alt="${item.name}" loading="lazy" onerror="this.remove()" />`;
}

function saleMarkup(item, index) {
  return `<article class="sale-row ${item.hot ? 'hot' : ''}" style="animation-delay:${index * 18}ms" data-item-url="${item.url}" tabindex="0" role="link" aria-label="Open ${item.name} on Roblox">
    <div class="sale-thumb" style="--thumb-color:${item.color};--thumb-glow:${item.glow}">${thumbMarkup(item)}</div>
    <div class="sale-main">
      <div class="sale-title-line"><strong>${item.name}</strong><span class="asset-tag">${item.type}</span>${item.flag ? `<span class="new-tag">${item.flag}</span>` : ''}</div>
      <div class="sale-meta"><span class="source">Snowy'sz</span><span class="arrow">→</span><span class="buyer">${item.buyer}</span></div>
    </div>
    <div class="sale-value">+R$${item.amount}<small>${item.age}</small></div>
  </article>`;
}

function renderFeed() {
  const filtered = feedItems.filter(matches);
  const visible = state.showAll ? filtered : filtered.slice(0, 9);
  $('#saleList').innerHTML = visible.map(saleMarkup).join('');
  $('#saleList').hidden = visible.length === 0;
  $('#noResults').hidden = visible.length !== 0;
  $('#showingCount').textContent = visible.length;
  $('#loadMoreButton').hidden = filtered.length <= 9;
  $('#loadMoreButton').innerHTML = state.showAll ? `SHOW LESS ${iconSvg('chevron-down')}` : `LOAD MORE ${iconSvg('chevron-down')}`;
  $('#entryCount').textContent = state.query || state.filter !== 'all' ? filtered.length : totalEntries;
  attachCatalogLinks('.sale-row');
  loadThumbnails();
}

function renderTopItems() {
  const top = [...feedItems].sort((a, b) => b.sales - a.sales).slice(0, 6);
  $('#topItems').innerHTML = top.map((item, index) => `<div class="top-item" data-item-url="${item.url}" tabindex="0" role="link">
    <span class="top-rank">${index + 1}</span><div class="top-thumb" style="--thumb-color:${item.color}">${thumbMarkup(item, true)}</div>
    <div class="top-item-copy"><strong>${item.name}</strong><span>SNOWY'SZ</span></div><div class="top-item-value">R$${item.amount}<small>${item.sales} sold</small></div>
  </div>`).join('');
  attachCatalogLinks('.top-item');
  loadThumbnails();
}

function attachCatalogLinks(selector) {
  $$(selector).forEach((row) => {
    if (row.dataset.bound) return;
    row.dataset.bound = 'true';
    const open = () => window.open(row.dataset.itemUrl, '_blank', 'noopener,noreferrer');
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
}

async function loadThumbnails() {
  const nodes = $$('[data-thumb-id]');
  const ids = [...new Set(nodes.map((node) => node.dataset.thumbId))];
  for (let start = 0; start < ids.length; start += 50) {
    const batch = ids.slice(start, start + 50);
    try {
      const response = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${batch.join(',')}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`);
      if (!response.ok) continue;
      const payload = await response.json();
      (payload.data || []).forEach((asset) => {
        if (!asset.imageUrl) return;
        $$(`[data-thumb-id="${asset.targetId}"]`).forEach((image) => { image.src = asset.imageUrl; });
      });
    } catch (error) {
      // The gradient glyph remains as a local fallback if Roblox blocks the request.
    }
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

$('#refreshButton').addEventListener('click', () => {
  const icon = $('#refreshButton').querySelector('[data-icon]');
  icon.classList.add('spinning');
  setTimeout(() => icon.classList.remove('spinning'), 650);
  $('#lastSale').textContent = 'now';
  showToast(`Feed synced · ${totalEntries} entries checked`);
  loadThumbnails();
});

$('#connectionToggle').addEventListener('click', () => {
  state.connected = !state.connected;
  const button = $('#connectionToggle');
  button.classList.toggle('paused', !state.connected);
  button.setAttribute('aria-pressed', String(state.connected));
  $('#connectionLabel').textContent = state.connected ? 'CONNECTED' : 'PAUSED';
  document.querySelector('.status-dot').style.background = state.connected ? 'var(--red)' : 'var(--muted-2)';
  showToast(state.connected ? 'Live polling resumed' : 'Live polling paused');
});

updateCounts();
renderFeed();
renderTopItems();
