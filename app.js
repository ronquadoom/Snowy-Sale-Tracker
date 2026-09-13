const iconPaths = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  tag: '<path d="M20.5 13.5 13.5 20.5a2.12 2.12 0 0 1-3 0l-7-7a2.12 2.12 0 0 1-.5-1.1V5a1 1 0 0 1 1-1h7.4a2.12 2.12 0 0 1 1.1.5l8 6a2.12 2.12 0 0 1 0 3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  activity: '<path d="M3 12h4l2.2-7 4.6 14 2.2-7H21"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
  'more-horizontal': '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  snowflake: '<path d="M12 2v20M4.9 6l14.2 12M4.9 18 19.1 6M5 12h14M12 2l2 3M12 2l-2 3M12 22l2-3M12 22l-2-3M4.9 6l3.5.2M4.9 6l.4 3.5M19.1 18l-3.5-.2M19.1 18l-.4-3.5M4.9 18l3.5-.2M4.9 18l.4-3.5M19.1 6l-3.5.2M19.1 6l-.4 3.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  'refresh-cw': '<path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11M3 5v6h6M4 13a8.1 8.1 0 0 0 14.8 3L21 13m0 6v-6h-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  package: '<path d="m16.5 9.4-9-5.1M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  'trending-up': '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'trending-down': '<path d="m3 7 6 6 4-4 8 8M15 17h6v-6"/>',
  zap: '<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>',
  'sliders-horizontal': '<path d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'search-x': '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/>',
};

function iconSvg(name, filled = false) {
  const fill = filled ? ' fill="currentColor"' : '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${fill}>${iconPaths[name] || ''}</svg>`;
}

document.querySelectorAll('[data-icon]').forEach((node) => {
  const name = node.dataset.icon;
  node.innerHTML = iconSvg(name);
});

const items = [
  { id: 'frostbound-antlers', name: 'Frostbound Antlers', category: 'head', categoryLabel: 'Head & hair', price: 65, previous: 80, change: -18.8, status: 'On sale', filter: 'sale', time: '12m ago', art: 'blue', glyph: '✦', watchers: 24 },
  { id: 'snowfall-halo', name: 'Snowfall Halo', category: 'head', categoryLabel: 'Head accessory', price: 75, previous: 75, change: 0, status: 'New drop', filter: 'new', time: '38m ago', art: 'lilac', glyph: '❄', watchers: 19 },
  { id: 'aurora-visor', name: 'Aurora Visor', category: 'face', categoryLabel: 'Face accessory', price: 85, previous: 100, change: -15, status: 'On sale', filter: 'sale', time: '1h ago', art: 'peach', glyph: '◈', watchers: 31 },
  { id: 'snow-day-hood', name: 'Snow Day Hood', category: 'head', categoryLabel: 'Head & hair', price: 50, previous: 60, change: -16.7, status: 'On sale', filter: 'sale', time: '2h ago', art: 'yellow', glyph: '⌁', watchers: 14 },
  { id: 'blizzard-buddy', name: 'Blizzard Buddy', category: 'shoulder', categoryLabel: 'Shoulder accessory', price: 95, previous: 95, change: 0, status: 'On sale', filter: 'sale', time: '3h ago', art: 'mint', glyph: '◆', watchers: 8 },
  { id: 'icicle-satchel', name: 'Icicle Satchel', category: 'back', categoryLabel: 'Back accessory', price: 90, previous: 120, change: -25, status: 'Price drop', filter: 'drops', time: '4h ago', art: 'rose', glyph: '◇', watchers: 27 },
  { id: 'glacier-goggles', name: 'Glacier Goggles', category: 'face', categoryLabel: 'Face accessory', price: 70, previous: 70, change: 0, status: 'New drop', filter: 'new', time: '5h ago', art: 'blue', glyph: '◎', watchers: 11 },
  { id: 'moonlit-snowflakes', name: 'Moonlit Snowflakes', category: 'back', categoryLabel: 'Back accessory', price: 110, previous: 135, change: -18.5, status: 'Price drop', filter: 'drops', time: '6h ago', art: 'lilac', glyph: '✧', watchers: 16 },
];

const defaultWatchlist = ['frostbound-antlers', 'snowfall-halo', 'aurora-visor', 'snow-day-hood', 'icicle-satchel', 'glacier-goggles'];
let watchlist;
try {
  const saved = JSON.parse(localStorage.getItem('snowysz-watchlist'));
  watchlist = Array.isArray(saved) ? new Set(saved) : new Set(defaultWatchlist);
} catch (error) {
  watchlist = new Set(defaultWatchlist);
}

const state = {
  view: 'dashboard',
  itemFilter: 'all',
  category: 'all',
  sort: 'recent',
  query: '',
  showAll: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const viewNames = {
  dashboard: 'Overview',
  catalog: 'Catalog',
  history: 'Price history',
  watchlist: 'Watchlist',
};

function saveWatchlist() {
  try { localStorage.setItem('snowysz-watchlist', JSON.stringify([...watchlist])); } catch (error) { /* local storage can be unavailable in private previews */ }
}

function showToast(message) {
  const toast = $('#toast');
  $('#toastMessage').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2600);
}

function updateWatchlistCounts() {
  const count = watchlist.size;
  $('#watchlistMetric').textContent = count;
  $('#watchlistNavCount').textContent = count;
  $('#watchlistTabCount').textContent = count;
}

function statusClass(item) {
  if (item.filter === 'new') return 'new';
  if (watchlist.has(item.id)) return 'watched';
  return '';
}

function filteredItems() {
  let result = items.filter((item) => {
    const queryMatch = !state.query || `${item.name} ${item.categoryLabel}`.toLowerCase().includes(state.query.toLowerCase());
    const categoryMatch = state.category === 'all' || item.category === state.category;
    const viewMatch = state.view !== 'watchlist' || watchlist.has(item.id);
    let tabMatch = true;
    if (state.itemFilter === 'sale') tabMatch = item.filter === 'sale';
    if (state.itemFilter === 'drops') tabMatch = item.filter === 'drops';
    if (state.itemFilter === 'watchlist') tabMatch = watchlist.has(item.id);
    return queryMatch && categoryMatch && viewMatch && tabMatch;
  });

  if (state.sort === 'low') result.sort((a, b) => a.price - b.price);
  if (state.sort === 'high') result.sort((a, b) => b.price - a.price);
  if (state.sort === 'change') result.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return result;
}

function itemRow(item, index) {
  const isWatched = watchlist.has(item.id);
  const changeLabel = item.change === 0 ? '—' : `${item.change > 0 ? '+' : ''}${item.change}%`;
  const changeClass = item.change < 0 ? 'positive' : 'neutral';
  return `<article class="item-row" style="animation-delay:${index * 25}ms">
    <div class="item-info">
      <div class="item-art ${item.art}">${item.glyph}</div>
      <div class="item-name"><strong>${item.name}</strong><span>${item.categoryLabel} · ${item.time}</span><small class="status-tag ${statusClass(item)}">${isWatched ? 'Watching' : item.status}</small></div>
    </div>
    <div class="item-stat"><span class="item-stat-label">PRICE</span><span class="item-stat-value">${item.price} R$</span></div>
    <div class="item-stat"><span class="item-stat-label">MOVE</span><span class="item-stat-value ${changeClass}">${changeLabel}</span></div>
    <button class="watch-button ${isWatched ? 'active' : ''}" data-watch-id="${item.id}" type="button" aria-label="${isWatched ? 'Remove' : 'Add'} ${item.name} ${isWatched ? 'from' : 'to'} watchlist" aria-pressed="${isWatched}">${iconSvg('star', isWatched)}</button>
  </article>`;
}

function renderItems() {
  const list = $('#itemsList');
  const empty = $('#emptyState');
  const allFiltered = filteredItems();
  const displayed = state.showAll ? allFiltered : allFiltered.slice(0, 6);
  list.innerHTML = displayed.map(itemRow).join('');
  list.hidden = displayed.length === 0;
  empty.hidden = displayed.length !== 0;
  $('#showingCount').textContent = displayed.length;
  const loadMore = $('#loadMoreButton');
  loadMore.hidden = allFiltered.length <= 6;
  loadMore.innerHTML = state.showAll ? `Show less ${iconSvg('arrow-up-right')}` : `Load more ${iconSvg('arrow-right')}`;
  if (state.view === 'watchlist') $('#itemsTitle').textContent = 'Your watchlist';
  else if (state.view === 'history') $('#itemsTitle').textContent = 'Recent price moves';
  else if (state.view === 'catalog') $('#itemsTitle').textContent = 'UGC catalog';
  else $('#itemsTitle').textContent = 'Latest tracked items';
}

function setActiveView(view) {
  state.view = view;
  if (view === 'watchlist') state.itemFilter = 'watchlist';
  else if (state.itemFilter === 'watchlist') state.itemFilter = 'all';
  if (view === 'history') state.itemFilter = 'drops';
  if (view !== 'history' && state.itemFilter === 'drops' && view === 'dashboard') state.itemFilter = 'all';
  state.showAll = false;
  $('#breadcrumbCurrent').textContent = viewNames[view];
  $$('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  $$('.item-tab').forEach((button) => button.classList.toggle('active', button.dataset.filter === state.itemFilter));
  renderItems();
  closeSidebar();
}

function toggleWatchlist(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  if (watchlist.has(id)) {
    watchlist.delete(id);
    showToast(`${item.name} removed from your watchlist`);
  } else {
    watchlist.add(id);
    showToast(`${item.name} saved to your watchlist`);
  }
  saveWatchlist();
  updateWatchlistCounts();
  renderItems();
}

function resetFilters() {
  state.category = 'all';
  state.sort = 'recent';
  state.itemFilter = state.view === 'watchlist' ? 'watchlist' : state.view === 'history' ? 'drops' : 'all';
  state.query = '';
  $('#globalSearch').value = '';
  $('#categoryFilter').value = 'all';
  $('#sortFilter').value = 'recent';
  $$('.item-tab').forEach((button) => button.classList.toggle('active', button.dataset.filter === state.itemFilter));
  renderItems();
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#mobileScrim').classList.remove('visible');
}

function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#mobileScrim').classList.add('visible');
}

function openGroup() {
  window.open('https://www.roblox.com/communities/370302186/Snowysz#!/about', '_blank', 'noopener,noreferrer');
}

// Navigation buttons and quick links.
$$('.nav-item[data-view], .metric-link').forEach((button) => {
  button.addEventListener('click', () => setActiveView(button.dataset.view));
});

$$('.item-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    state.itemFilter = tab.dataset.filter;
    state.showAll = false;
    $$('.item-tab').forEach((button) => button.classList.toggle('active', button === tab));
    renderItems();
  });
});

$('#itemsList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-watch-id]');
  if (button) toggleWatchlist(button.dataset.watchId);
});

$('#globalSearch').addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  state.showAll = false;
  renderItems();
});

$('#categoryFilter').addEventListener('change', (event) => {
  state.category = event.target.value;
  state.showAll = false;
  renderItems();
});

$('#sortFilter').addEventListener('change', (event) => {
  state.sort = event.target.value;
  state.showAll = false;
  renderItems();
});

$('#filterButton').addEventListener('click', () => {
  $('#filterDrawer').classList.toggle('open');
  $('#filterButton').classList.toggle('open');
});

$('#clearFilters').addEventListener('click', resetFilters);
$('#emptyClear').addEventListener('click', resetFilters);
$('#loadMoreButton').addEventListener('click', () => {
  state.showAll = !state.showAll;
  renderItems();
});

$('#refreshButton').addEventListener('click', () => {
  const button = $('#refreshButton');
  const refreshIcon = button.querySelector('[data-icon]');
  refreshIcon.classList.add('spinning');
  setTimeout(() => refreshIcon.classList.remove('spinning'), 600);
  $('#lastUpdated').textContent = 'just now';
  showToast('Feed refreshed · you’re all caught up');
});

$('#notificationButton').addEventListener('click', () => showToast('3 fresh sale signals waiting'));
$('#joinButton').addEventListener('click', openGroup);
$('#communityButton').addEventListener('click', openGroup);
$('#activityButton').addEventListener('click', () => setActiveView('history'));
$('#menuButton').addEventListener('click', openSidebar);
$('#sidebarClose').addEventListener('click', closeSidebar);
$('#mobileScrim').addEventListener('click', closeSidebar);

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    event.preventDefault();
    $('#globalSearch').focus();
  }
  if (event.key === 'Escape') closeSidebar();
});

function updateCountdown() {
  if (!updateCountdown.target) updateCountdown.target = Date.now() + (1 * 60 * 60 * 1000) + (47 * 60 * 1000) + 32 * 1000;
  let remaining = Math.max(0, updateCountdown.target - Date.now());
  const hours = Math.floor(remaining / 3600000);
  remaining -= hours * 3600000;
  const minutes = Math.floor(remaining / 60000);
  remaining -= minutes * 60000;
  const seconds = Math.floor(remaining / 1000);
  const pad = (value) => String(value).padStart(2, '0');
  $('#countdown').innerHTML = `<span>${pad(hours)}</span><b>:</b><span>${pad(minutes)}</span><b>:</b><span>${pad(seconds)}</span>`;
}

const style = document.createElement('style');
style.textContent = '.spinning { animation: spin .6s ease; } @keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

updateWatchlistCounts();
renderItems();
updateCountdown();
setInterval(updateCountdown, 1000);
