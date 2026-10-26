/**
 * SlotMachineEngine.js
 *
 * The Three.js side of the daily-spin machine. No game rules in here: it draws the machine, turns the
 * three reels to the faces it is told, pulls the lever, drops the ticket, throws coins, and reports clicks.
 *
 *   const engine = createSlotMachineEngine(container, { symbols, reducedMotion, canPull, onClick });
 *
 * COLOURS: nothing is hard-coded in the materials. Every colour is read from the page's CSS custom
 * properties (the --spin-* tokens listed in SlotMachine.css) on the container element, so changing the
 * palette in CSS re-colours the 3D machine. The literals below are only last-resort fallbacks.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------- theme: read from CSS custom properties ---------- */
const TOKEN_FALLBACKS = {
  '--spin-body': '#c4500a',        // cabinet lacquer (brand orange)
  '--spin-dark': '#1a1a18',        // inset panels, reel dividers, crest face (brand charcoal)
  '--spin-gold': '#efb327',        // polished trim: bevels, borders, stand, lever bracket, coins
  '--spin-gold-satin': '#d9a01f',
  '--spin-chrome': '#e8e8ee',
  '--spin-accent': '#d35400',      // ticket header, tray felt
  '--spin-ball': '#1a1a18',        // lever ball
  '--spin-paper': '#fdf8f2',       // reel faces and ticket stock
  '--spin-led': '#ffb52e',         // marquee text
  '--spin-led-hot': '#ff8a00',
  '--spin-win': '#fff27a',
  '--spin-lose': '#ff7058',
  '--spin-herb': '#1b7f3b'         // the green flecks on the garlic bread
};
const DEFAULTS = { exposure: 0.8, env: 0.3, coat: 0.3 };   // --spin-exposure / --spin-env (reflection strength) / --spin-clearcoat      // --spin-exposure overrides this (lowers the glare on bright body colours)

function readTheme(el) {
  const cs = getComputedStyle(el);
  const token = name => new THREE.Color(cs.getPropertyValue(name).trim() || TOKEN_FALLBACKS[name]);
  const shade = (c, k) => c.clone().multiplyScalar(k);                 // darker/lighter variant of a token
  const css = c => '#' + c.getHexString();                              // canvas-friendly sRGB hex
  const body = token('--spin-body'), accent = token('--spin-accent');
  const T = {
    body, accent,
    dark: token('--spin-dark'), ball: token('--spin-ball'),
    gold: token('--spin-gold'), goldSatin: token('--spin-gold-satin'), chrome: token('--spin-chrome'),
    paper: token('--spin-paper'), felt: shade(accent, 0.28),
    ground: shade(body, 0.4), rim: accent.clone().lerp(new THREE.Color(1, 1, 1), 0.35),
    exposure: parseFloat(cs.getPropertyValue('--spin-exposure')) || DEFAULTS.exposure,
    env: parseFloat(cs.getPropertyValue('--spin-env')) || DEFAULTS.env,
    coat: parseFloat(cs.getPropertyValue('--spin-clearcoat')) || DEFAULTS.coat,
    ticketInk: shade(accent, 0.5)
  };
  const led = token('--spin-led'), hot = token('--spin-led-hot'), win = token('--spin-win'), lose = token('--spin-lose');
  T.bodyDark = T.dark; T.voidColor = shade(T.dark, 0.4);
  T.ledBg = [css(shade(T.dark, 1.2)), css(shade(T.dark, 0.4))];
  T.tones = {
    idle: [css(led), css(hot)], spin: [css(led.clone().lerp(new THREE.Color(1, 1, 1), 0.15)), css(hot)],
    win: [css(win), css(token('--spin-gold'))], lose: [css(lose), css(shade(lose, 0.8))], lock: [css(led), css(hot)]
  };
  T.css = css;
  return T;
}

/* ---------- timings and layout (world units) ---------- */
const ACC_MS = 250, DEC_MS = 550, DEC_POW = 2.5;            // reel spin-up / spin-down shape
const REEL_R = 1.1, REEL_LEN = 1.0, REEL_Y = 5.4, REEL_Z = -0.1, REEL_DX = 1.08;
const SLOT_Y = 2.85;                                         // ticket printer slot height
const TICKET_W = 1.6, TICKET_H = 0.9;
const TICKET_REST = { y: 1.24, z: 1.47, rx: -0.13 };
const LEVER_PIVOT = { x: 2.5, y: 4.6, z: 0.3 };
const TRAY = { floorTop: 0.82, frontZ: 2.34, halfW: 1.45 };  // prize tray bounds, used by the coin physics

export function createSlotMachineEngine(container, opts) {
  const { symbols, reducedMotion = false, canPull = () => true, onClick = () => {}, onLeverPull = () => {} } = opts;
  const NSYM = symbols.length, STEP = Math.PI * 2 / NSYM;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = readTheme(container);
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;   // weaker phones: fewer coins, lower pixel ratio

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });   // throws without WebGL: the caller shows a fallback
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), lowEnd ? 2 : 3));   // supersampled so text and edges stay crisp even on 1x screens
  renderer.toneMapping = THREE.NeutralToneMapping;               // keeps brand colours true (ACES washed the orange out)
  renderer.toneMappingExposure = T.exposure;
  renderer.shadowMap.enabled = true;
  renderer.localClippingEnabled = true;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'The Crosta 3D daily spin slot machine');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;     // reflections for the metals
  scene.environment = envTex;
  scene.environmentIntensity = T.env;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 150);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const disposables = [envTex, pmrem];                                      // everything that must be freed in dispose()

  /* ---------- materials: satin brand-orange body, charcoal panels, polished trim ---------- */
  const std = o => { const m = new THREE.MeshStandardMaterial(o); disposables.push(m); return m; };
  const lacquer = o => { const m = new THREE.MeshPhysicalMaterial(o); disposables.push(m); return m; };
  const M = {
    gold:      std({ color: T.gold, metalness: 1, roughness: 0.1 }),             // high-gloss
    goldSatin: std({ color: T.goldSatin, metalness: 1, roughness: 0.38 }),
    body:      lacquer({ color: T.body, metalness: 0, roughness: 0.55, clearcoat: T.coat, clearcoatRoughness: 0.2 }),   // deep lacquer: true colour, crisp glossy highlights
    bodyDark:  lacquer({ color: T.bodyDark, metalness: 0.2, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    voidMat:   std({ color: T.voidColor, metalness: 0.2, roughness: 0.8 }),
    chrome:    std({ color: T.chrome, metalness: 1, roughness: 0.1 }),
    ball:      std({ color: T.ball, metalness: 0.25, roughness: 0.08 }),
    button:    std({ color: T.paper, metalness: 0, roughness: 0.22, emissive: 0xffffff, emissiveIntensity: 0.12 }),
    felt:      std({ color: T.felt, metalness: 0, roughness: 0.95 }),
    glass:     std({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.06, depthWrite: false })
  };
  // win-line grid: its own material so it can glow without touching the other gold parts
  const winMat = std({ color: T.gold, metalness: 1, roughness: 0.2, emissive: T.gold, emissiveIntensity: 0 });

  const RB = (w, h, d, r = 0.08) => { const g = new RoundedBoxGeometry(w, h, d, 3, r); disposables.push(g); return g; };
  const geo = g => { disposables.push(g); return g; };
  function add(parent, g, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso; disposables.push(t); return t;
  }

  /* ====================================================================
     THE MACHINE (static meshes)
     ==================================================================== */
  const machine = new THREE.Group(); scene.add(machine);

  // stand trim (plinth) + cabinet + neck
  add(machine, RB(5.0, 0.3, 3.1, 0.1), M.gold, 0, 0.15, 0);
  add(machine, RB(4.4, 3.0, 2.6, 0.14), M.body, 0, 1.8, 0);
  add(machine, RB(4.3, 0.8, 2.5, 0.1), M.body, 0, 3.55, 0);
  // reel head frame: bottom bar, top bar, two posts, back wall (window opening = 3.4 x 2.4)
  add(machine, RB(4.4, 0.5, 2.6, 0.12), M.body, 0, 3.95, 0);
  add(machine, RB(4.4, 0.5, 2.6, 0.12), M.body, 0, 6.85, 0);
  [-1.95, 1.95].forEach(x => add(machine, RB(0.5, 3.4, 2.6, 0.1), M.body, x, 5.4, 0));
  add(machine, geo(new THREE.BoxGeometry(3.4, 2.4, 0.1)), M.bodyDark, 0, REEL_Y, -1.2);
  // gold corner mouldings (full height, polished cylinders)
  [-2.2, 2.2].forEach(x => add(machine, geo(new THREE.CylinderGeometry(0.075, 0.075, 6.8, 20)), M.gold, x, 3.7, 1.3));
  [-2.2, 2.2].forEach(x => add(machine, geo(new THREE.CylinderGeometry(0.075, 0.075, 6.8, 20)), M.goldSatin, x, 3.7, -1.3));

  // reel window bezel + glass
  add(machine, RB(3.7, 0.14, 0.14, 0.04), M.gold, 0, 4.26, 1.31);
  add(machine, RB(3.7, 0.14, 0.14, 0.04), M.gold, 0, 6.54, 1.31);
  [-1.76, 1.76].forEach(x => add(machine, RB(0.14, 2.4, 0.14, 0.04), M.gold, x, REEL_Y, 1.31));
  const glass = new THREE.Mesh(geo(new THREE.PlaneGeometry(3.4, 2.4)), M.glass); glass.position.set(0, REEL_Y, 1.22); machine.add(glass);

  /* ---------- 3 physical reels: volumetric cylinders turning on the X axis ---------- */
  /* ---------- reel faces: flat pictograms drawn in the site palette (no emoji font, so they look the same on every device) ---------- */
  const ledColor = new THREE.Color(getComputedStyle(container).getPropertyValue('--spin-led').trim() || TOKEN_FALLBACKS['--spin-led']);
  const herbColor = new THREE.Color(getComputedStyle(container).getPropertyValue('--spin-herb').trim() || TOKEN_FALLBACKS['--spin-herb']);
  const ICON = { herb: T.css(herbColor), ink: T.css(T.dark), ember: T.css(T.accent), emberDeep: T.css(T.accent.clone().multiplyScalar(0.62)), sun: T.css(ledColor), cream: T.css(T.paper), gold: T.css(T.gold) };
  function drawSymbol(g, sym) {
    const I = ICON;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 9; g.strokeStyle = I.ink;
    const fillStroke = fill => { g.fillStyle = fill; g.fill(); g.stroke(); };
    switch (sym) {
      case '\u{1F355}': {                                   // pizza slice
        g.beginPath(); g.moveTo(-82, -68); g.lineTo(82, -68); g.lineTo(0, 100); g.closePath(); fillStroke(I.sun);
        g.beginPath(); g.moveTo(-90, -86); g.lineTo(90, -86); g.lineTo(90, -62); g.lineTo(-90, -62); g.closePath(); fillStroke(I.gold);
        [[-26, -22], [28, -6], [-2, 40]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 15, 0, 6.3); fillStroke(I.ember); });
        break; }
      case '\u{1F35F}': {                                   // fries in a carton
        [[-52, -78], [-22, -92], [10, -84], [40, -76]].forEach(([x, y]) => { g.beginPath(); g.roundRect(x - 12, y, 24, 90, 8); fillStroke(I.sun); });
        g.beginPath(); g.moveTo(-70, -2); g.lineTo(70, -2); g.lineTo(52, 96); g.lineTo(-52, 96); g.closePath(); fillStroke(I.ember);
        g.beginPath(); g.arc(0, 44, 22, 0, 6.3); g.fillStyle = I.cream; g.fill(); g.lineWidth = 6; g.stroke();
        break; }
      case '\u{1F9C4}': {                                   // garlic bread: a buttered slice with herbs
        g.beginPath(); g.moveTo(-62, 94); g.lineTo(-62, 6); g.bezierCurveTo(-100, 6, -100, -80, -40, -80); g.lineTo(40, -80); g.bezierCurveTo(100, -80, 100, 6, 62, 6); g.lineTo(62, 94); g.closePath(); fillStroke(I.gold);
        g.beginPath(); g.moveTo(-45, 78); g.lineTo(-45, -6); g.bezierCurveTo(-77, -6, -77, -63, -33, -63); g.lineTo(33, -63); g.bezierCurveTo(77, -63, 77, -6, 45, -6); g.lineTo(45, 78); g.closePath(); g.fillStyle = I.cream; g.fill();
        g.lineWidth = 7; g.beginPath(); g.roundRect(-30, -38, 60, 52, 12); fillStroke(I.sun);
        g.fillStyle = I.herb; [[-14, -24], [8, -14], [-4, 0], [16, -28]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, 6.3); g.fill(); });
        break; }
      case '\u{1F964}': {                                   // cold drink with a straw
        g.beginPath(); g.moveTo(14, -100); g.lineTo(40, -100); g.lineTo(26, -44); g.stroke();
        g.beginPath(); g.moveTo(-62, -44); g.lineTo(62, -44); g.lineTo(46, 100); g.lineTo(-46, 100); g.closePath(); fillStroke(I.cream);
        g.save(); g.clip(); g.fillStyle = I.ember; g.fillRect(-70, 8, 140, 56); g.restore();
        g.beginPath(); g.moveTo(-62, -44); g.lineTo(62, -44); g.lineTo(46, 100); g.lineTo(-46, 100); g.closePath(); g.stroke();
        g.beginPath(); g.roundRect(-72, -60, 144, 22, 10); fillStroke(I.ink);
        break; }
      case '\u{1F3F7}️': case '\u{1F3F7}': {          // price tag with a percent sign
        g.beginPath(); g.moveTo(-86, -10); g.lineTo(-18, -78); g.lineTo(76, -78); g.lineTo(76, 78); g.lineTo(-18, 78); g.closePath(); fillStroke(I.sun);
        g.beginPath(); g.arc(-34, 0, 10, 0, 6.3); g.fillStyle = I.cream; g.fill(); g.lineWidth = 6; g.stroke();
        g.fillStyle = I.emberDeep; g.font = '800 92px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('%', 22, 4);
        break; }
      case '\u{1F504}': {                                   // free re-spin: two arrows chasing round
        g.lineWidth = 20; g.strokeStyle = I.ember;
        g.beginPath(); g.arc(0, 0, 62, -2.6, 0.5); g.stroke();
        g.beginPath(); g.arc(0, 0, 62, 0.54, 3.64); g.stroke();
        g.fillStyle = I.ember;
        [0.5, 3.64].forEach(a => {
          g.save(); g.translate(62 * Math.cos(a), 62 * Math.sin(a)); g.rotate(a + Math.PI / 2);
          g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.lineTo(0, 38); g.closePath(); g.fill(); g.restore();
        });
        break; }
      default: {                                            // loss: a plain cross
        g.lineWidth = 26; g.strokeStyle = I.emberDeep;
        g.beginPath(); g.moveTo(-58, -58); g.lineTo(58, 58); g.moveTo(58, -58); g.lineTo(-58, 58); g.stroke();
      }
    }
    g.restore();
  }

  function makeReelTexture() {
    const S = 320;
    return canvasTex(S * NSYM, S, (g) => {
      for (let i = 0; i < NSYM; i++) {
        const x0 = i * S;
        g.fillStyle = T.css(T.paper); g.fillRect(x0, 0, S, S);
        const sh = g.createLinearGradient(x0, 0, x0 + S, 0);
        sh.addColorStop(0, 'rgba(60,40,10,.16)'); sh.addColorStop(.18, 'rgba(60,40,10,0)'); sh.addColorStop(.82, 'rgba(60,40,10,0)'); sh.addColorStop(1, 'rgba(60,40,10,.16)');
        g.fillStyle = sh; g.fillRect(x0, 0, S, S);
        g.save(); g.translate(x0 + S / 2, S / 2); g.rotate(Math.PI / 2);       // the cylinder UV is turned 90deg, so pre-rotate
        g.scale(S / 250, S / 250);                              // icons are drawn on a 250-unit grid
        g.shadowColor = 'rgba(40,25,0,.28)'; g.shadowBlur = 8; g.shadowOffsetX = 4;
        drawSymbol(g, symbols[i]);
        g.restore();
        g.fillStyle = 'rgba(60,40,10,.5)'; g.fillRect(x0, 0, 3, S); g.fillRect(x0 + S - 3, 0, 3, S);
      }
    });
  }
  const reelTex = makeReelTexture();
  const reelFaceMat = std({ map: reelTex, emissiveMap: reelTex, emissive: 0xffffff, emissiveIntensity: 0.22, roughness: 0.4, metalness: 0 });
  const reelGeo = geo(new THREE.CylinderGeometry(REEL_R, REEL_R, REEL_LEN, 72, 1));
  const reelGroups = [];
  for (let r = 0; r < 3; r++) {
    const pivot = new THREE.Group(); pivot.position.set((r - 1) * REEL_DX, REEL_Y, REEL_Z);
    const mesh = new THREE.Mesh(reelGeo, [reelFaceMat, M.goldSatin, M.goldSatin]);
    mesh.rotation.z = Math.PI / 2; mesh.castShadow = true; mesh.receiveShadow = true;
    pivot.add(mesh); machine.add(pivot); reelGroups.push(pivot);
  }
  add(machine, geo(new THREE.CylinderGeometry(0.09, 0.09, 3.7, 20).rotateZ(Math.PI / 2)), M.chrome, 0, REEL_Y, REEL_Z);                 // axle
  [-0.54, 0.54].forEach(x => add(machine, geo(new THREE.CylinderGeometry(1.14, 1.14, 0.08, 64).rotateZ(Math.PI / 2)), M.bodyDark, x, REEL_Y, REEL_Z)); // dividers

  // golden win-line grid in front of each reel (centre row)
  const winGroup = new THREE.Group(); machine.add(winGroup);
  const cellH = 2 * REEL_R * Math.sin(STEP / 2);       // visible height of the centre cell
  for (let r = 0; r < 3; r++) {
    const x = (r - 1) * REEL_DX;
    [-1, 1].forEach(s => add(winGroup, RB(1.06, 0.05, 0.07, 0.02), winMat, x, REEL_Y + s * cellH / 2, 1.12));
    [-1, 1].forEach(s => add(winGroup, RB(0.05, cellH + 0.05, 0.07, 0.02), winMat, x + s * 0.53, REEL_Y, 1.12));
  }
  [-1, 1].forEach(s => {
    const cone = add(winGroup, geo(new THREE.ConeGeometry(0.13, 0.26, 4)), M.gold, s * 1.78, REEL_Y, 1.2);
    cone.rotation.z = -s * Math.PI / 2;
  });
  const winLine = add(winGroup, geo(new THREE.BoxGeometry(3.3, 0.035, 0.035)), winMat, 0, REEL_Y, 1.14); winLine.visible = false;

  /* ---------- marquee: housing, gold frame, LED display, chase bulbs, crest ---------- */
  add(machine, RB(4.2, 1.15, 2.0, 0.1), M.body, 0, 7.675, -0.1);
  add(machine, RB(3.96, 0.14, 0.12, 0.03), M.gold, 0, 7.675 + 0.49, 0.93);
  add(machine, RB(3.96, 0.14, 0.12, 0.03), M.gold, 0, 7.675 - 0.49, 0.93);
  [-1.91, 1.91].forEach(x => add(machine, RB(0.14, 1.12, 0.12, 0.03), M.gold, x, 7.675, 0.93));
  add(machine, geo(new THREE.BoxGeometry(3.7, 0.85, 0.05)), M.voidMat, 0, 7.675, 0.89);

  const mCanvas = document.createElement('canvas'); mCanvas.width = 1100; mCanvas.height = 252;
  const mCtx = mCanvas.getContext('2d');
  const mTex = new THREE.CanvasTexture(mCanvas); mTex.colorSpace = THREE.SRGBColorSpace; mTex.anisotropy = maxAniso; disposables.push(mTex);
  const displayMat = new THREE.MeshBasicMaterial({ map: mTex, toneMapped: false }); disposables.push(displayMat);
  const display = new THREE.Mesh(geo(new THREE.PlaneGeometry(3.68, 0.84)), displayMat); display.position.set(0, 7.675, 0.918); machine.add(display);
  const ledMask = (() => { const c = document.createElement('canvas'); c.width = 1100; c.height = 252; const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.55)'; for (let x = 0; x < 1100; x += 5) g.fillRect(x, 0, 1.7, 252); for (let y = 0; y < 252; y += 5) g.fillRect(0, y, 1100, 1.7); return c; })();
  let marquee = { text: 'SPIN TO WIN', tone: 'idle' }, marqueeKey = '';
  function drawMarquee(now) {
    const m = marquee;
    const tick = (m.tone === 'win' || m.tone === 'spin') ? Math.floor(now / 70) : 0;
    const key = m.text + '|' + m.tone + '|' + tick;
    if (key === marqueeKey) return; marqueeKey = key;
    const c = mCtx, w = 1100, h = 252;
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, T.ledBg[0]); bg.addColorStop(1, T.ledBg[1]);
    c.globalAlpha = 1; c.shadowBlur = 0; c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const col = T.tones[m.tone] || T.tones.idle;
    let flick = 1;
    if (m.tone === 'win') flick = (Math.floor(now / 220) % 2) ? 1 : .55;
    else if (m.tone === 'spin') flick = .82 + .18 * Math.sin(now / 90);
    c.globalAlpha = flick; c.shadowColor = col[1]; c.shadowBlur = 30; c.fillStyle = col[0];
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if ('letterSpacing' in c) c.letterSpacing = '5px';
    let s = 150; const fam = 'Impact,"Arial Narrow","Arial Black",sans-serif';
    for (; s > 40; s -= 2) { c.font = s + 'px ' + fam; if (c.measureText(m.text).width <= 1000) break; }
    c.fillText(m.text, w / 2, h / 2 + 8);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.globalAlpha = 1; c.shadowBlur = 0; c.drawImage(ledMask, 0, 0);
    mTex.needsUpdate = true;
  }
  const bulbOn = std({ color: T.paper, emissive: T.gold, emissiveIntensity: 2.6, roughness: 0.3 });
  const bulbOff = std({ color: T.goldSatin.clone().multiplyScalar(0.3), roughness: 0.5, metalness: 0.2 });
  const bulbGeo = geo(new THREE.SphereGeometry(0.048, 14, 10));
  const bulbs = [];
  for (let x = -1.8; x <= 1.801; x += 0.3) bulbs.push([x, 7.675 + 0.49]);
  for (let y = 0.2; y >= -0.201; y -= 0.2) bulbs.push([1.91, 7.675 + y]);
  for (let x = 1.8; x >= -1.801; x -= 0.3) bulbs.push([x, 7.675 - 0.49]);
  for (let y = -0.2; y <= 0.201; y += 0.2) bulbs.push([-1.91, 7.675 + y]);
  const bulbMeshes = bulbs.map(b => add(machine, bulbGeo, bulbOff, b[0], b[1], 1.0));

  // crest: a real half-disc (cylinder slice) with an inlaid dark face
  function halfDisc(radius, depth, baseMat, z) {
    const mat = baseMat.clone(); disposables.push(mat);
    const g = geo(new THREE.CylinderGeometry(radius, radius, depth, 64, 1, false, Math.PI / 2, Math.PI));
    const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI / 2; m.position.set(0, 8.2, z);
    m.castShadow = true; m.receiveShadow = true; mat.side = THREE.DoubleSide; machine.add(m); return m;
  }
  halfDisc(1.25, 0.5, M.gold, -0.1);
  halfDisc(1.02, 0.54, M.bodyDark, -0.1);
  const crestTex = canvasTex(640, 320, (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const gr = g.createLinearGradient(0, 40, 0, 200);
    gr.addColorStop(0, T.css(T.gold.clone().lerp(new THREE.Color(1, 1, 1), 0.55))); gr.addColorStop(.5, T.css(T.gold)); gr.addColorStop(1, T.css(T.gold.clone().multiplyScalar(0.55)));
    g.fillStyle = gr; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.font = '110px Impact,"Arial Black",sans-serif'; g.fillText('THE CROSTA', w / 2, 110);
    g.font = '700 44px system-ui,sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '12px'; g.fillText('DAILY SPIN', w / 2, 230);
  });
  const crestMat = new THREE.MeshBasicMaterial({ map: crestTex, transparent: true, toneMapped: false }); disposables.push(crestMat);
  const crestText = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.8, 0.9)), crestMat);
  crestText.position.set(0, 8.6, 0.18); machine.add(crestText);

  /* ---------- console deck with push buttons (tilted solid wedge) ---------- */
  const deck = new THREE.Group(); deck.position.set(0, 3.62, 1.3); deck.rotation.x = 0.3; machine.add(deck);
  add(deck, RB(4.3, 0.5, 1.7, 0.12), M.gold, 0, 0, 0);
  add(deck, RB(3.9, 0.06, 1.3, 0.03), M.bodyDark, 0, 0.26, 0);
  for (let i = 0; i < 6; i++) {
    const x = -1.5 + i * 0.6;
    add(deck, geo(new THREE.CylinderGeometry(0.19, 0.21, 0.12, 32)), M.chrome, x, 0.32, 0.1);
    add(deck, geo(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 32)), M.button, x, 0.34, 0.1);
  }

  /* ---------- lower cabinet: panel, printer slot, prize tray ---------- */
  add(machine, RB(3.5, 2.55, 0.05, 0.02), M.bodyDark, 0, 1.75, 1.31);                       // inset panel
  [[3.62, 0.09, 0, 3.04], [3.62, 0.09, 0, 0.5]].forEach(a => add(machine, RB(a[0], a[1], 0.08, 0.03), M.gold, a[2], a[3], 1.33));
  [-1.78, 1.78].forEach(x => add(machine, RB(0.09, 2.63, 0.08, 0.03), M.gold, x, 1.77, 1.33));
  add(machine, RB(2.1, 0.22, 0.05, 0.02), M.gold, 0, SLOT_Y, 1.345);                         // slot frame
  add(machine, geo(new THREE.BoxGeometry(1.82, 0.07, 0.02)), M.voidMat, 0, SLOT_Y, 1.372);    // slot opening
  add(machine, geo(new THREE.BoxGeometry(3.0, 1.35, 0.03)), M.voidMat, 0, 1.47, 1.335);      // dark recess behind the tray

  const labelTex = canvasTex(640, 100, (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 46px system-ui,sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '10px'; g.fillStyle = T.css(T.gold); g.fillText('COLLECT YOUR PRIZE', w / 2, h / 2);
  });
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }); disposables.push(labelMat);
  const label = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.2, 0.34)), labelMat);
  label.position.set(0, 2.38, 1.34); machine.add(label);

  add(machine, RB(3.1, 0.1, 1.15, 0.03), M.gold, 0, 0.74, 1.87);                              // tray floor
  add(machine, geo(new THREE.BoxGeometry(2.9, 0.02, 1.0)), M.felt, 0, 0.795, 1.82);            // felt lining
  [-1.5, 1.5].forEach(x => add(machine, RB(0.1, 0.52, 1.15, 0.03), M.gold, x, 0.96, 1.87));    // side walls
  add(machine, RB(3.1, 0.34, 0.1, 0.04), M.gold, 0, 0.9, 2.4);                                 // front lip

  /* ---------- ticket: a real mesh that drops through 3D space into the tray ---------- */
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), SLOT_Y - 0.04);   // hides everything above the slot
  const paperMat = std({ color: T.paper, roughness: 0.9, metalness: 0, clippingPlanes: [clipPlane] });
  const ticketFaceMat = std({ roughness: 0.85, metalness: 0, clippingPlanes: [clipPlane] });
  const ticket = new THREE.Mesh(geo(new THREE.BoxGeometry(TICKET_W, TICKET_H, 0.025)), [paperMat, paperMat, paperMat, paperMat, ticketFaceMat, paperMat]);
  ticket.castShadow = true; ticket.receiveShadow = true; ticket.visible = false; machine.add(ticket);
  let ticketState = null, ticketKey = null, ticketHidden = false;   // { prize, t0 } : t0 null = resting in the tray
  function setTicketTexture(prize) {
    if (ticketFaceMat.map) ticketFaceMat.map.dispose();
    ticketFaceMat.map = canvasTex(800, 450, (g, w, h) => {
      const paper = g.createLinearGradient(0, 0, 0, h); paper.addColorStop(0, T.css(T.paper.clone().lerp(new THREE.Color(1, 1, 1), 0.5))); paper.addColorStop(1, T.css(T.paper));
      g.fillStyle = paper; g.fillRect(0, 0, w, h);
      const muted = !!prize.muted;                                 // a loss: the same ticket, in charcoal, no gold
      g.fillStyle = T.css(muted ? T.dark : T.accent); g.fillRect(0, 0, w, 92); g.fillStyle = T.css(muted ? T.dark.clone().lerp(T.paper, 0.35) : T.gold); g.fillRect(0, 92, w, 8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = T.css(T.paper); g.font = '800 44px system-ui,sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '8px';
      g.fillText(muted ? 'THE CROSTA - DAILY SPIN' : 'THE CROSTA - WINNER', w / 2, 48); if ('letterSpacing' in g) g.letterSpacing = '0px';
      const name = prize.name.toUpperCase(); g.fillStyle = T.css(muted ? T.dark.clone().lerp(T.paper, 0.2) : T.ticketInk);
      const fam = 'Impact,"Arial Black",sans-serif'; let size = 118;
      for (; size > 50; size -= 2) { g.font = size + 'px ' + fam; if (g.measureText(name).width <= 700) break; }
      let lines = [name];
      if (g.measureText(name).width > 700 || name.split(' ').length > 2) {
        const words = name.split(' '); let best = [name], bd = 1e9;
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
          g.font = '100px ' + fam; const d = Math.abs(g.measureText(a).width - g.measureText(b).width);
          if (d < bd) { bd = d; best = [a, b]; }
        }
        lines = best; size = 104;
        for (; size > 40; size -= 2) { g.font = size + 'px ' + fam; if (Math.max(...lines.map(l => g.measureText(l).width)) <= 700) break; }
      }
      g.font = size + 'px ' + fam;
      const lh = size * 1.05, y0 = 250 - (lines.length - 1) * lh / 2 - 6;
      lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
      g.strokeStyle = T.css(T.ticketInk) + '80'; g.lineWidth = 3; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(40, 372); g.lineTo(w - 40, 372); g.stroke(); g.setLineDash([]);
      g.fillStyle = T.css(muted ? T.dark.clone().lerp(T.paper, 0.2) : T.ticketInk); g.font = '600 32px system-ui,sans-serif'; g.fillText(muted ? 'Next free spin in 24 hours' : 'Valid on orders of ₹100+', w / 2, 411);
    });
    ticketFaceMat.needsUpdate = true;
  }
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  function syncTicket(now) {
    const tk = ticketState;
    if (!tk) { ticket.visible = false; ticketKey = null; return; }
    if (ticketHidden) { ticket.visible = false; return; }
    if (!ticket.visible && ticketKey === tk) ticket.visible = true;
    if (ticketKey !== tk) { ticketKey = tk; setTicketTexture(tk.prize); ticket.visible = true; clipPlane.constant = tk.t0 != null ? SLOT_Y - 0.04 : 100; }
    const R = TICKET_REST;
    if (tk.t0 == null) { ticket.position.set(0, R.y, R.z); ticket.rotation.set(R.rx, 0, 0); return; }
    const t = now - tk.t0, E = 450, F = 550, B = 320;
    const yTop = SLOT_Y + TICKET_H / 2 + 0.05, yOut = SLOT_Y - TICKET_H / 2 - 0.02;
    if (t < E) {                                     // 1) the printer feeds the ticket out of the slot
      ticket.position.set(0, yTop + (yOut - yTop) * easeOutCubic(t / E), 1.42); ticket.rotation.set(0, 0, 0);
    } else if (t < E + F) {                          // 2) it drops under gravity into the tray
      clipPlane.constant = 100;
      const u = (t - E) / F;
      ticket.position.set(0, yOut + (R.y - yOut) * u * u, 1.42 + (R.z - 1.42) * u);
      ticket.rotation.set(R.rx * u, 0, Math.sin(u * 9) * 0.07 * (1 - u));
    } else if (t < E + F + B) {                      // 3) small bounce as it lands
      const q = (t - E - F) / B;
      ticket.position.set(0, R.y + Math.sin(q * Math.PI) * 0.07 * (1 - q), R.z); ticket.rotation.set(R.rx, 0, 0);
    } else { tk.t0 = null; }
  }

  /* ---------- 3D lever: chrome rod + ball on a gold bracket and pivot ---------- */
  const leverRoot = new THREE.Group(); machine.add(leverRoot);
  add(leverRoot, RB(0.34, 1.0, 0.8, 0.08), M.gold, 2.38, LEVER_PIVOT.y, LEVER_PIVOT.z);                                                       // bracket
  add(leverRoot, geo(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 36).rotateZ(Math.PI / 2)), M.gold, LEVER_PIVOT.x - 0.05, LEVER_PIVOT.y, LEVER_PIVOT.z);
  const leverArm = new THREE.Group(); leverArm.position.set(LEVER_PIVOT.x, LEVER_PIVOT.y, LEVER_PIVOT.z); leverRoot.add(leverArm);
  add(leverArm, geo(new THREE.CylinderGeometry(0.075, 0.085, 1.9, 24)), M.chrome, 0, 0.95, 0);
  add(leverArm, geo(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24)), M.gold, 0, 0.1, 0);
  add(leverArm, geo(new THREE.SphereGeometry(0.28, 48, 32)), M.ball, 0, 2.02, 0);
  /**
   * The lever is a small state machine, always continuous from its current angle:
   *   idle    resting up
   *   drag    the player is holding it; the angle follows the pointer
   *   pull    a full pull (a completed drag, a tap, or a spin from the button): eases down, then springs back
   *   spring  let go too early: springs straight back up, no spin
   */
  const LEVER_MAX = 2.05;
  const lever = { mode: 'idle', t0: 0, from: 0, drag: 0, angle: 0 };
  function leverAngle(now) {
    let a = 0;
    if (lever.mode === 'drag' || lever.mode === 'release') a = lever.drag;
    else if (lever.mode === 'pull') {
      const t = (now - lever.t0) / 1000;
      if (t < 0.32) { const u = t / 0.32; a = lever.from + (LEVER_MAX - lever.from) * (1 - Math.pow(1 - u, 2)); }
      else { const s = t - 0.32; if (s > 1.6) { lever.mode = 'idle'; a = 0; } else a = LEVER_MAX * Math.exp(-7 * s) * Math.cos(8 * s); }
    } else if (lever.mode === 'spring') {
      const s = (now - lever.t0) / 1000;
      if (s > 1.6) { lever.mode = 'idle'; a = 0; } else a = lever.from * Math.exp(-7 * s) * Math.cos(8 * s);
    }
    lever.angle = a; return a;
  }

  /* ---------- floor, contact shadow, lights ---------- */
  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(40, 40)), new THREE.ShadowMaterial({ opacity: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const glowMat = new THREE.MeshBasicMaterial({
    map: canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.65)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, false),
    transparent: true, depthWrite: false }); disposables.push(glowMat);
  const glow = new THREE.Mesh(geo(new THREE.PlaneGeometry(9, 6)), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; scene.add(glow);

  scene.add(new THREE.AmbientLight(0xffe9d6, 0.1));
  scene.add(new THREE.HemisphereLight(0xfff0e0, T.ground, 0.22));
  const key = new THREE.DirectionalLight(0xfff1dd, 2.1); key.position.set(5, 11, 9); key.castShadow = true;
  key.shadow.mapSize.set(lowEnd ? 2048 : 4096, lowEnd ? 2048 : 4096); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 11, bottom: -3, near: 1, far: 45 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.target.position.set(0, 4, 0); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xa8c0ff, 0.55); fill.position.set(-8, 4, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight(T.rim, 0.9); rim.position.set(-4, 7, -9); scene.add(rim);
  const marqueeLight = new THREE.PointLight(T.gold, 38, 16, 2); marqueeLight.position.set(0, 8.2, 3.6); scene.add(marqueeLight);
  const reelLight = new THREE.PointLight(0xfff0d0, 22, 9, 2); reelLight.position.set(0, 6.3, 1.7); scene.add(reelLight);
  const trayLight = new THREE.PointLight(T.gold, 10, 7, 2); trayLight.position.set(0, 1.9, 3.0); scene.add(trayLight);
  const winLight = new THREE.PointLight(T.gold, 0, 10, 2); winLight.position.set(0, REEL_Y, 2.8); scene.add(winLight);

  /* ====================================================================
     PARTICLES
     ==================================================================== */

  /* ---------- gold sparkle burst (Points) ---------- */
  const NP = 180;
  const pPos = new Float32Array(NP * 3).fill(-100), pVel = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pLife = new Float32Array(NP);
  const pGeo = geo(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dotTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 30); r.addColorStop(0, '#fff'); r.addColorStop(.4, 'rgba(255,230,140,.8)'); r.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const pointsMat = new THREE.PointsMaterial({ size: 0.2, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); disposables.push(pointsMat);
  const points = new THREE.Points(pGeo, pointsMat);
  points.frustumCulled = false; scene.add(points);
  let pCursor = 0, pActive = 0;
  function burstSparkles(n) {
    for (let k = 0; k < n; k++) {
      const i = pCursor++ % NP, a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
      pPos[i * 3] = (Math.random() - .5) * 3.2; pPos[i * 3 + 1] = REEL_Y + (Math.random() - .5) * .6; pPos[i * 3 + 2] = 1.3;
      pVel[i * 3] = Math.cos(a) * sp; pVel[i * 3 + 1] = Math.sin(a) * sp + 2.5; pVel[i * 3 + 2] = 1 + Math.random() * 3;
      pLife[i] = 0.9 + Math.random() * 1.1;
    }
    pActive = 2.5;
  }
  function updateSparkles(dt) {
    if (pActive <= 0) return; pActive -= dt;
    for (let i = 0; i < NP; i++) {
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -100; pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
      pLife[i] -= dt; pVel[i * 3 + 1] -= 7 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      const f = Math.min(1, pLife[i] * 1.3); pCol[i * 3] = f; pCol[i * 3 + 1] = .8 * f; pCol[i * 3 + 2] = .32 * f;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- gold coin shower: ONE reusable InstancedMesh, thrown out of the prize tray ---------- */
  // Fewer coins on weaker phones (lowEnd, above). Everything is pre-allocated: no objects are created while the coins fly.
  const NC = lowEnd ? 28 : 56;
  const coinGeo = geo(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 20));
  const coinMat = std({ color: T.gold, metalness: 1, roughness: 0.15 });
  const coins = new THREE.InstancedMesh(coinGeo, coinMat, NC);
  coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coins.frustumCulled = false; coins.visible = false; coins.castShadow = false; scene.add(coins);
  const C = {                                                  // struct-of-arrays state, one slot per coin
    x: new Float32Array(NC), y: new Float32Array(NC), z: new Float32Array(NC),
    vx: new Float32Array(NC), vy: new Float32Array(NC), vz: new Float32Array(NC),
    ax: new Float32Array(NC), ay: new Float32Array(NC), az: new Float32Array(NC),     // rotation angles
    wx: new Float32Array(NC), wy: new Float32Array(NC), wz: new Float32Array(NC),     // spin velocities
    delay: new Float32Array(NC), life: new Float32Array(NC), bounces: new Uint8Array(NC)
  };
  let coinsAlive = 0;
  const cDummy = new THREE.Object3D();                         // reused for every matrix
  const COIN_G = 15, COIN_REST = 0.38, COIN_FADE = 0.45;
  const hideMatrix = (() => { const m = new THREE.Matrix4(); m.makeScale(0, 0, 0); return m; })();
  for (let i = 0; i < NC; i++) coins.setMatrixAt(i, hideMatrix);

  /** Launch a shower from the recess behind the tray ("COLLECT YOUR PRIZE") toward the camera. */
  function burstCoins(count) {
    if (reducedMotion) return;                                 // no flying objects for people who asked for less motion
    const n = Math.min(count || (lowEnd ? 18 : 34), NC);
    let launched = 0;
    for (let i = 0; i < NC && launched < n; i++) {
      if (C.life[i] > 0 || C.delay[i] > 0) continue;           // slot still in use
      C.x[i] = (Math.random() - 0.5) * 1.5; C.y[i] = 1.55 + Math.random() * 0.25; C.z[i] = 1.4;
      C.vx[i] = (Math.random() - 0.5) * 2.6; C.vy[i] = 3.4 + Math.random() * 2.8; C.vz[i] = 3.0 + Math.random() * 3.6;   // up and out toward the viewer
      C.ax[i] = Math.random() * 6.28; C.ay[i] = Math.random() * 6.28; C.az[i] = Math.random() * 6.28;
      C.wx[i] = (Math.random() - 0.5) * 28; C.wy[i] = (Math.random() - 0.5) * 28; C.wz[i] = (Math.random() - 0.5) * 28;
      C.delay[i] = launched * 0.018 + Math.random() * 0.06;    // staggered, so it pours instead of popping
      C.life[i] = 2.4 + Math.random() * 1.2; C.bounces[i] = 0;
      launched++; coinsAlive++;
    }
    if (launched) coins.visible = true;
  }
  function updateCoins(dt) {
    if (coinsAlive <= 0) return;                               // nothing flying: zero cost per frame
    for (let i = 0; i < NC; i++) {
      if (C.life[i] <= 0) continue;
      if (C.delay[i] > 0) { C.delay[i] -= dt; if (C.delay[i] > 0) { cDummy.scale.setScalar(0); cDummy.updateMatrix(); coins.setMatrixAt(i, cDummy.matrix); continue; } }
      C.life[i] -= dt;
      if (C.life[i] <= 0) { coins.setMatrixAt(i, hideMatrix); coinsAlive--; continue; }   // expired: free the slot
      C.vy[i] -= COIN_G * dt;
      C.x[i] += C.vx[i] * dt; C.y[i] += C.vy[i] * dt; C.z[i] += C.vz[i] * dt;
      C.ax[i] += C.wx[i] * dt; C.ay[i] += C.wy[i] * dt; C.az[i] += C.wz[i] * dt;

      // collisions: inside the tray the floor is the tray felt; the front lip and side walls bounce coins back in
      const inTray = Math.abs(C.x[i]) < TRAY.halfW && C.z[i] < TRAY.frontZ + 0.1;
      if (inTray) {
        if (C.z[i] > TRAY.frontZ && C.y[i] < 1.1 && C.vz[i] > 0) { C.z[i] = TRAY.frontZ; C.vz[i] *= -0.25; }
        if (Math.abs(C.x[i]) > TRAY.halfW - 0.1 && C.y[i] < 1.2) { C.x[i] = Math.sign(C.x[i]) * (TRAY.halfW - 0.1); C.vx[i] *= -0.4; }
      }
      const floorY = inTray ? TRAY.floorTop : 0.04;
      if (C.y[i] < floorY) {
        C.y[i] = floorY;
        if (Math.abs(C.vy[i]) > 0.7 && C.bounces[i] < 3) { C.vy[i] = -C.vy[i] * COIN_REST; C.bounces[i]++; }
        else { C.vy[i] = 0; }
        C.vx[i] *= 0.72; C.vz[i] *= 0.72; C.wx[i] *= 0.55; C.wy[i] *= 0.55; C.wz[i] *= 0.55;
        if (C.vy[i] === 0) { C.ax[i] *= 0.9; C.az[i] *= 0.9; }  // settle flat-ish
      }
      const fade = Math.min(1, C.life[i] / COIN_FADE);         // shrink away at the end of its life
      cDummy.position.set(C.x[i], C.y[i], C.z[i]);
      cDummy.rotation.set(C.ax[i], C.ay[i], C.az[i]);
      cDummy.scale.setScalar(fade);
      cDummy.updateMatrix();
      coins.setMatrixAt(i, cDummy.matrix);
    }
    coins.instanceMatrix.needsUpdate = true;
    if (coinsAlive <= 0) coins.visible = false;                // all gone: stop drawing it altogether
  }

  /* ---------- camera (auto-fit, gentle sway, pointer parallax) ---------- */
  const camTarget = new THREE.Vector3(0.1, 4.5, 0);
  let camDist = 22; const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  function resize() {
    const w = container.clientWidth || 400, h = container.clientHeight || 560;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camDist = Math.max(9.7 / t, 6.6 / (t * camera.aspect)) * 1.03;
    camera.updateProjectionMatrix();
  }
  function placeCamera(now) {
    pointer.sx += (pointer.x - pointer.sx) * 0.06; pointer.sy += (pointer.y - pointer.sy) * 0.06;
    const sway = reducedMotion ? 0 : Math.sin(now / 2600) * 0.05;
    const az = 0.2 + sway + pointer.sx * 0.12;
    camera.position.set(camTarget.x + Math.sin(az) * camDist, camTarget.y + 1.6 + pointer.sy * 0.8, camTarget.z + Math.cos(az) * camDist);
    camera.lookAt(camTarget);
  }
  const onPointerMove = e => {
    const r = container.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2; pointer.y = -((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onPointerLeave = () => { pointer.x = 0; pointer.y = 0; };
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);

  /* ---------- picking (lever click / click anywhere on the machine) ---------- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(machine, true)[0];
    if (!hit) return null;
    let o = hit.object, lev = false;
    while (o) { if (o === leverRoot) { lev = true; break; } o = o.parent; }
    return { lever: lev };
  }
  const onCanvasClick = e => { const h = pick(e); if (h) onClick(h); };         // a click or tap anywhere on the machine
  const onCanvasMove = e => { const h = pick(e); renderer.domElement.style.cursor = (h && canPull()) ? 'pointer' : 'default'; };
  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('pointermove', onCanvasMove);

  /* ---------- lever drag handle: drag down to pull, let go early to cancel ---------- */
  const leverHit = document.createElement('div');
  leverHit.className = 'c3d-lever-hit'; leverHit.setAttribute('aria-hidden', 'true');
  container.appendChild(leverHit);
  const lvTop = new THREE.Vector3(), lvBase = new THREE.Vector3();
  let hitBox = { x: -999, y: -999, w: 0, h: 0 };
  function placeLeverHit() {                                    // keep the handle on top of the 3D lever as the camera sways
    camera.updateMatrixWorld();
    lvBase.set(LEVER_PIVOT.x, LEVER_PIVOT.y, LEVER_PIVOT.z); lvTop.set(LEVER_PIVOT.x, LEVER_PIVOT.y + 2.3, LEVER_PIVOT.z);
    machine.localToWorld(lvBase); machine.localToWorld(lvTop);
    const W = container.clientWidth, H = container.clientHeight;
    lvBase.project(camera); lvTop.project(camera);
    const bx = (lvBase.x * 0.5 + 0.5) * W, by = (-lvBase.y * 0.5 + 0.5) * H, ty = (-lvTop.y * 0.5 + 0.5) * H;
    const w = Math.max(54, W * 0.13), h = Math.abs(by - ty) + w * 0.9;
    const x = bx - w / 2, y = Math.min(ty, by) - w * 0.45;
    if (Math.abs(x - hitBox.x) + Math.abs(y - hitBox.y) + Math.abs(w - hitBox.w) + Math.abs(h - hitBox.h) < 0.6) return;
    hitBox = { x, y, w, h };
    leverHit.style.cssText = `width:${w}px;height:${h}px;transform:translate(${x}px,${y}px)`;
  }
  let drag = null;                                              // { startY, range, moved }
  leverHit.addEventListener('pointerdown', e => {
    if (!canPull()) { onClick({ lever: true, locked: true }); return; }   // locked or spinning: the controller decides (shake / ignore)
    e.preventDefault();
    try { leverHit.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic pointer: carry on without capture */ }
    drag = { startY: e.clientY, range: Math.max(60, hitBox.h * 0.7), moved: false };
    lever.mode = 'drag'; lever.drag = lever.angle;
    leverHit.classList.add('is-grabbed');
  });
  leverHit.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = Math.max(0, e.clientY - drag.startY);
    if (dy > 6) drag.moved = true;
    lever.drag = Math.min(1, dy / drag.range) * LEVER_MAX;
  });
  function endDrag() {
    if (!drag) return;
    const d = drag; drag = null; leverHit.classList.remove('is-grabbed');
    const success = !d.moved || lever.drag >= LEVER_MAX * 0.6;  // a plain tap pulls it too
    lever.mode = 'release';
    if (success) onLeverPull();                                 // the controller starts the spin, which plays the pull-through
    if (lever.mode === 'release') { lever.mode = 'spring'; lever.from = lever.angle; lever.t0 = performance.now(); }   // not pulled far enough (or locked): spring back
  }
  leverHit.addEventListener('pointerup', endDrag);
  leverHit.addEventListener('pointercancel', endDrag);

  /* ====================================================================
     STATE DRIVEN BY THE CONTROLLER
     ==================================================================== */
  const reels = [0, 3, 5].map(p => ({ pos: p, prev: p, speed: 0, T: 0, k: p, start: p, v: 0, stopped: true }));
  let anim = null, onAllStopped = null, shakeT0 = null, winGlow = false;

  function reelPos(reel, t) {      // position (in faces) of a reel at time t (ms) since the spin started
    if (t >= reel.T) return reel.k;
    const v = reel.v, a = ACC_MS / 1000, d = DEC_MS / 1000, s = t / 1000, Tt = reel.T / 1000;
    if (s < a) return reel.start + v * s * s / (2 * a);
    if (s < Tt - d) return reel.start + v * a / 2 + v * (s - a);
    const u = (s - (Tt - d)) / d;
    return reel.start + v * a / 2 + v * (Tt - d - a) + v * d / DEC_POW * (1 - Math.pow(1 - u, DEC_POW));
  }

  /**
   * Start the reels now. `faces` are already decided; `stopMs` are the three hard-stop times. The motion
   * is planned up front, so each reel ends exactly on its face at exactly its stop time.
   */
  function spinReels(faces, stopMs, done) {
    const now = performance.now();
    reels.forEach((r, i) => {
      r.start = Math.round(r.pos);
      r.T = stopMs[i]; r.stopped = false; r.prev = r.start;
      const minD = 10 * (r.T / 1000);
      let k = Math.ceil(r.start + minD);
      while (((k % NSYM) + NSYM) % NSYM !== faces[i]) k++;
      r.k = k;
      const a = ACC_MS / 1000, d = DEC_MS / 1000, Tt = r.T / 1000;
      r.v = (k - r.start) / (Tt - d - a / 2 + d / DEC_POW);
    });
    anim = { t0: now }; onAllStopped = done;
  }
  function setReelFaces(faces) { reels.forEach((r, i) => { r.pos = r.prev = r.k = r.start = faces[i]; r.speed = 0; }); }
  function pullLever() { lever.from = lever.angle; lever.t0 = performance.now(); lever.mode = 'pull'; }   // continues from wherever the lever is now
  function shake() {
    shakeT0 = performance.now();
    if (navigator.vibrate) { try { navigator.vibrate([30, 40, 30]); } catch (e) { /* not allowed before a tap */ } }
  }
  function setMarquee(m) { marquee = m; }
  function setWinGlow(on) { winGlow = !!on; }
  /* ---- where things are on screen (the page animates the ticket into the dialog, and the coins start at the tray) ---- */
  const _p = new THREE.Vector3();
  function toClient(v) { const r = renderer.domElement.getBoundingClientRect(); v.project(camera); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; }
  function getTicketRect() {                                    // the resting ticket's box in viewport pixels, or null
    if (!ticketState) return null;
    camera.updateMatrixWorld(); ticket.updateWorldMatrix(true, false);
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      _p.set(sx * TICKET_W / 2, sy * TICKET_H / 2, 0); ticket.localToWorld(_p);
      const c = toClient(_p); l = Math.min(l, c.x); r = Math.max(r, c.x); t = Math.min(t, c.y); b = Math.max(b, c.y);
    });
    return { left: l, top: t, width: r - l, height: b - t };
  }
  function getTicketFace() { try { return ticketFaceMat.map && ticketFaceMat.map.image ? ticketFaceMat.map.image.toDataURL('image/png') : null; } catch (e) { return null; } }
  function getTrayPoint() { camera.updateMatrixWorld(); machine.updateWorldMatrix(true, false); _p.set(0, 1.5, 1.7); machine.localToWorld(_p); return toClient(_p); }
  function hideTicket(on) { ticketHidden = !!on; }
  function setTicket(prize) { ticketState = prize ? { prize, t0: null } : null; }          // resting in the tray, or removed
  function dropTicket(prize) { ticketState = { prize, t0: performance.now() }; }           // printed out and dropped into the tray

  /* ---------- render loop (paused while the machine is off-screen) ---------- */
  let inView = true, rafId = 0, lastFrame = 0, disposed = false;
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { rootMargin: '120px' }) : null;
  if (io) io.observe(container);
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container); else window.addEventListener('resize', resize);

  function frame(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    if (!inView && !anim) { lastFrame = 0; return; }           // off-screen and idle: draw nothing
    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000); lastFrame = now;

    if (anim) {
      const t = now - anim.t0; let allStopped = true;
      reels.forEach(r => {
        if (r.stopped) return;
        if (t >= r.T) { r.pos = r.k; r.speed = 0; r.stopped = true; if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* needs a tap first */ } } }
        else { r.pos = reelPos(r, t); r.speed = dt > 0 ? Math.max(0, (r.pos - r.prev) / dt) : 0; allStopped = false; }
        r.prev = r.pos;
      });
      if (allStopped) { anim = null; const cb = onAllStopped; onAllStopped = null; if (cb) cb(); }
    }

    // reels: face p points at the player when the cylinder is turned by (p + 0.5) steps
    reels.forEach((r, i) => { reelGroups[i].rotation.x = (r.pos + 0.5) * STEP; });
    leverArm.rotation.x = leverAngle(now);

    // cabinet shake (a click on the machine while it is locked)
    if (shakeT0 != null) {
      const u = (now - shakeT0) / 520;
      if (u >= 1) { shakeT0 = null; machine.position.x = 0; machine.rotation.z = 0; }
      else { const d = 1 - u; machine.position.x = Math.sin(u * 46) * 0.14 * d; machine.rotation.z = Math.sin(u * 46 + 1) * 0.014 * d; }
    }

    // marquee + chase bulbs
    drawMarquee(now);
    const stepB = Math.floor(now / (marquee.tone === 'win' ? 110 : 260));
    bulbMeshes.forEach((b, i) => { b.material = (reducedMotion ? i % 2 === 0 : (i + stepB) % 3 === 0) ? bulbOn : bulbOff; });

    // win-line glow
    if (winGlow) {
      const p = reducedMotion ? 0.7 : 0.5 + 0.5 * Math.sin(now / 170);
      winMat.emissiveIntensity = 0.8 + 2.2 * p; winLight.intensity = 25 + 45 * p; winLine.visible = true;
    } else { winMat.emissiveIntensity = 0; winLight.intensity = 0; winLine.visible = false; }

    syncTicket(now);
    updateSparkles(dt);
    updateCoins(dt);
    placeCamera(now);
    renderer.render(scene, camera);
    placeLeverHit();
  }

  /* ---------- clean-up: free GPU memory and listeners ---------- */
  function dispose() {
    disposed = true; cancelAnimationFrame(rafId);
    if (io) io.disconnect(); if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
    container.removeEventListener('pointermove', onPointerMove); container.removeEventListener('pointerleave', onPointerLeave);
    if (leverHit.parentNode) leverHit.parentNode.removeChild(leverHit);
    renderer.domElement.removeEventListener('click', onCanvasClick); renderer.domElement.removeEventListener('pointermove', onCanvasMove);
    if (ticketFaceMat.map) ticketFaceMat.map.dispose();
    coins.dispose();
    disposables.forEach(d => { try { d.dispose(); } catch (e) { /* already gone */ } });
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  resize();
  rafId = requestAnimationFrame(frame);

  return {
    domElement: renderer.domElement,
    spinReels, setReelFaces, pullLever, shake,
    setMarquee, setWinGlow, setTicket, dropTicket,
    getTicketRect, getTicketFace, getTrayPoint, hideTicket,
    burstSparkles, burstCoins,
    resize, dispose
  };
}
