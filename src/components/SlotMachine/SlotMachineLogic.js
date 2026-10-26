/**
 * SlotMachineLogic.js
 *
 * Everything that decides what happens, with no 3D and no markup:
 *   1. the prize table and the fixed odds (a weight matrix of exactly 80 slots)
 *   2. the browser-side lock: one valid spin per 24 hours, stored with a signature so
 *      hand-edited records are rejected
 *   3. the game controller (state machine) that ties an "engine" (3D) and a "ui" (buttons,
 *      dialog) together and fires the site hooks (cart, WhatsApp, window.onCrostaWin)
 *
 * The outcome is rolled ONCE, the instant a spin starts, and the 3D reels are only told
 * where to stop. Nothing in the animation can change the result.
 */

/* ====================================================================
   1. PRIZES AND ODDS
   ==================================================================== */

/** Faces on each reel, in order around the cylinder. Index = face number. */
export const SYMBOLS = ['\u{1F355}', '\u{1F35F}', '\u{1F9C4}', '\u{1F964}', '\u{1F3F7}️', '\u{1F504}', '❌']; // pizza, fries, garlic, drink, tag, retry, cross

/** weight = number of slots out of 80. `symbol` = the face the three reels land on. */
export const PRIZES = {
  loss:    { id: 'loss',    name: 'Better luck next time', weight: 55, win: false },
  off20:   { id: 'off20',   name: '20% Off',               weight: 4,  win: true,  symbol: '\u{1F3F7}️', cart: false },
  drink:   { id: 'drink',   name: 'Free Cold Drink',       weight: 4,  win: true,  symbol: '\u{1F964}',       cart: false, choose: 'drink' },
  off10:   { id: 'off10',   name: '10% Off',               weight: 4,  win: true,  symbol: '\u{1F3F7}️', cart: false },
  fries:   { id: 'fries',   name: 'Free Fries',            weight: 3,  win: true,  symbol: '\u{1F35F}',       cart: true, sku: 'free-fries' },
  topping: { id: 'topping', name: 'Extra Topping',         weight: 3,  win: true,  symbol: '\u{1F355}',       cart: false, choose: 'topping' },
  again:   { id: 'again',   name: 'Lucky Spin Again',      weight: 3,  win: false, retry: true, symbol: '\u{1F504}' },
  garlic:  { id: 'garlic',  name: 'Free Garlic Bread',     weight: 2,  win: true,  symbol: '\u{1F9C4}',       cart: true, sku: 'free-garlic-bread' },
  cheese:  { id: 'cheese',  name: 'Double Cheese',         weight: 2,  win: true,  symbol: '\u{1F355}',       cart: false }
};
export const ORDER = ['loss', 'off20', 'drink', 'off10', 'fries', 'topping', 'again', 'garlic', 'cheese'];

/** When each of the three reels hard-stops, in ms after the spin starts. */
export const REEL_STOP_MS = [2200, 2900, 3500];

/** One slot per weight point. A single random index into this array picks the prize. */
export const WEIGHT_MATRIX = Object.freeze(ORDER.reduce((arr, id) => {
  for (let i = 0; i < PRIZES[id].weight; i++) arr.push(id);
  return arr;
}, []));
if (WEIGHT_MATRIX.length !== 80) throw new Error('Weight matrix must total 80, got ' + WEIGHT_MATRIX.length);

const hasCrypto = typeof crypto !== 'undefined' && crypto.getRandomValues;
/** Unbiased random integer in [0, max): crypto when available, rejection-sampled so no value is favoured. */
export function randInt(max) {
  if (!hasCrypto) return Math.floor(Math.random() * max);
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % max;
}

/** Picks the prize id. Called once per spin. */
export function rollOutcome() { return WEIGHT_MATRIX[randInt(WEIGHT_MATRIX.length)]; }

/** The face index each of the 3 reels must stop on for a prize. A loss is any mixed line (never three alike). */
export function facesFor(outcomeId) {
  const p = PRIZES[outcomeId];
  if (p.symbol) { const i = SYMBOLS.indexOf(p.symbol); return [i, i, i]; }
  let f;
  do { f = [randInt(SYMBOLS.length), randInt(SYMBOLS.length), randInt(SYMBOLS.length)]; }
  while (f[0] === f[1] && f[1] === f[2]);
  return f;
}

/** Dev helper: Logic odds check, e.g. CrostaSpin.simulate(100000) in the console. */
export function simulate(n) {
  const counts = {};
  ORDER.forEach(id => { counts[id] = 0; });
  for (let i = 0; i < n; i++) counts[rollOutcome()]++;
  const out = {};
  ORDER.forEach(id => { out[id] = { count: counts[id], pct: +(counts[id] / n * 100).toFixed(2), target: +(PRIZES[id].weight / 80 * 100).toFixed(2) }; });
  return out;
}

/* ====================================================================
   2. THE 24-HOUR LOCK (anti-cheat)
   ==================================================================== */

/** Creates the lock store for a config { STORAGE_KEY, LOCK_MS }. */
export function createLockStore(cfg) {
  const mem = { v: null };            // fallback when localStorage is blocked (private mode)
  const lsGet = () => { try { return localStorage.getItem(cfg.STORAGE_KEY); } catch (e) { return mem.v; } };
  const lsSet = v => { mem.v = v; try { localStorage.setItem(cfg.STORAGE_KEY, v); } catch (e) { /* in-memory copy still applies */ } };
  const lsDel = () => { mem.v = null; try { localStorage.removeItem(cfg.STORAGE_KEY); } catch (e) { /* nothing to remove */ } };

  // small checksum so a hand-edited record is rejected
  function sign(t, p) {
    let h = 0x811c9dc5;
    const s = t + '|' + p + '|' + cfg.STORAGE_KEY + '|cr0sta';
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }

  /** Writes the lock at spin time (not after the animation) so a refresh cannot re-roll. */
  function recordSpin(prizeId, now) { lsSet(JSON.stringify({ t: now, p: prizeId, s: sign(now, prizeId) })); }

  function markCartAdded() {
    try { const r = JSON.parse(lsGet()); r.c = 1; lsSet(JSON.stringify(r)); } catch (e) { /* ignore */ }
  }

  /** Reads and validates the lock. Runs before anything is rendered or calculated. */
  function getLock(now) {
    const raw = lsGet();
    if (!raw) return { locked: false };
    let rec = null;
    try { rec = JSON.parse(raw); } catch (e) { /* corrupt */ }
    if (!rec || typeof rec.t !== 'number' || !PRIZES[rec.p] || rec.s !== sign(rec.t, rec.p)) {
      recordSpin('loss', now);                 // tampered or corrupt: start a fresh 24h lock
      return getLock(now);
    }
    const elapsed = Math.max(0, now - rec.t);  // a clock set backwards = full lock, never longer than LOCK_MS
    if (elapsed >= cfg.LOCK_MS) { lsDel(); return { locked: false }; }
    return { locked: true, remaining: cfg.LOCK_MS - elapsed, prizeId: rec.p, cartAdded: !!rec.c, at: rec.t };
  }

  return { recordSpin, markCartAdded, getLock };
}

/** "23h 59m" */
export function formatRemaining(ms) {
  const mins = Math.max(1, Math.floor((ms - 1) / 60000));
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

/* ====================================================================
   3. THE GAME CONTROLLER
   ==================================================================== */

/** Fires a window event the rest of the site can listen to (analytics, nav dots). */
const emit = (name, detail) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) { /* never block the game */ } };

/**
 * @param {object} deps
 * @param {object} deps.engine  3D side (see SlotMachineEngine.js): spinReels, setReelFaces, pullLever, shake,
 *                              setMarquee, setWinGlow, setTicket, dropTicket, burstCoins, burstSparkles
 * @param {object} deps.ui      page side (see index.js): setButton, setViewPrize, say, openResult, closeResult
 * @param {object} deps.config  CROSTA_CONFIG: { STORAGE_KEY, LOCK_MS, ... }
 */
export function createGameController({ engine, ui, config }) {
  const locks = createLockStore(config);
  const state = { phase: 'IDLE', outcome: null, winGlow: false, ticket: null, resultHold: null, freeRetry: false, lock: { locked: false } };
  let holdTimer = null, autoSpinTimer = null, modalTimer = null, refreshTimer = null;

  /* ---- what the electronic marquee should say right now ---- */
  function marquee() {
    if (state.phase === 'SPINNING') return { text: 'GOOD LUCK...', tone: 'spin' };
    if (state.resultHold) return state.resultHold;
    if (state.lock.locked) return { text: 'NEXT SPIN IN ' + formatRemaining(state.lock.remaining).toUpperCase(), tone: 'lock' };
    return { text: 'SPIN TO WIN', tone: 'idle' };
  }

  /** Re-reads the lock and brings buttons, marquee, ticket and glow in line with the state. */
  function refresh() {
    const lock = locks.getLock(Date.now());
    state.lock = lock;
    if (!lock.locked && state.ticket && !state.resultHold && state.phase === 'IDLE') { state.ticket = null; state.winGlow = false; engine.setTicket(null); }

    let label, disabled = false, busy = false;
    if (state.phase === 'SPINNING') { label = state.freeRetry ? 'Free spin...' : 'Spinning...'; busy = true; disabled = true; }
    else if (lock.locked) { label = 'Next spin in ' + formatRemaining(lock.remaining); disabled = true; }
    else label = 'Spin';
    ui.setButton({ label, disabled, busy });

    const showView = lock.locked && state.phase !== 'SPINNING' && !!PRIZES[lock.prizeId] && PRIZES[lock.prizeId].win;
    ui.setViewPrize(showView);

    // after a page reload: put the winning reels and the resting ticket back
    if (showView && !state.ticket && !state.resultHold) {
      const p = PRIZES[lock.prizeId];
      state.ticket = { prize: p };
      engine.setReelFaces(facesFor(p.id));
      engine.setTicket(p);
    }
    engine.setMarquee(marquee());
    engine.setWinGlow(state.winGlow);
  }

  /* ---- spin flow ---- */
  function requestSpin() {
    if (state.phase === 'SPINNING') return;                                  // already running: ignore
    if (locks.getLock(Date.now()).locked) { refresh(); engine.shake(); return; }   // locked: shake only, NO game maths
    startSpin(false);
  }

  function startSpin(isFreeRetry) {
    clearTimeout(autoSpinTimer); clearTimeout(holdTimer); clearTimeout(modalTimer);
    ui.closeResult(true);
    state.resultHold = null; state.winGlow = false; state.ticket = null; state.freeRetry = !!isFreeRetry;
    engine.setTicket(null);
    state.phase = 'SPINNING';

    // 1) THE OUTCOME IS DECIDED AND LOCKED HERE, BEFORE ANY ANIMATION
    const outcome = rollOutcome();
    state.outcome = outcome;
    if (!PRIZES[outcome].retry) { locks.recordSpin(outcome, Date.now()); emit('crosta-spin'); }   // "Lucky Spin Again" never counts
    emit('crosta:spin-start', { retry: !!isFreeRetry, prizeId: outcome });

    // 2) the reels only travel to the predetermined faces: 2.2s / 2.9s / 3.5s
    engine.pullLever();
    engine.spinReels(facesFor(outcome), REEL_STOP_MS, settle);
    ui.say('Spinning');
    refresh();
  }

  function settle() {
    const prize = PRIZES[state.outcome];
    state.phase = 'IDLE';
    emit('crosta:spin-end', { prizeId: prize.id, win: !!prize.win });

    if (prize.retry) {                                       // three 🔄: instant free re-spin, no lock
      state.freeRetry = true;
      state.resultHold = { text: 'FREE SPIN!', tone: 'win' }; state.winGlow = true;
      engine.burstSparkles(40); ui.say('Lucky spin again. You get a free retry.');
      autoSpinTimer = setTimeout(() => startSpin(true), 1600);
      refresh(); return;
    }
    state.freeRetry = false;
    if (prize.win) {
      state.resultHold = { text: 'YOU WON!', tone: 'win' }; state.winGlow = true;
      state.ticket = { prize };
      engine.dropTicket(prize);                              // the ticket travels down into the tray
      engine.burstSparkles(150);
      engine.burstCoins();                                   // gold coins out of the prize tray
      ui.celebrate();                                        // the full-screen coin splash, the sound, the buzz
      ui.say('You won ' + prize.name);
      notifyWin(prize);
      modalTimer = setTimeout(() => openResult(prize.id), 1600);   // the ticket has landed in the tray: it now grows into the dialog
    } else {
      state.resultHold = { text: 'BETTER LUCK NEXT TIME', tone: 'lose' };
      state.ticket = { prize };
      engine.dropTicket({ ...prize, muted: true });          // a muted ticket slides out; no coins
      ui.say('Not this time. Your next free spin is in 24 hours.');
      modalTimer = setTimeout(() => openResult('loss'), 1500);
    }
    refresh();
  }

  /** Tells the rest of the site about a win: window.onCrostaWin(detail) and a 'crosta:win' event. */
  function notifyWin(prize) {
    const detail = { prizeId: prize.id, name: prize.name, cart: !!prize.cart, choose: prize.choose || null, sku: prize.sku || null, timestamp: Date.now() };
    try { if (typeof window.onCrostaWin === 'function') window.onCrostaWin(detail); } catch (e) { /* a broken hook must not break the game */ }
    emit('crosta:win', detail);
  }

  function endResultHold() {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { state.resultHold = null; state.winGlow = false; refresh(); }, 2500);
  }

  /* ---- result card ---- */
  function openResult(prizeId) {
    const prize = PRIZES[prizeId];
    ui.openResult({
      prize,
      cartAdded: locks.getLock(Date.now()).cartAdded,
      whatsappUrl: prize.win ? window.crostaBuildWhatsAppUrl(prize.name) : null,
      addToCart: () => addFreeItem(prize),
      onClose: () => { if (state.resultHold) endResultHold(); }
    });
  }

  /**
   * "Add free item to cart" (only fries, garlic bread, cold drink, extra topping). Calls the site's
   * cart handler, and also broadcasts 'crosta:add-free-item' so any other script can react.
   * Resolves true when the cart accepted it.
   */
  function addFreeItem(prize) {
    const item = { id: prize.sku, name: prize.name, price: 0, quantity: 1, source: 'crosta-daily-spin', prizeId: prize.id, timestamp: Date.now() };
    let res;
    try { res = window.crostaAddFreeItemToCart(item); } catch (e) { res = false; }
    return Promise.resolve(res).then(ok => {
      if (ok === false) throw new Error('refused');
      locks.markCartAdded();
      emit('crosta:add-free-item', item);
      ui.say(prize.name + ' added to cart');
      return true;
    });
  }

  /* ---- public ---- */
  return {
    state,
    start() { refresh(); refreshTimer = setInterval(refresh, 1000); },   // keeps "Next spin in 23h 59m" fresh and auto-unlocks
    refresh,
    requestSpin,
    viewPrize() { const l = locks.getLock(Date.now()); if (l.locked) openResult(l.prizeId); },
    isLocked: () => locks.getLock(Date.now()).locked,
    isSpinning: () => state.phase === 'SPINNING',
    destroy() { clearInterval(refreshTimer); clearTimeout(autoSpinTimer); clearTimeout(holdTimer); clearTimeout(modalTimer); }
  };
}
