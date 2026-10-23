// ── OFFERS ──
// The four offers: when they run (used by the cart promos in promos.js, the
// header tickets and the clock strip) and how they are presented.
// days: Sun=0…Sat=6. from/to: shop-time hours; omit both for "whole opening
// day"; `always` for an offer with no time window.
const OFFERS = [
  { id:'weekend', name:'Weekend special', head:'Buy 2 Large, get 1 Medium free',
    desc:'Same flavour. Or buy 2 Medium, get 1 Small free.',
    days:[0, 6], stub:'Sat · Sun', t1:'All day', lane:'Weekend special', laneSub:'Sat & Sun', band:'Buy 2 get 1 free',
    pie:'images/hero-garlic-butter-pizza.webp' },
  { id:'lunch', name:'Weekday lunch', head:'20% off every pizza',
    desc:'Monday to Wednesday, 11 AM to 3 PM.',
    days:[1, 2, 3], from:11, to:15, stub:'Mon–Wed', t1:'11 AM', t2:'3 PM', lane:'Weekday lunch', laneSub:'Mon–Wed', band:'20% off pizzas',
    pie:'images/hero-farm-house-pizza.webp' },
  { id:'boost', name:'The Crosta Boost', head:'Make it a meal for ₹30, not ₹60',
    desc:'Fries and a 250 ml cold drink with any burger, wrap or sandwich.',
    days:[0, 1, 2, 3, 4, 5, 6], from:16, to:18, stub:'Daily', t1:'4 PM', t2:'6 PM', lane:'The Crosta Boost', laneSub:'Daily', band:'Meal for ₹30',
    pie:'images/hero-the-crosta-burger.webp' },
  { id:'group', name:'Group perk', head:'4+ Medium or Large pizzas? Free meal bundle',
    desc:'Garlic bread, fries and a 2 L cold drink.',
    days:[0, 1, 2, 3, 4, 5, 6], always:true, stub:'Every day', t1:'Always on', lane:'Group perk', laneSub:'Every day', band:'Free meal bundle',
    pie:'images/hero-garlic-butter-pizza.webp' }
];
const offerById = id => OFFERS.find(o => o.id === id);

// the [start, end] hours an offer runs on a given day, or null if it doesn't
function offerWindow(o, day) {
  if (!o.days.includes(day)) return null;
  const [open, close] = SHOP_HOURS[day];
  if (o.always || o.from == null) return [open, close];
  return [Math.max(o.from, open), Math.min(o.to, close)];
}
// { k:'live', start, end, left } | { k:'later', start, inH } | { k:'next', day, start, i }
function offerState(o, now = shopNow()) {
  const t = hourOf(now), [open, close] = SHOP_HOURS[now.day], isOpen = t >= open && t < close, w = offerWindow(o, now.day);
  if (w) {
    if (isOpen && t >= w[0] && t < w[1]) return { k:'live', start:w[0], end:w[1], left:w[1] - t };
    if (t < w[0]) return { k:'later', start:w[0], inH:w[0] - t };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (now.day + i) % 7, w2 = offerWindow(o, d);
    if (w2) return { k:'next', day:d, start:w2[0], i };
  }
}
const isOfferLive = (id, now = shopNow()) => offerState(offerById(id), now).k === 'live';
