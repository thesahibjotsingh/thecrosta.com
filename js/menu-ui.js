// ── MENU NAVIGATION ──
// Category chips and search (in the tools bar) drive the menu panels.
// Panels are rendered from menu-data.js; cart wiring lives in menu-wiring.js.

// find a menu item by exact name → { panelId, item } (used by bestsellers and offer sheets)
function menuLookup(name) {
  for (const p of MENU_DATA.panels) for (const c of p.categories) {
    const item = c.items.find(i => i.name === name);
    if (item) return { panelId: p.id, item };
  }
  return null;
}

// pixels the sticky header + tools bar cover at the top of the screen
function stickyOffset() {
  const bar = document.getElementById('bar'), tools = document.getElementById('tools');
  return (bar ? bar.offsetHeight : 64) + (tools ? tools.offsetHeight : 0);
}
function scrollToMenu(anchorId) {
  const el = (anchorId && document.getElementById(anchorId)) || document.querySelector('#menu .menu-header') || document.getElementById('menu');
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - 12;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ── category switching ──
function showTab(name) {
  const panel = document.getElementById('tab-' + name);
  if (!panel) return;
  document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));
  panel.classList.add('active');
  document.querySelectorAll('#chips .chip').forEach(c => {
    const on = c.dataset.cat === name && !searching;
    c.classList.toggle('on', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  // stagger-in menu items
  panel.querySelectorAll('.menu-item').forEach((item, i) => { item.style.animationDelay = (i * 35) + 'ms'; });

  // Quick Bites jump links
  const subnav = document.getElementById('qbSubnav');
  if (subnav) {
    subnav.classList.toggle('visible', name === 'quickbites');
    if (name === 'quickbites') document.querySelectorAll('.qb-sub-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  }
  updateMenuSizesBox(name);
}

// the size / "make it a meal" / dough info box beside the menu title
function updateMenuSizesBox(name) {
  const box = document.getElementById('menuSizesBox');
  if (!box) return;
  const variants = ['pizzas', 'burgerswraps', 'garlicbread'];
  if (variants.includes(name) && !searching) {
    box.classList.remove('menu-sizes-hidden');
    box.querySelectorAll('.menu-sizes-variant').forEach(v => v.classList.toggle('active', v.dataset.variant === name));
  } else {
    box.classList.add('menu-sizes-hidden');
  }
}

// jump straight to a category from anywhere on the page (tiles, offers)
function goToCategory(name, anchorId) {
  clearSearch(false);
  showTab(name);
  // wait a frame so the new panel is laid out before measuring
  requestAnimationFrame(() => scrollToMenu(anchorId));
}

document.getElementById('chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  clearSearch(false);
  showTab(c.dataset.cat);
  c.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });   // selected chip sits at the left edge: no half-hidden chip on that side
  // always start the new section at the top of the menu: a shorter section would otherwise leave you at its bottom
  requestAnimationFrame(() => scrollToMenu());
});

// ── search ──
let searching = false;
const searchInput = document.getElementById('menuSearch');
const searchClearBtn = document.getElementById('searchClear');
const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9₹ ]+/g, ' ').replace(/\s+/g, ' ').trim();

// each item's searchable text: name, description, badges and its category title
const searchIndex = new Map();
function buildSearchIndex() {
  document.querySelectorAll('.menu-category').forEach(cat => {
    const title = cat.querySelector('.menu-category-title');
    const extra = title ? title.textContent : '';
    cat.querySelectorAll('.menu-item').forEach(item => {
      // only the words a customer would search for — not buttons, prices or size pills
      const parts = ['.menu-item-name', '.menu-item-desc', '.badge'].map(sel =>
        [...item.querySelectorAll(sel)].map(n => n.textContent).join(' '));
      searchIndex.set(item, norm(parts.join(' ') + ' ' + extra + ' ' + (item.dataset.flavorOptions || '')));
    });
  });
}

function applySearch() {
  const q = norm(searchInput.value);
  searchClearBtn.hidden = !searchInput.value;
  const menu = document.getElementById('menu');
  if (!q) { clearSearch(false); return; }
  if (!searchIndex.size) buildSearchIndex();
  const tokens = q.split(' ');
  searching = true;
  menu.classList.add('searching');
  document.body.classList.add('is-searching');          // results only: the bestsellers strip steps aside
  document.querySelectorAll('#chips .chip').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
  updateMenuSizesBox('');
  let shown = 0;
  document.querySelectorAll('.menu-panel').forEach(panel => {
    panel.classList.add('is-searching');
    let panelHits = 0;
    panel.querySelectorAll('.menu-category').forEach(cat => {
      let hits = 0;
      cat.querySelectorAll('.menu-item').forEach(item => {
        const ok = tokens.every(t => (searchIndex.get(item) || '').includes(t));
        item.classList.toggle('is-hidden', !ok);
        if (ok) hits++;
      });
      cat.classList.toggle('is-hidden', hits === 0);
      panelHits += hits;
    });
    panel.classList.toggle('is-hidden', panelHits === 0);
    shown += panelHits;
  });
  document.getElementById('qbSubnav')?.classList.remove('visible');
  document.getElementById('menuEmpty').hidden = shown > 0;
}

function clearSearch(clearBox = true) {
  if (clearBox) searchInput.value = '';
  searchClearBtn.hidden = !searchInput.value;
  if (!searching) return;
  searching = false;
  document.body.classList.remove('is-searching');
  document.getElementById('menu').classList.remove('searching');
  document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('is-searching', 'is-hidden'));
  document.querySelectorAll('.menu-category, .menu-item').forEach(el => el.classList.remove('is-hidden'));
  document.getElementById('menuEmpty').hidden = true;
  const active = document.querySelector('.menu-panel.active');
  showTab(active ? active.id.replace('tab-', '') : 'pizzas');
}

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const wasSearching = searching;
    applySearch();
    // first keystroke: bring the results into view
    if (!wasSearching && searching) scrollToMenu();
  }, 90);
});
searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') { clearSearch(true); } });
searchClearBtn.addEventListener('click', () => { clearSearch(true); searchInput.focus(); });
// the keyboard's "search" key just dismisses the keyboard
searchInput.closest('label').addEventListener('submit', e => e.preventDefault());
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchInput.blur(); } });

// tiles anywhere on the page: <a data-cat="pizzas" [data-anchor="qb-fries"]>
document.addEventListener('click', e => {
  const t = e.target.closest('[data-cat]:not(.chip)');
  if (!t) return;
  e.preventDefault();
  goToCategory(t.dataset.cat, t.dataset.anchor);
});

// ── Quick Bites jump links ──
function scrollToQbCategory(id, btn) {
  document.querySelectorAll('.qb-sub-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - 12;
  window.scrollTo({ top, behavior: 'smooth' });
}

// highlight the right Quick Bites pill while scrolling
(function () {
  const cats = ['qb-fries', 'qb-springrolls'];
  const observer = new IntersectionObserver((entries) => {
    const panel = document.getElementById('tab-quickbites');
    if (!panel || !panel.classList.contains('active')) return;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = cats.indexOf(entry.target.id);
        if (idx === -1) return;
        document.querySelectorAll('.qb-sub-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.addEventListener('DOMContentLoaded', () => {
    cats.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    showTab('pizzas');
  });
})();
