// ── OFFER DECK (phones) ──
// The live offer and the other offers become one stack of cards: the top card
// follows your thumb, a swipe (or flick) sends it to the back and the next one
// comes forward. Dots jump to a card. Desktop keeps the normal grid.
// The cards are rebuilt by home.js (renderLive), which calls setupDeck() each time.
(function () {
  const deck = document.getElementById('deck'), ui = document.getElementById('deckUi'), dotsEl = document.getElementById('deckDots'), hint = document.getElementById('deckHint');
  if (!deck) return;
  const phone = matchMedia('(max-width: 760px)');
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let top = 0, drag = null, moved = false;
  const cards = () => [...deck.querySelectorAll('.ticket')];

  function depths() {
    const cs = cards(), n = cs.length;
    cs.forEach((c, i) => {
      const d = (i - top + n) % n;
      c.dataset.d = d;
      c.setAttribute('aria-hidden', d ? 'true' : 'false');
      if (d) c.setAttribute('inert', ''); else c.removeAttribute('inert');
    });
    [...dotsEl.children].forEach((b, i) => b.setAttribute('aria-current', String(i === top)));
  }

  window.setupDeck = function () {
    const cs = cards(), n = cs.length;
    if (!phone.matches || n < 2) {
      ui.hidden = true;
      cs.forEach(c => { delete c.dataset.d; c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); });
      return;
    }
    top = Math.min(top, n - 1);
    ui.hidden = false;
    if (dotsEl.children.length !== n) {
      dotsEl.innerHTML = Array.from({ length: n }, (_, i) => `<button type="button" aria-label="Show offer ${i + 1} of ${n}"></button>`).join('');
    }
    hint.textContent = `Swipe to see all ${n} offers`;
    depths();
  };
  phone.addEventListener('change', () => window.setupDeck());

  function goTo(i) { top = i; depths(); hint.classList.add('gone'); }
  dotsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) goTo([...dotsEl.children].indexOf(b)); });

  // after a drag, the click that follows must not open the offer sheet
  deck.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);

  deck.addEventListener('pointerdown', e => {
    if (!phone.matches || drag || e.button > 0) return;
    const card = e.target.closest('.ticket[data-d="0"]'); if (!card) return;
    drag = { card, x0: e.clientX, y0: e.clientY, x: e.clientX, t: performance.now(), id: e.pointerId, on: false, v: 0 };
    moved = false;
  });
  deck.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;      // not a horizontal swipe (yet)
      drag.on = true; moved = true; drag.card.classList.add('dragging');
      try { deck.setPointerCapture(e.pointerId); } catch (_) { /* fine without capture */ }
    }
    drag.v = (e.clientX - drag.x) / Math.max(1, performance.now() - drag.t); drag.x = e.clientX; drag.t = performance.now();
    drag.card.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`;
    // the card behind comes forward as this one leaves
    const next = cards().find(c => c.dataset.d === '1');
    if (next) { const k = Math.min(1, Math.abs(dx) / 160); next.style.transition = 'none'; next.style.transform = `translateY(${13 - 13 * k}px) scale(${.95 + .05 * k})`; }
  });
  function end(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { card } = drag, was = drag.on, dx = drag.x - drag.x0, v = drag.v || 0;
    drag = null;
    setTimeout(() => { moved = false; }, 60);                            // the click that follows a drag has fired by now
    cards().forEach(c => { if (c !== card) { c.style.transition = ''; c.style.transform = ''; } });
    if (!was) return;
    card.classList.remove('dragging');
    const away = Math.abs(dx) > 90 || Math.abs(v) > 0.45;
    if (!away) { card.style.transform = ''; return; }                    // not far enough: it springs back
    hint.classList.add('gone');
    const dir = (dx || v) > 0 ? 1 : -1, n = cards().length;
    card.style.transition = calm() ? 'none' : 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 260ms ease';
    card.style.transform = `translateX(${dir * (deck.offsetWidth + 80)}px) rotate(${dir * 14}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
      top = (top + 1) % n;
      card.style.transition = 'none'; card.style.transform = ''; card.style.opacity = '';
      depths();
      void card.offsetWidth;                                             // commit the jump to the back before transitions return
      card.style.transition = '';
    }, calm() ? 0 : 260);
  }
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);
  // ── swipe hint: until they have swiped once, the top card nudges right then left every few seconds ──
  // (only while the stack is on screen; skipped for people who ask for less motion)
  let seen = false, timer = null;
  function wiggle() {
    const card = cards().find(c => c.dataset.d === '0');
    if (!card || drag || hint.classList.contains('gone') || calm() || !phone.matches || !card.animate) return;
    card.animate([
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: 'translateX(26px) rotate(1.6deg)', offset: .22 },
      { transform: 'translateX(-20px) rotate(-1.2deg)', offset: .5 },
      { transform: 'translateX(11px) rotate(.7deg)', offset: .74 },
      { transform: 'translateX(0) rotate(0deg)' }
    ], { duration: 1000, easing: 'cubic-bezier(0.37, 0, 0.63, 1)' });
  }
  function loop() {
    clearTimeout(timer);
    if (!seen || hint.classList.contains('gone')) return;
    wiggle();
    timer = setTimeout(loop, 7000);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      clearTimeout(timer);
      if (seen) timer = setTimeout(loop, 1200);
    }, { threshold: 0.6 }).observe(deck);
  }

  window.deckMoved = () => moved;         // tear.js: a swipe must not count as a tap
  window.setupDeck();    // home.js drew the first cards before this file loaded
})();
