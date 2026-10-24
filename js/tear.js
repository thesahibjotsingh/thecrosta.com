// ── TICKET DETACH ──
// Tapping a ticket makes its stub pull away from the dotted line and fall off, then
// the offer sheet opens (it opens while the stub is still dropping — the tap never
// waits on the animation). Tickets with a stub on the left drop sideways-down; the small
// cards with a band on top drop off their right edge. Reduced motion: the stub just
// dims for an instant. Never after a swipe on the phone stack.
//
// Motion: tool = WAAPI on transform/opacity. The fall uses linear easing between
// keyframes whose distances grow (2 → 26 → 76 → 130px) so it accelerates like
// gravity without an ease-in curve. 440ms total, sheet at 200ms.
(function () {
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  document.addEventListener('click', e => {
    const hit = e.target.closest('[data-offer]'); if (!hit) return;
    const ticket = hit.closest('.ticket'); if (!ticket || !ticket.dataset.offer) return;   // only real tickets
    if (busy || !ticket.animate) return;                                                    // normal behaviour: just open
    if (window.deckMoved && window.deckMoved()) return;                                    // that was a swipe, not a tap
    const stub = ticket.querySelector('.stub'), body = ticket.querySelector('.tbody');
    if (!stub || !body) return;
    e.stopPropagation(); e.preventDefault();
    busy = true;
    detach(ticket, stub, body, e.target.closest('button') || ticket);
  }, true);

  function detach(ticket, stub, body, trigger) {
    const reduced = calm();
    const sideways = getComputedStyle(ticket).gridTemplateColumns.trim().split(/\s+/).length > 1;

    if (reduced) {                                           // gentler, not nothing: a brief dim, no movement
      stub.animate([{ opacity: 1 }, { opacity: .35 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
      setTimeout(() => { if (typeof openOffer === 'function') openOffer(ticket.dataset.offer, trigger); busy = false; }, 120);
      return;
    }

    ticket.style.overflow = 'visible';                       // let the stub leave the ticket's rounded clip
    ticket.style.zIndex = 5;
    stub.style.borderRadius = sideways ? '14px 0 0 14px' : '14px 14px 0 0';
    stub.style.boxShadow = '3px 4px 0 rgba(26,26,24,.28)';   // now it is a loose piece of paper
    stub.style.transformOrigin = sideways ? '100% 100%' : '0% 100%';

    const frames = sideways ? [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(-4px,-3px) rotate(-3deg)', opacity: 1, offset: .14 },     // lets go of the perforation
      { transform: 'translate(-9px,2px) rotate(-8deg)', opacity: 1, offset: .3 },
      { transform: 'translate(-14px,26px) rotate(-18deg)', opacity: 1, offset: .52 },   // gravity takes over
      { transform: 'translate(-20px,76px) rotate(-30deg)', opacity: .6, offset: .76 },
      { transform: 'translate(-26px,130px) rotate(-40deg)', opacity: 0, offset: 1 }
    ] : [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(3px,-5px) rotate(2deg)', opacity: 1, offset: .14 },
      { transform: 'translate(9px,-4px) rotate(6deg)', opacity: 1, offset: .3 },
      { transform: 'translate(20px,22px) rotate(12deg)', opacity: 1, offset: .52 },
      { transform: 'translate(34px,70px) rotate(20deg)', opacity: .6, offset: .76 },
      { transform: 'translate(46px,120px) rotate(28deg)', opacity: 0, offset: 1 }
    ];
    stub.animate(frames, { duration: 440, easing: 'linear', fill: 'forwards' });

    // the body recoils a touch as the tension releases
    body.animate([{ transform: 'translate(0,0)' }, { transform: sideways ? 'translateX(4px)' : 'translateY(3px)' }, { transform: 'translate(0,0)' }],
      { duration: 240, delay: 40, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    if (navigator.vibrate) navigator.vibrate(12);

    setTimeout(() => { if (typeof openOffer === 'function') openOffer(ticket.dataset.offer, trigger); }, 200);
    setTimeout(() => {                                       // back in place, out of sight behind the sheet
      stub.getAnimations().forEach(a => a.cancel());
      ticket.style.overflow = ''; ticket.style.zIndex = '';
      stub.style.borderRadius = ''; stub.style.boxShadow = ''; stub.style.transformOrigin = '';
      busy = false;
    }, 1100);
  }
})();
