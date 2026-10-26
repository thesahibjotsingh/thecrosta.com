/**
 * CoinSound.js: a synthesised coin shower, no audio files.
 * Web Audio makes short metallic clinks (two bell-like partials and a touch of filtered noise) scattered over ~2.4s.
 * Always on. Browsers only allow sound after the visitor has tapped something; the spin itself is that tap
 * (primeSound runs from it), so the win always has its sound unless the device itself is muted.
 */
let ctx = null;

function audio() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ctx = new AC(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
/** Call from a tap handler (the spin) so the browser lets sound through later. */
export function primeSound() { audio(); }

function clink(c, when, pitch, level) {
  const out = c.createGain(); out.gain.setValueAtTime(0.0001, when);
  out.gain.exponentialRampToValueAtTime(level, when + 0.004); out.gain.exponentialRampToValueAtTime(0.0001, when + 0.16 + Math.random() * 0.1);
  out.connect(c.destination);
  [1, 2.76, 5.4].forEach((m, i) => {                       // bell-like partials
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(pitch * m, when);
    const g = c.createGain(); g.gain.value = [1, 0.5, 0.22][i]; o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.3);
  });
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate), d = buf.getChannelData(0);   // the "tss" of metal on metal
  for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
  const n = c.createBufferSource(); n.buffer = buf;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5500;
  const ng = c.createGain(); ng.gain.value = 0.5; n.connect(hp); hp.connect(ng); ng.connect(out); n.start(when);
}

/** A shower of clinks: dense at first, thinning out as the coins land. */
export function playCoinShower(durationMs = 2400) {
  const c = audio(); if (!c) return;
  const now = c.currentTime, n = 46;
  for (let i = 0; i < n; i++) {
    const u = Math.pow(Math.random(), 1.6);                // bias toward the start
    clink(c, now + u * (durationMs / 1000), 1500 + Math.random() * 2200, 0.05 + Math.random() * 0.05);
  }
}
