// ── DELIVERY LOCATION PIN + UPI PAYMENT ──

/* ───────────── location pin ───────────── */
// Shared only inside this order's WhatsApp message; never stored.
let deliveryPin = null;                              // { lat, lng, acc }

function setLocNote(text) { const n = document.getElementById('locNote'); if (n) n.textContent = text; }

function shareLocation() {
  const btn = document.getElementById('locBtn');
  if (!navigator.geolocation) { setLocNote('This browser can’t share a location — just type your address.'); return; }
  btn.disabled = true; btn.textContent = '📍 Finding you…';
  navigator.geolocation.getCurrentPosition(pos => {
    deliveryPin = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
    btn.disabled = false; btn.textContent = '✓ Location added — tap to update'; btn.classList.add('done');
    setLocNote(`Pin added (within about ${deliveryPin.acc} m). We’ll send it with your order.`);
  }, err => {
    deliveryPin = null;
    btn.disabled = false; btn.textContent = '📍 Add my location pin'; btn.classList.remove('done');
    setLocNote(err.code === 1 ? 'Location is blocked for this site — allow it in your browser, or just type your address.' : 'Couldn’t get your location — try again, or just type your address.');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
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
function upiLink(total) {
  return `upi://pay?pa=${UPI.id}&pn=${encodeURIComponent(UPI.name)}&am=${Number(total).toFixed(2)}&cu=INR&tn=${encodeURIComponent('The Crosta order')}`;
}
function updatePaymentUi() {
  const total = computeCartTotals(cart).total;
  const btn = document.getElementById('upiPayBtn');
  if (!btn) return;
  btn.href = upiLink(total);
  btn.textContent = `Pay ${rupee(total)} with UPI`;
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
    : `\n💳 Payment: Cash / UPI on delivery\n`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pay-opt').forEach(b => b.addEventListener('click', () => setPayMethod(b.dataset.pay)));
  document.getElementById('upiCopy').addEventListener('click', () => {
    const done = () => showToast('UPI ID copied');
    if (navigator.clipboard) navigator.clipboard.writeText(UPI.id).then(done, () => showToast(UPI.id));
    else showToast(UPI.id);
  });
  updatePaymentUi();
});
