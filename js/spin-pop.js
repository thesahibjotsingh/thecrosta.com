// ── SPIN POPUP: offered once to a visitor who hasn't spun ──
// Waits a few seconds after landing, shows once a day, and stays out of the way
// if they have already spun or are busy (cart or a sheet is open).
(function () {
  const pop = document.getElementById('spinPop'), card = document.getElementById('spinPopCard'), go = document.getElementById('spinPopGo');
  if (!pop) return;
  const SEEN_KEY = 'crosta_spinpop_ts', SPIN_KEY = 'crosta_spin_ts', DAY = 86400 * 1000, DELAY = 5000;
  const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const recent = k => { const t = parseInt(get(k), 10); return t && Date.now() - t < DAY; };
  const busy = () => document.body.classList.contains('locked') || document.body.classList.contains('cart-open');
  let opener = null;

  function open() {
    if (recent(SEEN_KEY) || recent(SPIN_KEY) || busy()) return;
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch (_) { /* still shows once per visit */ }
    opener = document.activeElement;
    pop.hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => { pop.classList.add('open'); go.focus({ preventScroll: true }); });
  }
  function close() {
    pop.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { pop.hidden = true; }, 220);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  pop.addEventListener('click', e => { if (e.target === pop || e.target.closest('[data-spinpop-close]')) close(); });
  document.addEventListener('keydown', e => {
    if (pop.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {                                   // keep focus inside the popup
      const f = [...card.querySelectorAll('button')], first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  go.addEventListener('click', () => {
    close();
    const sec = document.getElementById('spin');
    if (!sec) return;
    sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { if (typeof doSpin === 'function') doSpin(); }, 700);   // they asked to spin: start it once the wheel is in view
  });

  setTimeout(function wait() { if (busy() && !recent(SEEN_KEY)) { setTimeout(wait, 4000); return; } open(); }, DELAY);
})();
