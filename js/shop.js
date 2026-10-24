// ── SHOP FACTS ──
// Opening hours and the shop's clock. One source for the header status, the
// offer windows (offers.js), the cart promos (promos.js) and the clock strip.
// Hours are 24-hour numbers in shop time (Asia/Kolkata), not the visitor's.
const SHOP_TIMEZONE = 'Asia/Kolkata';
const SHOP_HOURS = { 0:[11,22.5], 1:[11,22.5], 2:[11,22.5], 3:[11,22.5], 4:[11,22.5], 5:[11,22.5], 6:[11,22.5] }; // Sun…Sat → [open, close], 22.5 = 10:30 PM
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const shopClockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
// Preview for reviewing states: on localhost only, ?at=Mon-12:30 shows the site at that shop time.
// (Ignored on the live site, so it can never be used to claim an offer.)
const PREVIEW_AT = (() => {
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return null;
  const m = /[?&]at=([A-Za-z]{3})-(\d{1,2}):(\d{2})/.exec(location.search);
  if (!m) return null;
  const day = DAY_SHORT.findIndex(d => d.toLowerCase() === m[1].toLowerCase());
  return day < 0 ? null : { day, hour: +m[2], minute: +m[3] };
})();
// → { day: Sun=0…Sat=6, hour: 0–23, minute: 0–59 } in shop time
function shopNow() {
  if (PREVIEW_AT) return { ...PREVIEW_AT };
  const parts = {};
  shopClockFormat.formatToParts(new Date()).forEach(p => { parts[p.type] = p.value; });
  return { day: DAY_SHORT.indexOf(parts.weekday), hour: parseInt(parts.hour, 10), minute: parseInt(parts.minute, 10) };
}
const hourOf = now => now.hour + now.minute / 60;

// "11 AM", "4:30 PM". Accepts decimal hours (16.5) or (hour, minute).
function fmtTime(h, m = 0) {
  const hh = Math.floor(h) % 24;
  const mm = m || Math.round((h - Math.floor(h)) * 60);
  return ((hh + 11) % 12 + 1) + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + (hh >= 12 ? 'PM' : 'AM');
}
// 2.5 → "2h 30m", 0.75 → "45m"
function fmtDuration(h) {
  const mins = Math.round(h * 60), hh = Math.floor(mins / 60), mm = mins % 60;
  return ((hh ? hh + 'h ' : '') + (mm || !hh ? mm + 'm' : '')).trim();
}

// Clears the old test-mode flag that earlier builds saved in a browser (safe to delete once every phone has loaded this once).
try { localStorage.removeItem('crosta_test_open'); } catch (_) { /* storage unavailable: nothing to clear */ }

// { open, closesAt, opensAt, opensDay } for a shop-time moment
function shopStatus(now = shopNow()) {
  const t = hourOf(now), [openAt, closeAt] = SHOP_HOURS[now.day];
  if (t >= openAt && t < closeAt) return { open: true, closesAt: closeAt };
  if (t < openAt) return { open: false, opensAt: openAt, opensDay: now.day, today: true };
  const day = (now.day + 1) % 7;
  return { open: false, opensAt: SHOP_HOURS[day][0], opensDay: day, today: false };
}
function shopStatusText(st = shopStatus()) {
  return st.open
    ? `Open now · closes ${fmtTime(st.closesAt)} · ready in about 30 min`
    : `Closed · opens ${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt)}`;
}

// ── PAYMENT ──
// The UPI ID customers pay (PhonePe business). Change it here and nowhere else.
const UPI = { id: 'Q226670399@ybl', name: 'The Crosta' };
