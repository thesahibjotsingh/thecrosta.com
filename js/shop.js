// ── SHOP FACTS ──
// Opening hours and the shop's clock. One source for the header status, the
// offer windows (offers.js), the cart promos (promos.js) and the clock strip.
// Hours are 24-hour numbers in shop time (Asia/Kolkata), not the visitor's.
const SHOP_TIMEZONE = 'Asia/Kolkata';
const SHOP_HOURS = { 0:[10,22], 1:[11,22], 2:[11,22], 3:[11,22], 4:[11,22], 5:[11,23], 6:[10,23] }; // Sun…Sat → [open, close]
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const shopClockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
// → { day: Sun=0…Sat=6, hour: 0–23, minute: 0–59 } in shop time
function shopNow() {
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
