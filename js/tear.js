// ── TICKET DETACH ──
// Tapping a ticket makes its stub rip off along the dotted line: both pieces get a
// ragged torn edge, the stub hangs from one corner for a beat, then drops away. The offer
// sheet opens while the stub is still falling (the tap never waits on the animation).
// Left-stub tickets rip sideways-down; the small cards with a band on top rip off to the
// right. Reduced motion: the stub only dims for an instant. Never after a swipe on the phone stack.
//
// Motion: WAAPI on transform/opacity. The fall uses linear easing between keyframes whose
// distances grow (2 → 26 → 76 → 130px) so it accelerates like gravity without an ease-in curve.
// 440ms total, sheet at 200ms. The torn edges are a clip-path zig-zag on each piece, and one
// chained drop-shadow on the ticket redraws the outline and the offset shadow around both pieces.
(function () {
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = '#1A1A18', PAPER = '#FFFCF6';
  const TEETH = 14, DEPTH = 5, GAP = 2;
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

  // zig-zag polygon for the edge that was torn. `edge` is the side of THIS piece that touches the tear.
  function zig(edge, inset) {
    const pts = [];
    for (let i = 0; i <= TEETH; i++) {
      const p = (i / TEETH * 100).toFixed(2) + '%';
      const d = i % 2 ? inset + DEPTH : inset;                       // alternate in/out
      if (edge === 'right')  pts.push(`calc(100% - ${d}px) ${p}`);
      if (edge === 'left')   pts.push(`${d}px ${p}`);
      if (edge === 'bottom') pts.push(`${p} calc(100% - ${d}px)`);
      if (edge === 'top')    pts.push(`${p} ${d}px`);
    }
    // order the points so the polygon closes around the piece
    if (edge === 'right')  return `polygon(0 0, ${pts.join(', ')}, 0 100%)`;
    if (edge === 'left')   return `polygon(${pts.join(', ')}, 100% 100%, 100% 0)`;
    if (edge === 'bottom') return `polygon(0 0, 100% 0, ${pts.slice().reverse().join(', ')})`;
    return `polygon(${pts.join(', ')}, 100% 100%, 0 100%)`;
  }

  function detach(ticket, stub, body, trigger) {
    const sideways = getComputedStyle(ticket).gridTemplateColumns.trim().split(/\s+/).length > 1;

    if (calm()) {                                            // gentler, not nothing: a brief dim, no movement
      stub.animate([{ opacity: 1 }, { opacity: .35 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
      setTimeout(() => { if (typeof openOffer === 'function') openOffer(ticket.dataset.offer, trigger); busy = false; }, 120);
      return;
    }

    const saved = { t: ticket.getAttribute('style'), s: stub.getAttribute('style'), b: body.getAttribute('style') };
    const ember = ticket.classList.contains('primary') ? ' drop-shadow(5px 5px 0 #D35400)' : '';
    const stubBg = getComputedStyle(stub).backgroundColor;

    // 1. the ticket stops being one rounded box and becomes two pieces, outlined by filter
    ticket.style.overflow = 'visible';
    ticket.style.zIndex = 5;
    ticket.style.background = 'transparent';
    ticket.style.borderColor = 'transparent';
    ticket.style.boxShadow = 'none';
    ticket.style.filter = `drop-shadow(1.5px 0 0 ${INK}) drop-shadow(-1.5px 0 0 ${INK}) drop-shadow(0 1.5px 0 ${INK}) drop-shadow(0 -1.5px 0 ${INK})${ember}`;
    body.style.background = PAPER;
    stub.style.background = (stubBg === 'rgba(0, 0, 0, 0)' || stubBg === 'transparent') ? PAPER : stubBg;
    if (sideways) {
      stub.style.borderRadius = '14px 0 0 14px'; body.style.borderRadius = '0 14px 14px 0';
      stub.style.clipPath = zig('right', 0); body.style.clipPath = zig('left', GAP);
      stub.style.borderRight = '0';
      stub.style.transformOrigin = '100% 100%';              // hangs from the bottom of the tear
    } else {
      stub.style.borderRadius = '14px 14px 0 0'; body.style.borderRadius = '0 0 14px 14px';
      stub.style.clipPath = zig('bottom', 0); body.style.clipPath = zig('top', GAP);
      stub.style.borderBottom = '0';
      stub.style.transformOrigin = '0% 100%';
    }

    // 2. the stub pulls away, hangs for a beat, then falls
    const frames = sideways ? [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(-4px,-3px) rotate(-3deg)', opacity: 1, offset: .14 },     // lets go of the perforation
      { transform: 'translate(-9px,2px) rotate(-8deg)', opacity: 1, offset: .3 },       // hangs by its bottom corner
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

    // the rest of the ticket recoils a touch as the tension releases
    body.animate([{ transform: 'translate(0,0)' }, { transform: sideways ? 'translateX(4px)' : 'translateY(3px)' }, { transform: 'translate(0,0)' }],
      { duration: 240, delay: 40, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    if (navigator.vibrate) navigator.vibrate(12);

    setTimeout(() => { if (typeof openOffer === 'function') openOffer(ticket.dataset.offer, trigger); }, 200);
    setTimeout(() => {                                       // whole again, out of sight behind the sheet
      stub.getAnimations().forEach(a => a.cancel());
      [[ticket, saved.t], [stub, saved.s], [body, saved.b]].forEach(([el, st]) => st === null ? el.removeAttribute('style') : el.setAttribute('style', st));
      busy = false;
    }, 1100);
  }
})();
