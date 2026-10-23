// ── PHONE DOCK: Home / Menu / Offers / Cart ──
// The cart button and its count come from the shared .cart-count / .cart-total
// elements (cart-render.js). This file only does the three links and the
// highlight that follows the page as it scrolls.
(function () {
  const dock = document.getElementById('dock');
  if (!dock) return;
  const links = [...dock.querySelectorAll('a[data-dock]')];
  const sec = { home: document.querySelector('.live-band'), menu: document.querySelector('.shop'), offers: document.querySelector('.offers-section') };

  dock.addEventListener('click', e => {
    const a = e.target.closest('a[data-dock]'); if (!a) return;
    e.preventDefault();
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (a.dataset.dock === 'home') window.scrollTo({ top: 0, behavior: smooth });
    else if (a.dataset.dock === 'menu' && typeof scrollToMenu === 'function') scrollToMenu();
    else {
      const el = a.dataset.dock === 'offers' ? document.getElementById('primary') : null;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (typeof stickyOffset === 'function' ? stickyOffset() : 70) - 12, behavior: smooth });
    }
  });

  let queued = false;
  function mark() {
    queued = false;
    const mid = innerHeight * 0.45;
    let on = 'home';
    for (const k of ['home', 'menu', 'offers']) {
      const el = sec[k]; if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) on = k;
    }
    links.forEach(a => a.classList.toggle('on', a.dataset.dock === on));
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
  mark();
})();
