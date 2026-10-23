// Offer windows live in offers.js and the shop clock in shop.js, so the cart
// discounts, the header tickets and the clock strip can never disagree.
// ── WEEKDAY LUNCH OFFER: Mon–Wed, 11:00–15:00 shop time, 20% off pizzas ──
function isWeekdayLunchOfferActive() { return isOfferLive('lunch'); }

// ── GROUP PERK: order 4+ Medium/Large pizzas → free Complete Meal Bundle ──
// Medium = 10″, Large = 12″ (see pizza size legend above the menu).
const GROUP_PERK_SIZES = ['10″', '12″'];
const GROUP_PERK_MIN_PIZZAS = 4;
const GROUP_PERK_BUNDLE_ITEMS = [
  { key: 'groupperk-garlicbread', name: '🥖 Cheesy Garlic Bread (Group Perk)' },
  { key: 'groupperk-fries',       name: '🍟 Regular Fries (Group Perk)' },
  { key: 'groupperk-colddrink',   name: '🥤 2L Cold Drink (Group Perk)' },
];

function qualifyingPizzaCount(cartArr) {
  return cartArr.reduce((s, i) => s + ((i.isPizza && GROUP_PERK_SIZES.includes(i.size)) ? i.qty : 0), 0);
}

// Keeps the free bundle line-items in sync with cart contents: adds them the
// moment an order qualifies, removes them the moment it no longer does.
// Runs on every renderCart() call, so it stays correct after any cart change.
// Skipped whenever a higher-priority promo (Weekend Special) is active.
function syncGroupPerkBundle() {
  const qualifies = resolveActivePromo(cart) === 'groupperk';
  const hasBundle = cart.some(i => i.isGroupPerk);

  if (qualifies && !hasBundle) {
    GROUP_PERK_BUNDLE_ITEMS.forEach(b => {
      cart.push({ id: b.key, _key: b.key, name: b.name, size: '', price: 0, qty: 1, addons: [], isGroupPerk: true });
    });
  } else if (!qualifies && hasBundle) {
    cart = cart.filter(i => !i.isGroupPerk);
  }
  return qualifies;
}

// ── WEEKEND SPECIAL: Sat & Sun only — Buy 2 Large get 1 Medium free, or Buy 2
// Medium get 1 Small free (same flavour only). One free pizza per order.
const PIZZA_PRICE_TABLE = {}; // name → { '8″': price, '10″': price, '12″': price }, built at page load
function isWeekendSpecialActive() { return isOfferLive('weekend'); }

// Looks at the real (non-promo) pizzas in the cart and returns the single
// best qualifying free-pizza spec — { flavour, freeSize, freeSizeLabel, freePrice } —
// or null if it's not the weekend or nothing qualifies yet.
function findWeekendSpecialDeal(cartArr) {
  if (!isWeekendSpecialActive()) return null;

  const groups = {}; // flavour name → { large, medium }
  cartArr.forEach(i => {
    if (!i.isPizza || i.isWeekendSpecial || i.isGroupPerk || i.isFreeSpinPrize) return;
    if (!groups[i.name]) groups[i.name] = { large: 0, medium: 0 };
    if (i.size === '12″') groups[i.name].large += i.qty;
    else if (i.size === '10″') groups[i.name].medium += i.qty;
  });

  const candidates = [];
  Object.keys(groups).forEach(name => {
    const g = groups[name];
    const prices = PIZZA_PRICE_TABLE[name] || {};
    if (g.large >= 2 && prices['10″'] != null) {
      candidates.push({ flavour: name, freeSize: '10″', freeSizeLabel: 'Medium', freePrice: prices['10″'] });
    }
    if (g.medium >= 2 && prices['8″'] != null) {
      candidates.push({ flavour: name, freeSize: '8″', freeSizeLabel: 'Small', freePrice: prices['8″'] });
    }
  });

  if (candidates.length === 0) return null;
  // Only one free pizza per order — give the most valuable qualifying option.
  candidates.sort((a, b) => b.freePrice - a.freePrice);
  return candidates[0];
}

// Keeps the single free weekend-special pizza in sync with cart contents.
function syncWeekendSpecialBundle() {
  const deal = resolveActivePromo(cart) === 'weekend' ? findWeekendSpecialDeal(cart) : null;
  const existing = cart.find(i => i.isWeekendSpecial);
  const dealKey = deal ? ('weekendspecial|' + deal.flavour + '|' + deal.freeSize) : null;

  if (deal && (!existing || existing._key !== dealKey)) {
    cart = cart.filter(i => !i.isWeekendSpecial); // drop a stale free pizza (e.g. flavour/size changed)
    cart.push({
      id: dealKey, _key: dealKey,
      name: `${deal.flavour} (Weekend Special — Free ${deal.freeSizeLabel})`,
      size: deal.freeSize, price: 0, qty: 1, addons: [],
      isWeekendSpecial: true
    });
  } else if (!deal && existing) {
    cart = cart.filter(i => !i.isWeekendSpecial);
  }
  return !!deal;
}

// ── THE CROSTA BOOST: daily 4:00 PM – 6:00 PM, meal-upgrade for ₹30 instead of ₹60 ──
// Applies to any Burger/Wrap/Sandwich line that's been sized up to "Meal"
// (the menu already prices Single vs Meal ₹60 apart — this offer refunds ₹30
// of that upcharge per qualifying unit while the window is active).
const CROSTA_BOOST_SAVING_PER_UNIT = 30;
function isCrostaBoostActive() { return isOfferLive('boost'); }

// ── MASTER PROMO RESOLVER ──
// Per the site-wide Terms & Conditions: "Only one discount or promotional
// offer can be applied per order. Offers cannot be combined." This is the
// single source of truth for which one (if any) promo applies to an order —
// every other offer function must go through this instead of deciding on
// its own, so two offers can never both fire on the same order.
// Priority (highest first): Weekend Special > Group Perk > Weekday Lunch > Crosta Boost.
function resolveActivePromo(cartArr) {
  if (findWeekendSpecialDeal(cartArr)) return 'weekend';
  if (qualifyingPizzaCount(cartArr) >= GROUP_PERK_MIN_PIZZAS) return 'groupperk';
  if (isWeekdayLunchOfferActive() && cartArr.some(i => i.isPizza)) return 'weekday';
  if (isCrostaBoostActive() && cartArr.some(i => i.isMealEligible && i.size === 'Meal')) return 'boost';
  return null;
}

// Computes subtotal / discount / final total for a cart array. Exactly one
// of offerActive / boostActive / groupPerkActive / weekendSpecialActive can
// ever be true at once (see resolveActivePromo above).
function computeCartTotals(cartArr) {
  const activePromo = resolveActivePromo(cartArr);
  const weekendSpecialActive = activePromo === 'weekend';
  const groupPerkActive = activePromo === 'groupperk';
  const offerActive = activePromo === 'weekday';
  const boostActive = activePromo === 'boost';
  let subtotal = 0;
  let pizzaDiscount = 0;
  let boostDiscount = 0;
  cartArr.forEach(i => {
    const addonsTotal = (i.addons || []).reduce((a, b) => a + b.price, 0);
    const lineTotal = (i.price + addonsTotal) * i.qty;
    subtotal += lineTotal;
    if (offerActive && i.isPizza) pizzaDiscount += lineTotal * 0.20;
    if (boostActive && i.isMealEligible && i.size === 'Meal') boostDiscount += CROSTA_BOOST_SAVING_PER_UNIT * i.qty;
  });
  pizzaDiscount = Math.round(pizzaDiscount);
  const discount = pizzaDiscount + boostDiscount;
  return { subtotal, pizzaDiscount, boostDiscount, discount, total: subtotal - discount, offerActive, boostActive, groupPerkActive, weekendSpecialActive, activePromo };
}
