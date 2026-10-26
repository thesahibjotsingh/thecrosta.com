// ── DAILY SPIN (3D): settings, cart and WhatsApp hooks, and loading the 3D engine ──
// The machine itself lives in js/spin-3d.js, built from src/components/SlotMachine/ (see tools/spin-3d/README.md).
// That file is big, so it is only fetched when the Spin section is about to come into view.
// Odds, the 24h lock and the prize logic are in SlotMachineLogic.js. Define window.onCrostaWin(detail) anywhere to react to every win.
window.CROSTA_CONFIG = {
  SHOP_NUMBER: '919888383010',          // WhatsApp number: country code + digits only
  LOCK_MS: 24 * 60 * 60 * 1000,         // one spin per 24 hours
  STORAGE_KEY: 'crosta_daily_spin_v1'
};

// Free prizes go into the same cart as the menu, at ₹0. The cart shows "FREE at ₹100" until the order qualifies.
const SPIN_CART_NAMES = {
  fries: 'Fries (Free — Spin Prize)',
  garlic: 'Garlic Bread (Free — Spin Prize)',
  drink: 'Cold Drink 250ml (Free — Spin Prize)',
  topping: 'Extra Topping (Free — Spin Prize)'
};
window.crostaAddFreeItemToCart = function (item) {
  const name = SPIN_CART_NAMES[item.prizeId];
  if (!name || typeof cart === 'undefined') return false;
  cart.push({ id: name + '|free|' + Date.now(), _key: name, name, size: '', price: 0, qty: 1, addons: [], isFreeSpinPrize: true });
  renderCart(); updateFab(); refreshMenuSteppers();
  if (typeof triggerFabWobble === 'function') triggerFabWobble();
  return true;
};

window.crostaBuildWhatsAppUrl = function (prizeName) {
  const text = `🎉 I won ${prizeName} from The Crosta daily spin!\n\nPlease apply this to my order (orders of ₹100 or more). Thank you! 🍕`;
  return 'https://wa.me/' + window.CROSTA_CONFIG.SHOP_NUMBER + '?text=' + encodeURIComponent(text);
};

(function () {
  const bootSrc = document.currentScript && document.currentScript.src;   // reuse this file's ?v= so the engine is cache-busted with the rest
  const section = document.getElementById('spin');
  if (!section) return;
  let started = false;
  function load() {
    if (started) return; started = true;
    const s = document.createElement('script');
    s.src = 'js/spin-3d.js' + (bootSrc ? new URL(bootSrc).search : '');
    s.onload = () => { const l = document.querySelector('.c3d-loading'); if (l) l.remove(); };
    s.onerror = () => {
      const l = document.querySelector('.c3d-loading');
      if (l) l.textContent = 'The machine could not load. Please refresh, or order on WhatsApp and ask for today’s free spin.';
      started = false;
    };
    document.body.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '700px 0px' });
    io.observe(section);
  } else load();
  // a tap on Spin before the engine has arrived should not be lost
  const btn = document.getElementById('spinBtn');
  if (btn) btn.addEventListener('click', load, { once: true });
})();

// Scrolls so the whole machine (with its Spin button and hint) sits just under the header, instead of the
// section's top (which would cut the bottom off). Used by the nav, the phone dock and every "#spin" link.
window.scrollToSpin = function () {
  const stage = document.querySelector('.c3d-stage');
  if (!stage) return false;
  const bar = document.getElementById('bar');
  const barBottom = bar ? bar.getBoundingClientRect().bottom : 64;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const want = () => stage.getBoundingClientRect().top - (bar ? bar.getBoundingClientRect().bottom : 64) - 12;
  window.scrollTo({ top: scrollY + want(), behavior });
  setTimeout(() => { const d = want(); if (Math.abs(d) > 6) window.scrollBy({ top: d, behavior }); }, behavior === 'smooth' ? 900 : 100);   // images above load while we scroll: settle it once
  return true;
};
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href="#spin"]');
  if (!a || e.defaultPrevented) return;          // the nav and dock already handle their own links
  if (window.scrollToSpin()) e.preventDefault();
});
