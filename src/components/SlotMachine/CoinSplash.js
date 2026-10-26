/**
 * CoinSplash.js: the full-screen win celebration.
 *
 * A second, short-lived WebGL layer laid over the whole page (it sits above the result dialog, never blocks a tap).
 * Real 3D gold coins burst out of the machine's prize tray toward the viewer, then rain across the whole screen.
 * Everything is one InstancedMesh with pre-allocated state, so nothing is created while coins fly; when the last
 * coin has left the screen the layer disposes itself (renderer, textures, canvas) and frees its graphics context.
 *
 *   startCoinSplash({ origin: { x, y }, lowEnd, onDone })    origin = the tray, in page (viewport) pixels
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let current = null;                                        // one splash at a time

export function startCoinSplash({ origin, lowEnd = false, onDone = () => {} }) {
  if (current) current.stop();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lowEnd, powerPreference: 'high-performance' }); }
  catch (e) { return null; }                               // no WebGL: the page already has the in-machine coins

  const W = () => window.innerWidth, H = () => window.innerHeight;
  const canvas = renderer.domElement;
  canvas.className = 'c3d-splash'; canvas.setAttribute('aria-hidden', 'true');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
  renderer.setSize(W(), H(), false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  document.body.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env; scene.environmentIntensity = 0.9;
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.2); sun.position.set(4, 8, 10); scene.add(sun);
  const FOV = 45, CAM_Z = 14;
  const camera = new THREE.PerspectiveCamera(FOV, W() / H(), 0.1, 80); camera.position.set(0, 0, CAM_Z);
  const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
  let halfW = halfH * camera.aspect;

  /* ---- the coin: gold rim, a stamped face ---- */
  const goldCss = getComputedStyle(document.documentElement).getPropertyValue('--spin-gold').trim() || '#efb327';
  const gold = new THREE.Color(goldCss);
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 256;
  (g => {
    const hi = '#' + gold.clone().lerp(new THREE.Color(1, 1, 1), 0.5).getHexString(), mid = '#' + gold.getHexString(), lo = '#' + gold.clone().multiplyScalar(0.55).getHexString();
    const grad = g.createRadialGradient(100, 90, 10, 128, 128, 128); grad.addColorStop(0, hi); grad.addColorStop(0.6, mid); grad.addColorStop(1, lo);
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = lo; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 104, 0, 6.3); g.stroke();
    g.strokeStyle = hi; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 94, 0, 6.3); g.stroke();
    g.fillStyle = lo; g.font = '800 120px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₹', 128, 138);
  })(faceCanvas.getContext('2d'));
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  const sideMat = new THREE.MeshStandardMaterial({ color: gold, metalness: 1, roughness: 0.2 });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.95, roughness: 0.25 });
  const geo = new THREE.CylinderGeometry(0.36, 0.36, 0.075, 32);
  const N = lowEnd ? 210 : 440;
  const coins = new THREE.InstancedMesh(geo, [sideMat, faceMat, faceMat], N);
  coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage); coins.frustumCulled = false; scene.add(coins);

  /* ---- coin state (struct of arrays) ---- */
  const S = {
    x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
    vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
    rx: new Float32Array(N), ry: new Float32Array(N), rz: new Float32Array(N),
    wx: new Float32Array(N), wy: new Float32Array(N), wz: new Float32Array(N),
    size: new Float32Array(N), at: new Float32Array(N), alive: new Uint8Array(N)
  };
  const ox = ((origin ? origin.x : W() / 2) / W() - 0.5) * 2 * halfW, oy = -(((origin ? origin.y : H() * 0.7) / H()) - 0.5) * 2 * halfH;
  const FOUNTAIN = Math.round(N * 0.34);
  let lastSpawn = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.random;
    S.size[i] = 0.55 + r() * 0.85;
    S.rx[i] = r() * 6.3; S.ry[i] = r() * 6.3; S.rz[i] = r() * 6.3;
    S.wx[i] = (r() - 0.5) * 26; S.wy[i] = (r() - 0.5) * 26; S.wz[i] = (r() - 0.5) * 14;
    if (i < FOUNTAIN) {                                     // a fountain out of the tray, up and toward the viewer
      S.at[i] = (i / FOUNTAIN) * 0.55;
      S.x[i] = ox + (r() - 0.5) * 1.6; S.y[i] = oy; S.z[i] = 0;
      S.vx[i] = (r() - 0.5) * 11; S.vy[i] = 9 + r() * 9; S.vz[i] = r() * 8;
    } else {                                                // then a rain across the whole screen
      S.at[i] = 0.25 + r() * 1.7;
      S.x[i] = (r() * 2 - 1) * halfW * 1.15; S.y[i] = halfH + 1.5 + r() * 3; S.z[i] = -4 + r() * 8;
      S.vx[i] = (r() - 0.5) * 2; S.vy[i] = -(1 + r() * 4); S.vz[i] = 0;
    }
    lastSpawn = Math.max(lastSpawn, S.at[i]);
  }
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < N; i++) coins.setMatrixAt(i, hide);
  const dummy = new THREE.Object3D();

  /* ---- loop ---- */
  let t = 0, last = performance.now(), raf = 0, stopped = false;
  const G = -16;
  function tick(now) {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    let live = 0;
    for (let i = 0; i < N; i++) {
      if (t < S.at[i]) { live++; continue; }
      if (S.alive[i] === 2) continue;                       // finished
      S.alive[i] = 1;
      S.vy[i] += G * dt;
      S.x[i] += S.vx[i] * dt; S.y[i] += S.vy[i] * dt; S.z[i] += S.vz[i] * dt;
      S.rx[i] += S.wx[i] * dt; S.ry[i] += S.wy[i] * dt; S.rz[i] += S.wz[i] * dt;
      if (S.y[i] < -halfH - 1.8 && S.vy[i] < 0) { S.alive[i] = 2; coins.setMatrixAt(i, hide); continue; }   // left the bottom of the screen
      live++;
      dummy.position.set(S.x[i], S.y[i], S.z[i]);
      dummy.rotation.set(S.rx[i], S.ry[i], S.rz[i]);
      dummy.scale.setScalar(S.size[i]);
      dummy.updateMatrix();
      coins.setMatrixAt(i, dummy.matrix);
    }
    coins.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    if ((live === 0 && t > lastSpawn) || t > 7) stop();      // all gone (or a safety cap)
  }
  function onResize() { renderer.setSize(W(), H(), false); camera.aspect = W() / H(); camera.updateProjectionMatrix(); halfW = halfH * camera.aspect; }
  window.addEventListener('resize', onResize);

  function stop() {
    if (stopped) return; stopped = true;
    cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
    coins.dispose(); geo.dispose(); sideMat.dispose(); faceMat.dispose(); faceTex.dispose(); env.dispose(); pmrem.dispose();
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (current === handle) current = null;
    onDone();
  }
  const handle = { stop };
  current = handle;
  raf = requestAnimationFrame(tick);
  return handle;
}
