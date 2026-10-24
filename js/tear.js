// ── TICKET TEAR ──
// Tapping a ticket tears its stub off along the dotted line (it swings down and
// fades), then the offer sheet opens. Tickets with a stub on the left tear sideways;
// the small cards with a band on top tear upward. Skipped for reduced motion, and
// never after a swipe on the phone stack. The ticket puts itself back together
// behind the sheet.
(function () {
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  document.addEventListener('click', e => {
    const hit = e.target.closest('[data-offer]'); if (!hit) return;
    const ticket = hit.closest('.ticket'); if (!ticket || !ticket.dataset.offer) return;   // only real tickets
    if (busy || calm() || !ticket.animate) return;                                          // normal behaviour: just open
    if (window.deckMoved && window.deckMoved()) return;                                    // that was a swipe, not a tap
    const stub = ticket.querySelector('.stub'), body = ticket.querySelector('.tbody');
    if (!stub || !body) return;
    e.stopPropagation(); e.preventDefault();
    busy = true;
    tear(ticket, stub, body, e.target.closest('button') || ticket);
  }, true);

  function tear(ticket, stub, body, trigger) {
    const sideways = getComputedStyle(ticket).gridTemplateColumns.trim().split(/\s+/).length > 1;
    ticket.style.overflow = 'visible';
    ticket.style.zIndex = 5;
    stub.style.borderRadius = sideways ? '14px 0 0 14px' : '14px 14px 0 0';
    stub.style.transformOrigin = sideways ? '100% 100%' : '0% 100%';
    const frames = sideways ? [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(-3px,0) rotate(-2.5deg)', opacity: 1, offset: .2 },
      { transform: 'translate(-12px,8px) rotate(-9deg)', opacity: 1, offset: .5 },
      { transform: 'translate(-30px,70px) rotate(-24deg)', opacity: 0, offset: 1 }
    ] : [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(0,-3px) rotate(1.5deg)', opacity: 1, offset: .2 },
      { transform: 'translate(6px,-12px) rotate(5deg)', opacity: 1, offset: .5 },
      { transform: 'translate(24px,-46px) rotate(12deg)', opacity: 0, offset: 1 }
    ];
    stub.animate(frames, { duration: 620, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
    body.animate([{ transform: 'translate(0,0)' }, { transform: sideways ? 'translateX(5px)' : 'translateY(4px)' }, { transform: 'translate(0,0)' }],
      { duration: 300, delay: 80, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    if (navigator.vibrate) navigator.vibrate(12);

    setTimeout(() => { if (typeof openOffer === 'function') openOffer(ticket.dataset.offer, trigger); }, 360);
    setTimeout(() => {                                       // back together, out of sight behind the sheet
      stub.getAnimations().forEach(a => a.cancel());
      ticket.style.overflow = ''; ticket.style.zIndex = ''; stub.style.borderRadius = ''; stub.style.transformOrigin = '';
      busy = false;
    }, 1300);
  }
})();
