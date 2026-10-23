// ── SMALL FEEDBACK HELPERS ──
// Toast, the thumbnail that flies to the cart, and the count "bump". Motion is
// skipped for people who ask their device for less of it.
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rupee = n => '₹' + Number(n).toLocaleString('en-IN');

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function bump(el) {
  if (!el || reducedMotion()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
    { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
}

// A copy of `fromEl`'s picture travels to the header cart. Resolves when it lands.
function flyToCart(fromEl, src) {
  const target = document.querySelector('#actions .cart');
  if (reducedMotion() || !fromEl || !target || !src) return Promise.resolve();
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  if (!a.width || !a.height) return Promise.resolve();
  const el = document.createElement('img');
  el.src = src; el.className = 'fly'; el.alt = '';
  Object.assign(el.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = 36 / Math.max(a.width, a.height);
  return el.animate(
    [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: .85 }],
    { duration: 460, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' }
  ).finished.then(() => el.remove(), () => el.remove());
}

// Called after something is added: toast + (optional) flying thumbnail + count bump.
function cartAddedFeedback(label, opts = {}) {
  showToast(label);
  const landed = Promise.race([flyToCart(opts.fromEl, opts.img), new Promise(r => setTimeout(r, 700))]);
  landed.then(() => document.querySelectorAll('.cart-count').forEach(bump));
}
