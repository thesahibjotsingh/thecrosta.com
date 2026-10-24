// ── SPIN NUDGES ──
// There is one free spin a day. These keep it in front of people without nagging:
//  · a pulsing "free" dot on the Spin tab (phone dock) and Spin link (desktop header)
//  · the "Feeling lucky?" card counts down to the next spin once today's is used
//  · the cart offers the spin before checkout (only when a spin is ready and the cart has items)
// All of it follows the same 24h lock as the wheel (spin.js).
(function () {
  const LOCK_KEY = 'crosta_spin_ts', LOCK_MS = 86400 * 1000;
  const remaining = () => {
    try { const ts = parseInt(localStorage.getItem(LOCK_KEY), 10); return ts ? Math.max(0, LOCK_MS - (Date.now() - ts)) : 0; } catch (_) { return 0; }
  };
  const left = ms => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };

  const dockTab = document.querySelector('#dock a[data-dock="spin"]');
  const navLink = document.querySelector('#mainnav a[data-nav="spin"]');
  const card = document.querySelector('.spin-card > div > span');
  const cardTitle = document.querySelector('.spin-card > div > b');
  const nudge = document.getElementById('cartSpinNudge');
  const cardDefault = card ? card.textContent : '';

  function paint() {
    const ms = remaining(), ready = ms === 0;
    [dockTab, navLink].forEach(el => { if (el) { el.classList.toggle('ready', ready); el.title = ready ? 'Your free spin is ready' : `Next free spin in ${left(ms)}`; } });
    if (card) card.textContent = ready ? cardDefault : `You’ve spun today. Next free spin in ${left(ms)}`;
    if (cardTitle) cardTitle.textContent = ready ? 'Feeling lucky?' : 'Spin used today';
    if (nudge) nudge.hidden = !(ready && typeof cart !== 'undefined' && cart.length > 0);
  }

  if (nudge) {
    document.getElementById('cartSpinGo').addEventListener('click', () => {
      if (typeof closeCart === 'function') closeCart();
      const sec = document.getElementById('spin'); if (!sec) return;
      sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => { if (typeof doSpin === 'function') doSpin(); }, 700);
    });
    // the cart changes constantly: repaint when it does
    const orig = window.updateFab;
    if (typeof orig === 'function') window.updateFab = function () { const r = orig.apply(this, arguments); paint(); return r; };
  }

  window.addEventListener('crosta-spin', paint);                      // spin.js: a spin just happened
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
  setInterval(paint, 30000);
  paint();
})();
