/**
 * index.js: mounts the daily-spin slot machine on the page.
 *
 * Glue only. The 3D drawing is SlotMachineEngine.js, the rules and the 24h lock are SlotMachineLogic.js,
 * and the look is SlotMachine.css. This file connects them to the page's elements (the Spin button, the
 * "View my prize" link and the result dialog).
 *
 * The page provides (see js/spin-3d-boot.js):
 *   window.CROSTA_CONFIG            { SHOP_NUMBER, LOCK_MS, STORAGE_KEY }
 *   window.crostaAddFreeItemToCart  (item) => boolean | Promise<boolean>   put a ₹0 item in the cart
 *   window.crostaBuildWhatsAppUrl   (prizeName) => url                      the "Claim on WhatsApp" link
 *   window.onCrostaWin              (detail) => void                        optional, called on every win
 */
import { createSlotMachineEngine } from './SlotMachineEngine.js';
import { startCoinSplash } from './CoinSplash.js';
import { playCoinShower, primeSound } from './CoinSound.js';
import { SYMBOLS, WEIGHT_MATRIX, simulate, createGameController } from './SlotMachineLogic.js';

const DEFAULTS = { SHOP_NUMBER: '91XXXXXXXXXX', LOCK_MS: 24 * 60 * 60 * 1000, STORAGE_KEY: 'crosta_daily_spin_v1' };

export function mountSlotMachine() {
  const $ = id => document.getElementById(id);
  const container = $('machineWrap');
  if (!container || container.dataset.mounted) return null;
  container.dataset.mounted = '1';

  const config = Object.assign({}, DEFAULTS, window.CROSTA_CONFIG);
  window.CROSTA_CONFIG = config;

  const spinBtn = $('spinBtn'), spinLabel = spinBtn.querySelector('.c3d-spin-label') || spinBtn, viewBtn = $('viewPrize'), modal = $('modal'), srEl = $('srStatus');
  const reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ctrl = null;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  /* ---------- the page side: everything the controller needs from the DOM ---------- */
  let lastFocus = null, onCloseCb = null;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const ui = {
    setButton({ label, disabled, busy }) {
      if (spinLabel.textContent !== label) spinLabel.textContent = label;
      spinBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      spinBtn.classList.toggle('c3d-busy', busy);
      const stage = spinBtn.closest('.c3d-stage'); if (stage) stage.classList.toggle('is-locked', disabled && !busy);   // hides the "tap to play" hint while locked
    },
    setViewPrize(show) { viewBtn.hidden = !show; },

    /** The win moment: coins across the whole screen from the tray, the sound, a buzz. */
    celebrate() {
      try { if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 30, 50, 160]); } catch (e) { /* needs a tap first */ }
      playCoinShower();
      if (reducedMotion || !engine) return;
      startCoinSplash({ origin: engine.getTrayPoint(), lowEnd });
    },
    say(text) { srEl.textContent = ''; setTimeout(() => { srEl.textContent = text; }, 30); },

    /** Shows the result card: a win (WhatsApp + optional cart button) or "not this time". */
    openResult({ prize, cartAdded, whatsappUrl, addToCart, onClose }) {
      lastFocus = document.activeElement; onCloseCb = onClose;
      const actions = $('mActions'); actions.textContent = '';
      $('mError').hidden = true;
      if (!prize.win) {
        $('mIcon').textContent = 'Daily spin';
        $('mTitle').textContent = 'Not this time';
        $('mPrize').textContent = prize.name; $('mStub').textContent = 'No win';
        $('mTicket').hidden = false; $('mTicket').classList.add('is-muted');
        $('mBody').textContent = 'No prize on this spin. Your next free spin is in 24 hours.';
        $('mNote').textContent = 'One free spin every 24 hours';
        const b = el('button', 'c3d-btn c3d-ghost', 'Close'); b.type = 'button'; b.addEventListener('click', () => ui.closeResult());
        actions.appendChild(b);
      } else {
        $('mIcon').textContent = 'Daily spin · winner';
        $('mTitle').textContent = 'You won';
        $('mPrize').textContent = prize.name; $('mStub').textContent = 'Winner';
        $('mTicket').hidden = false; $('mTicket').classList.remove('is-muted');
        $('mBody').textContent = 'Tap below to claim it on WhatsApp' + (prize.cart ? ', or add it straight to your cart.' : '.');
        $('mNote').textContent = 'Valid on orders of ₹100+ · one free spin every 24 hours';
        if (prize.choose && typeof window.crostaPrizeActions === 'function') {
          // a free topping / drink: the page offers the pick (or lets them do it later from the menu)
          $('mBody').textContent = prize.choose === 'topping' ? 'One veggie topping is on us (₹0) on any pizza.' : 'A 250 ml drink is on us (₹0).';
          window.crostaPrizeActions(prize, actions, { close: () => ui.closeResult(), say: ui.say });
        } else {
          const wa = el('a', 'c3d-btn c3d-wa', 'Claim on WhatsApp');
          wa.href = whatsappUrl; wa.target = '_blank'; wa.rel = 'noopener noreferrer';
          actions.appendChild(wa);
        }
        if (prize.cart) {          // ONLY fries, garlic bread, cold drink, extra topping
          const cb = el('button', 'c3d-btn c3d-cart', cartAdded ? 'Added to cart ✓' : 'Add free item to cart'); cb.type = 'button';
          if (cartAdded) cb.disabled = true;
          cb.addEventListener('click', () => {
            cb.disabled = true; $('mError').hidden = true;
            addToCart().then(() => { cb.textContent = 'Added to cart ✓'; }).catch(() => {
              cb.disabled = false;
              $('mError').textContent = 'Could not add it to your cart. Please claim it on WhatsApp instead.'; $('mError').hidden = false;
            });
          });
          actions.appendChild(cb);
        }
        const cl = el('button', 'c3d-btn c3d-ghost', 'Close'); cl.type = 'button'; cl.addEventListener('click', () => ui.closeResult());
        actions.appendChild(cl);
      }
      cancelMorph();
      modal.hidden = false;
      runMorph();
      const first = actions.querySelector('a,button'); if (first) first.focus({ preventScroll: true });
    },

    closeResult(silent) {
      if (modal.hidden) return;
      cancelMorph();
      modal.hidden = true;
      if (!silent) {
        const cb = onCloseCb; onCloseCb = null; if (cb) cb();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
    }
  };

  /* ---------- the 3D side ---------- */
  let engine;

  /* ---------- the ticket becomes the dialog ---------- */
  // The 3D ticket in the tray is swapped for a flat copy of it. The copy flies onto the dialog's prize strip, and
  // the dialog card grows out of that strip (clip-path), so the pop-up is literally the ticket opening up.
  // Only transform, opacity and clip-path move. Skipped for reduced motion, and if the ticket can't be located.
  const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  let morphAnims = [], ghostEl = null;
  function cancelMorph() {
    morphAnims.forEach(a => { try { a.cancel(); } catch (e) { /* already done */ } });
    morphAnims = [];
    if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    const card = modal.querySelector('.c3d-card'); if (card) card.style.opacity = '';
    modal.classList.remove('is-morph');
    if (engine) engine.hideTicket(false);
  }
  function runMorph() {
    if (reducedMotion || !engine) return;
    const strip = $('mTicket'), card = modal.querySelector('.c3d-card');
    const from = engine.getTicketRect(), face = engine.getTicketFace();
    if (!from || !face || from.width < 8 || strip.hidden) return;
    modal.classList.add('is-morph');
    const cr = card.getBoundingClientRect(), sr = strip.getBoundingClientRect();
    engine.hideTicket(true);

    const g = document.createElement('div'); g.className = 'c3d-flyer';
    g.style.cssText = 'left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px;background-image:url(' + face + ')';
    document.body.appendChild(g); ghostEl = g;
    const dx = (sr.left + sr.width / 2) - (from.left + from.width / 2), dy = (sr.top + sr.height / 2) - (from.top + from.height / 2), k = sr.height / from.height;
    morphAnims.push(g.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')' }], { duration: 460, easing: EASE, fill: 'forwards' }));
    morphAnims.push(g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 380, easing: 'ease-out', fill: 'forwards' }));

    // the card opens out from the strip's own box
    const t = sr.top - cr.top, l = sr.left - cr.left, r = cr.right - sr.right, b = cr.bottom - sr.bottom;
    morphAnims.push(card.animate([{ clipPath: 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round 14px)' }, { clipPath: 'inset(0px 0px 0px 0px round 22px)' }], { duration: 520, delay: 300, easing: EASE, fill: 'both' }));
    morphAnims.push(card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: 300, easing: 'ease-out', fill: 'both' }));
    [...card.children].filter(c => c !== strip && !c.hidden).forEach((c, i) => {
      morphAnims.push(c.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, delay: 500 + i * 40, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both' }));
    });
    Promise.all(morphAnims.map(a => a.finished)).then(() => {   // settled: drop the effects, keep the natural state
      morphAnims.forEach(a => { try { a.cancel(); } catch (e) { /* gone */ } }); morphAnims = [];
      if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    }).catch(() => { /* cancelled by a close: cancelMorph has already tidied up */ });
  }

  try {
    engine = createSlotMachineEngine(container, {
      symbols: SYMBOLS,
      reducedMotion,
      canPull: () => !!ctrl && !ctrl.isLocked() && !ctrl.isSpinning(),
      onClick: () => {                                          // a click or tap anywhere on the machine
        if (!ctrl || ctrl.isSpinning()) return;
        if (ctrl.isLocked()) { ctrl.refresh(); engine.shake(); return; }   // locked: shake only, no game maths
        primeSound(); ctrl.requestSpin();
      },
      onLeverPull: () => { primeSound(); if (ctrl) ctrl.requestSpin(); }       // the lever was dragged (or tapped) far enough
    });
  } catch (err) {
    container.innerHTML = '<p class="c3d-loading">Your browser could not start 3D graphics (WebGL). Please try another browser.</p>';
    spinBtn.setAttribute('aria-disabled', 'true');
    return null;
  }

  /* ---------- the game ---------- */
  ctrl = createGameController({ engine, ui, config });

  spinBtn.addEventListener('click', () => { primeSound(); ctrl.requestSpin(); });
  viewBtn.addEventListener('click', () => ctrl.viewPrize());
  $('mClose').addEventListener('click', () => ui.closeResult());
  modal.addEventListener('click', e => { if (e.target === modal) ui.closeResult(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ui.closeResult();
    if (e.key === 'Tab' && !modal.hidden) {                    // keep focus inside the dialog
      const f = Array.from(modal.querySelectorAll('button:not([disabled]),a[href]'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('storage', e => { if (e.key === config.STORAGE_KEY) ctrl.refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ctrl.refresh(); });

  window.CrostaSpin = { simulate, weightMatrix: WEIGHT_MATRIX };   // dev: CrostaSpin.simulate(100000) checks the odds
  ctrl.start();
  return { engine, ctrl };
}

mountSlotMachine();
