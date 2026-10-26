// ── SPIN NUDGES ──
// There is one free spin a day. These keep it in front of people without nagging:
//  · a pulsing "free" dot on the Spin tab (phone dock) and Spin link (desktop header)
//  · the "Feeling lucky?" card counts down to the next spin once today's is used
// All of it follows the same 24h lock as the daily spin machine (spin-3d.js).
(function () {
  const LOCK_KEY = 'crosta_daily_spin_v1', LOCK_MS = 86400 * 1000;   // same record the 3D machine writes
  const remaining = () => {
    try {
      const rec = JSON.parse(localStorage.getItem(LOCK_KEY));
      return rec && typeof rec.t === 'number' ? Math.max(0, LOCK_MS - (Date.now() - rec.t)) : 0;
    } catch (_) { return 0; }
  };
  const left = ms => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };

  const dockTab = document.querySelector('#dock a[data-dock="spin"]');
  const navLink = document.querySelector('#mainnav a[data-nav="spin"]');
  const card = document.querySelector('.spin-card > div > span');
  const cardTitle = document.querySelector('.spin-card > div > b');
  const cardDefault = card ? card.textContent : '';

  function paint() {
    const ms = remaining(), ready = ms === 0;
    [dockTab, navLink].forEach(el => { if (el) { el.classList.toggle('ready', ready); el.title = ready ? 'Your free spin is ready' : `Next free spin in ${left(ms)}`; } });
    if (card) card.textContent = ready ? cardDefault : `You’ve spun today. Next free spin in ${left(ms)}`;
    if (cardTitle) cardTitle.textContent = ready ? 'Feeling lucky?' : 'Spin used today';
  }

  window.addEventListener('crosta-spin', paint);                      // spin-3d.js: a spin just happened
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
  setInterval(paint, 30000);
  paint();
})();
