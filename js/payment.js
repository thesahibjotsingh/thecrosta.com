// ── DELIVERY LOCATION PIN + UPI PAYMENT ──

/* ───────────── location pin ───────────── */
// Shared only inside this order's WhatsApp message; never stored.
let deliveryPin = null;                              // { lat, lng, acc }
// Delivery orders need the pin, so the rider can find the customer (pickup orders never do). Set to false to make it optional again.
const REQUIRE_PIN = true;

function setLocNote(text, isError) {
  const n = document.getElementById('locNote');
  if (!n) return;
  n.textContent = text; n.classList.toggle('err', !!isError);
}

// resolves true once a pin is added, false if it could not be (blocked, no signal, unsupported)
function shareLocation() {
  return new Promise(resolve => {
    const btn = document.getElementById('locBtn'), label = btn.querySelector('span');
    if (!navigator.geolocation) { setLocNote('This browser can’t share a location. Please choose Pickup, or order from your phone.', REQUIRE_PIN); resolve(false); return; }
    btn.disabled = true; label.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(pos => {
      deliveryPin = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
      btn.disabled = false; label.textContent = '✓ Location added — tap to update'; btn.classList.add('done');
      setLocNote(`Pin added (within about ${deliveryPin.acc} m). We’ll send it with your order.`);
      resolve(true);
    }, err => {
      deliveryPin = null;
      btn.disabled = false; label.textContent = 'Add my location pin'; btn.classList.remove('done');
      setLocNote(err.code === 1 ? 'Location is blocked for this site. Allow it in your browser settings and tap again, or choose Pickup.' : 'Couldn’t get your location. Check that location is on and tap again, or choose Pickup.', REQUIRE_PIN);
      resolve(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}
// the pin only makes sense for delivery
function updateLocationRow() { const r = document.getElementById('locRow'); if (r) r.style.display = isPickup ? 'none' : ''; }

function locationLine() {
  return (!isPickup && deliveryPin) ? `📍 Location pin: https://maps.google.com/?q=${deliveryPin.lat.toFixed(6)},${deliveryPin.lng.toFixed(6)}\n` : '';
}

/* ───────────── payment ───────────── */
let payMethod = 'cash';                              // 'cash' | 'upi'

// A UPI "pay" link opens the customer's UPI app with the amount filled in. It
// cannot confirm payment — the shop checks its own UPI app against the screenshot.
const upiQuery = total => `pa=${UPI.id}&pn=${encodeURIComponent(UPI.name)}&am=${Number(total).toFixed(2)}&cu=INR&tn=${encodeURIComponent('The Crosta order')}`;
function upiLink(total) { return `upi://pay?${upiQuery(total)}`; }
// iPhones have no system handler for upi:// (Safari just ignores it), so each app gets its own link there.
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function updatePaymentUi() {
  const total = computeCartTotals(cart).total;
  const btn = document.getElementById('upiPayBtn');
  if (!btn) return;
  btn.href = upiLink(total);
  btn.textContent = `Pay ${rupee(total)} with UPI`;
  const panel = document.getElementById('upiPanel'), apps = document.getElementById('upiApps');
  const ios = isIOS();
  panel.classList.toggle('ios', ios);
  apps.hidden = !ios;
  document.getElementById('upiAppsAmt').textContent = rupee(total);
  document.getElementById('upiPhonePe').href = `phonepe://pay?${upiQuery(total)}`;
  document.getElementById('upiGPay').href = `gpay://upi/pay?${upiQuery(total)}`;
  document.getElementById('upiPaytm').href = `paytmmp://pay?${upiQuery(total)}`;
  document.getElementById('upiAmt').textContent = total;
  document.getElementById('upiId').textContent = UPI.id;
}
function setPayMethod(m) {
  payMethod = m;
  document.querySelectorAll('.pay-opt').forEach(b => {
    const on = b.dataset.pay === m;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  document.getElementById('upiPanel').hidden = m !== 'upi';
  updatePaymentUi();
}
function paymentLine(total) {
  return payMethod === 'upi'
    ? `\n💳 Payment: UPI ${rupee(total)} to ${UPI.id}\n📎 I’ll send the payment screenshot here — please check your UPI app\n`
    : `\n💳 Payment: Pay on delivery (cash or UPI)\n`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pay-opt').forEach(b => b.addEventListener('click', () => setPayMethod(b.dataset.pay)));
  document.getElementById('upiCopy').addEventListener('click', () => {
    const done = () => showToast('UPI ID copied');
    if (navigator.clipboard) navigator.clipboard.writeText(UPI.id).then(done, () => showToast(UPI.id));
    else showToast(UPI.id);
  });
  // if tapping a pay link leaves the page on screen, no app took it: say so and open the UPI ID / QR
  const fail = document.getElementById('upiFail'), more = document.getElementById('upiMore');
  more.open = !matchMedia('(pointer: coarse)').matches;               // desktops see the QR straight away, phones tap to open it
  document.querySelectorAll('#upiPayBtn, .upi-app').forEach(a => a.addEventListener('click', () => {
    let left = false;
    const mark = () => { left = true; };
    document.addEventListener('visibilitychange', mark, { once: true });
    addEventListener('pagehide', mark, { once: true });
    setTimeout(() => { if (!left && !document.hidden) { fail.hidden = false; more.open = true; } }, 1800);
  }));
  updatePaymentUi();
});
