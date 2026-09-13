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

const imageBase = 'https://tr.rbxcdn.com/180DAY-';
const feedItems = [
  {
    id: 'animated-rainbow-horns', name: 'Animated Rainbow Horns', assetId: '80550135091196', type: 'ASSET', flag: 'NEW', category: 'head', rainbow: true, daily: true, amount: 95, buyer: '@snowfall', age: '1m ago', sales: 5, glyph: '✦', color: '#8c78ff', glow: 'rgba(104, 83, 255, .3)', image: `${imageBase}93fedc8d951ad349d56ee64abf42c4f9/150/150/Hat/Png/noFilter`, hot: true,
  },
  {
    id: 'rainbow-spiral-tornado', name: 'Animated Rainbow Spiral Tornado Hat', assetId: '137668363946214', type: 'ASSET', flag: '', category: 'head', rainbow: true, daily: true, amount: 95, buyer: '@aurorafrost', age: '2m ago', sales: 4, glyph: '✧', color: '#a579ff', glow: 'rgba(149, 82, 255, .26)', image: `${imageBase}cb45f148e2d2d329a4ec6f4fb01d5158/150/150/Hat/Png/noFilter`,
  },
  {
    id: 'animated-rainbow-crown', name: '[⌛ANIMATED RAINBOW] Crown', assetId: '83430944718004', type: 'ASSET', flag: '', category: 'head', rainbow: true, daily: true, limited: true, amount: 95, buyer: '@icecube', age: '3m ago', sales: 4, glyph: '♛', color: '#ce79ff', glow: 'rgba(196, 73, 255, .23)', image: `${imageBase}9fa272571636ec3f0996cc0097aab190/150/150/Hat/Png/noFilter`,
  },
  {
    id: 'rainbow-clockwork-shades', name: 'Animated Rainbow Clockwork Shades', assetId: '137478845250193', type: 'ASSET', flag: '', category: 'face', rainbow: true, daily: true, amount: 95, buyer: '@cloudyvoid', age: '5m ago', sales: 3, glyph: '◈', color: '#54c7ff', glow: 'rgba(49, 167, 255, .25)', image: `${imageBase}a636c28271b0c4ce6810ce9b8bebfd97/150/150/FaceAccessory/Png/noFilter`,
  },
  {
    id: 'rainbow-headphones', name: '[⏳Animated Rainbow] Headphones', assetId: '111182971245915', type: 'ASSET', flag: '', category: 'head', rainbow: true, daily: true, amount: 95, buyer: '@starrysnow', age: '6m ago', sales: 2, glyph: '◉', color: '#4ed5ec', glow: 'rgba(35, 200, 222, .25)', image: `${imageBase}650fef56f71704115c5544faef72eec2/150/150/Hat/Png/noFilter`,
  },
  {
    id: 'rainbow-fedora', name: '[⏳RAINBOW ANIMATED] Fedora', assetId: '85092908035558', type: 'ASSET', flag: '', category: 'head', rainbow: true, daily: true, amount: 95, buyer: '@frostdaze', age: '7m ago', sales: 2, glyph: '◒', color: '#e878c8', glow: 'rgba(230, 71, 191, .25)', image: `${imageBase}bb3e148e903edc3ab47e381420178371/150/150/Hat/Png/noFilter`,
  },
  {
    id: 'clockwork-shades', name: '[⏳Rainbow Animated] Clockwork Shades', assetId: '133053224044278', type: 'ASSET', flag: '', category: 'face', rainbow: true, daily: true, limited: true, amount: 95, buyer: '@auroracode', age: '8m ago', sales: 1, glyph: '◇', color: '#6e9cff', glow: 'rgba(68, 116, 255, .24)', image: `${imageBase}3145c3da6f75690ea0146dd0c3fae1ba/150/150/FaceAccessory/Png/noFilter`,
  },
  {
    id: 'rainbow-crown', name: '[⏳Animated Rainbow] Crown', assetId: '111164009273654', type: 'ASSET', flag: '', category: 'head', rainbow: true, daily: true, limited: true, amount: 95, buyer: '@winterbyte', age: '10m ago', sales: 1, glyph: '✺', color: '#f08bdd', glow: 'rgba(230, 83, 200, .24)', image: `${imageBase}1ad611e5851f3408ec6115dbd681522f/150/150/Hat/Png/noFilter`,
  },
  {
    id: 'animated-rainbow-horns-2', name: '⌛Animated Rainbow Horns', assetId: '109993377916109', type: 'ASSET', flag: '', category: 'head', rainbow: true, daily: true, amount: 95, buyer: '@icylogic', age: '12m ago', sales: 1, glyph: '✦', color: '#8ba6ff', glow: 'rgba(79, 116, 255, .26)', image: `${imageBase}b9bd1c8c5de5978a8aadf35dd11e4dc3/150/150/Hat/Png/noFilter`,
  },
  {
    id: 'silver-star-crown', name: 'Silver Star Crown', assetId: '127292656833623', type: 'ASSET', flag: '', category: 'head', rainbow: false, daily: true, amount: 95, buyer: '@moonlit', age: '14m ago', sales: 1, glyph: '✶', color: '#9da6b8', glow: 'rgba(117, 143, 190, .22)', image: '',
  },
];

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

function matches(item) {
  const q = state.query.toLowerCase();
  const searchMatch = !q || `${item.name} ${item.category} ${item.buyer}`.toLowerCase().includes(q);
  let filterMatch = true;
  if (state.filter === 'daily') filterMatch = item.daily;
  if (state.filter === 'onsale') filterMatch = item.amount > 0;
  if (state.filter === 'head') filterMatch = item.category === 'head';
  if (state.filter === 'face') filterMatch = item.category === 'face';
  if (state.filter === 'rainbow') filterMatch = item.rainbow;
  if (state.filter === 'limited') filterMatch = item.limited;
  return searchMatch && filterMatch;
}

function fallbackThumb(item, small = false) {
  return `<span class="${small ? '' : 'thumb-'}fallback" style="--thumb-color:${item.color};">${item.glyph}</span>`;
}

function thumbMarkup(item, small = false) {
  const image = item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.remove()" />` : '';
  return `${fallbackThumb(item, small)}${image}`;
}

function saleMarkup(item, index) {
  return `<article class="sale-row ${item.hot ? 'hot' : ''}" style="animation-delay:${index * 28}ms" data-item-url="https://www.roblox.com/catalog/${item.assetId}" tabindex="0" role="link" aria-label="Open ${item.name} on Roblox">
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
  $('#entryCount').textContent = state.query || state.filter !== 'all' ? visible.length : 48;

  $$('.sale-row').forEach((row) => {
    const open = () => window.open(row.dataset.itemUrl, '_blank', 'noopener,noreferrer');
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
}

function renderTopItems() {
  const top = [...feedItems].sort((a, b) => b.sales - a.sales).slice(0, 6);
  $('#topItems').innerHTML = top.map((item, index) => `<div class="top-item" data-item-url="https://www.roblox.com/catalog/${item.assetId}" tabindex="0" role="link">
    <span class="top-rank">${index + 1}</span><div class="top-thumb" style="--thumb-color:${item.color}">${thumbMarkup(item, true)}</div>
    <div class="top-item-copy"><strong>${item.name}</strong><span>SNOWY'SZ</span></div><div class="top-item-value">R$${item.amount}<small>${item.sales} sold</small></div>
  </div>`).join('');
  $$('.top-item').forEach((row) => {
    const open = () => window.open(row.dataset.itemUrl, '_blank', 'noopener,noreferrer');
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
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
  showToast('Feed synced · 48 entries checked');
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

renderFeed();
renderTopItems();
