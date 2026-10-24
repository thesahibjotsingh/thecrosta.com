// ── PHONE DOCK: Home / Menu / Offers / Cart ──
// The cart button and its count come from the shared .cart-count / .cart-total
// elements (cart-render.js). This file only does the three links and the
// highlight that follows the page as it scrolls.
(function () {
  const dock = document.getElementById('dock');
  if (!dock) return;
  const links = [...dock.querySelectorAll('a[data-dock]')];
  const sec = { home: document.querySelector('.live-band'), menu: document.querySelector('.shop'), offers: document.querySelector('.offers-section'), spin: document.getElementById('spin') };

  dock.addEventListener('click', e => {
    const a = e.target.closest('a[data-dock]'); if (!a) return;
    e.preventDefault();
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (a.dataset.dock === 'home') window.scrollTo({ top: 0, behavior: smooth });
    else if (a.dataset.dock === 'menu' && typeof scrollToMenu === 'function') scrollToMenu();
    else if (a.dataset.dock === 'spin') {
      const w = document.getElementById('spin'); if (w) w.scrollIntoView({ behavior: smooth, block: 'center' });
    } else {
      const el = a.dataset.dock === 'offers' ? document.getElementById('primary') : null;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (typeof stickyOffset === 'function' ? stickyOffset() : 70) - 12, behavior: smooth });
    }
  });

  let queued = false;
  function mark() {
    queued = false;
    const mid = innerHeight * 0.45;
    let on = 'home';
    for (const k of ['home', 'menu', 'offers', 'spin']) {
      const el = sec[k]; if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) on = k;
    }
    links.forEach(a => a.classList.toggle('on', a.dataset.dock === on));
  }
  // like Safari's bar: slides away while you scroll down, comes back as soon as you scroll up
  let lastY = scrollY;
  function autoHide() {
    const y = scrollY, dy = y - lastY;
    if (Math.abs(dy) < 6) return;
    const atEnd = y + innerHeight >= document.documentElement.scrollHeight - 80;
    dock.classList.toggle('hide', dy > 0 && y > 140 && !atEnd);
    lastY = y;
  }
  addEventListener('scroll', () => { autoHide(); if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
  // an item added to the cart brings it back so the new total is visible
  const count = dock.querySelector('.dk-count');
  if (count) new MutationObserver(() => dock.classList.remove('hide')).observe(count, { childList: true, characterData: true, subtree: true });
  mark();
})();

// ── DESKTOP HEADER NAV: the same section links, with the underline following the page ──
(function () {
  const nav = document.getElementById('mainnav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[data-nav]')];
  const sec = {
    home: document.querySelector('.live-band'), menu: document.querySelector('.shop'), offers: document.getElementById('offers'),
    spin: document.getElementById('spin'), reviews: document.getElementById('reviews'), hours: document.getElementById('hours')
  };
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  nav.addEventListener('click', e => {
    const a = e.target.closest('a[data-nav]'); if (!a) return;
    e.preventDefault();
    const k = a.dataset.nav;
    if (k === 'home') return window.scrollTo({ top: 0, behavior: smooth() });
    if (k === 'menu' && typeof scrollToMenu === 'function') return scrollToMenu();
    const el = sec[k]; if (!el) return;
    const bar = document.getElementById('bar');
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 64) - 4, behavior: smooth() });
  });

  let queued = false;
  function mark() {
    queued = false;
    const mid = innerHeight * 0.4;
    let on = 'home';
    for (const k of ['home', 'menu', 'offers', 'spin', 'reviews', 'hours']) {
      const el = sec[k]; if (!el) continue;
      if (el.getBoundingClientRect().top <= mid) on = k;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) on = 'hours';   // page end: last link
    links.forEach(a => a.classList.toggle('on', a.dataset.nav === on));
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
  mark();
})();

