// ── SHEETS: size picker + "use this offer" ──
// Bottom sheets on phones, centred dialogs on desktop. They add to the real
// cart through addItem(), so promos, totals and the WhatsApp order all agree.

const SZ_LABEL = { '8″': 'Regular 8″', '10″': 'Medium 10″', '12″': 'Large 12″' };
const scrimEl = $('scrim'), sizeSheet = $('sheet'), offerSheet = $('offerSheet');
let sheetTrigger = null, sizeEntry = null, sizePick = 0, offerId = null;

function openSheetEl(el, trigger) {
  sheetTrigger = trigger || null;
  sizeSheet.classList.remove('open'); offerSheet.classList.remove('open');
  scrimEl.classList.add('open'); el.classList.add('open'); document.body.classList.add('locked');
  el.focus({ preventScroll: true });
}
function closeSheets() {
  scrimEl.classList.remove('open'); sizeSheet.classList.remove('open'); offerSheet.classList.remove('open');
  document.body.classList.remove('locked');
  if (sheetTrigger && document.contains(sheetTrigger)) sheetTrigger.focus({ preventScroll: true });
  sheetTrigger = null;
}
scrimEl.addEventListener('click', closeSheets);
document.addEventListener('keydown', e => {
  const act = document.querySelector('.sheet.open'); if (!act) return;
  if (e.key === 'Escape') closeSheets();
  if (e.key === 'Tab') {
    const f = [...act.querySelectorAll('button:not([hidden])')], first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ───────────── size sheet ───────────── */
// turn a menu item into the options the sheet shows
function sizeEntryFor(name, hit, img) {
  const it = hit.item, labels = (it.priceNote || '').split('/').map(s => s.trim());
  const multi = it.prices.length > 1;
  const opts = it.prices.map((price, i) => ({ size: multi ? labels[i] : 'std', label: multi ? (SZ_LABEL[labels[i]] || labels[i]) : '', price }));
  const isPizza = hit.panelId === 'pizzas', isMealEligible = hit.panelId === 'burgerswraps';
  return {
    name, img, opts, isPizza, isMealEligible,
    def: opts.length === 3 ? 1 : 0,
    note: isPizza ? 'Next you can add extra cheese or toppings.' : (opts.some(o => o.size === 'Meal') ? 'Meal adds crispy fries and a 250 ml cold drink.' : '')
  };
}
function renderSizeSheet() {
  const e = sizeEntry;
  $('sheetOpts').innerHTML = e.opts.map((o, i) => `<button class="opt" type="button" role="radio" aria-checked="${i === sizePick}" data-i="${i}"><span>${o.label}</span><span class="p">${rupee(o.price)}</span></button>`).join('');
  $('sheetAdd').textContent = `Add to cart · ${rupee(e.opts[sizePick].price)}`;
}
function openSizeSheet(entry, trigger) {
  sizeEntry = entry; sizePick = entry.def;
  $('sheetTitle').textContent = entry.name;
  $('sheetImg').src = entry.img; $('sheetImg').alt = '';
  $('sheetNote').textContent = entry.note;
  renderSizeSheet();
  openSheetEl(sizeSheet, trigger);
}
$('sheetOpts').addEventListener('click', e => {
  const b = e.target.closest('.opt'); if (!b) return;
  sizePick = +b.dataset.i; renderSizeSheet();
  document.querySelector('#sheetOpts .opt[aria-checked="true"]').focus();
});
$('sheetAdd').addEventListener('click', () => {
  const e = sizeEntry, o = e.opts[sizePick];
  addItem(e.name, o.size, o.price, e.isPizza, e.isMealEligible, { fromEl: $('sheetImg'), img: e.img });   // pizzas then offer add-ons, as on the menu
  closeSheets();
});

// "+" on a bestseller: pick a size if there is more than one, else add straight away
function quickAdd(name, hit, imgEl, imgSrc, trigger) {
  const entry = sizeEntryFor(name, hit, imgSrc);
  if (entry.opts.length > 1) { openSizeSheet(entry, trigger); return; }
  const o = entry.opts[0];
  addItem(name, o.size, o.price, entry.isPizza, entry.isMealEligible, { fromEl: imgEl, img: imgSrc });
}

/* ───────────── offer sheet ───────────── */
const OFFER_PIZZAS = ['Farm House Pizza', 'Crosta Garlic Butter Pizza', 'Corn Cheese Pizza'];
const OFFER_MEALS  = ['The Crosta Burger', 'Pizza Burger', 'Paneer Burger'];
const sizesOf = hit => { const labels = (hit.item.priceNote || '').split('/').map(s => s.trim()); return hit.item.prices.map((p, i) => ({ size: labels[i], price: p })); };

function offerRows(id) {
  const pill = (attrs, text) => `<button class="opill" type="button" ${attrs}>${text}</button>`;
  const row = (hit, sub, pills) => `<div class="orow"><img src="${hit.item.img}" alt=""><div><b>${hit.item.name}</b><span class="mono">${sub}</span></div><div class="opills">${pills}</div></div>`;
  if (id === 'boost') {
    return OFFER_MEALS.map(menuLookup).filter(Boolean).map(hit => {
      const meal = sizesOf(hit).find(s => s.size === 'Meal');
      return meal ? row(hit, 'Meal adds fries + 250 ml drink', pill(`data-kind="meal" data-name="${hit.item.name}" data-size="Meal" data-qty="1"`, `Add as meal · ${rupee(meal.price)}`)) : '';
    }).join('');
  }
  return OFFER_PIZZAS.map(menuLookup).filter(Boolean).map(hit => {
    const sizes = sizesOf(hit), p = s => (sizes.find(x => x.size === s) || {}).price;
    if (id === 'weekend') {
      return row(hit, 'Same flavour twice',
        pill(`data-kind="pizza" data-name="${hit.item.name}" data-size="12″" data-qty="2"`, `Buy 2 Large · ${rupee(2 * p('12″'))}`) +
        pill(`data-kind="pizza" data-name="${hit.item.name}" data-size="10″" data-qty="2"`, `Buy 2 Medium · ${rupee(2 * p('10″'))}`));
    }
    const wanted = id === 'group' ? ['10″', '12″'] : ['8″', '10″', '12″'];
    return row(hit, `from ${rupee(p('8″'))}`, wanted.map(s => pill(`data-kind="pizza" data-name="${hit.item.name}" data-size="${s}" data-qty="1"`, `${s} · ${rupee(p(s))}`)).join(''));
  }).join('');
}

function offerProgress(o, st) {
  if (st.k !== 'live') return '';
  const T = computeCartTotals(cart), promo = T.activePromo;
  const otherApplied = promo ? `<b>${PROMO_LABEL[promo]}</b> is already applied — one offer per order.` : '';
  if (o.id === 'group') {
    const n = qualifyingPizzaCount(cart), on = n >= GROUP_PERK_MIN_PIZZAS;
    const msg = on ? (promo === 'groupperk' ? '<b>Unlocked:</b> free meal bundle (garlic bread, fries, 2 L cold drink).' : `You’ve reached ${GROUP_PERK_MIN_PIZZAS}, but ${otherApplied}`)
                   : `<b>${n} of ${GROUP_PERK_MIN_PIZZAS}</b> Medium or Large pizzas — ${GROUP_PERK_MIN_PIZZAS - n} to go.`;
    const bars = Array.from({ length: GROUP_PERK_MIN_PIZZAS }, (_, i) => `<i class="${i < Math.min(n, GROUP_PERK_MIN_PIZZAS) ? 'on' : ''}"></i>`).join('');
    return `${msg}<div class="meter" aria-hidden="true">${bars}</div>`;
  }
  if (o.id === 'lunch') return promo === 'weekday' ? `<b>You’re saving ${rupee(T.pizzaDiscount)}</b> on your pizzas.` : (promo ? otherApplied : 'Add any pizza and 20% comes off automatically.');
  if (o.id === 'weekend') {
    const deal = promo === 'weekend' ? findWeekendSpecialDeal(cart) : null;
    return deal ? `<b>Free ${deal.freeSizeLabel} ${deal.flavour}</b> — you save ${rupee(deal.freePrice)}.` : (promo ? otherApplied : 'Add 2 of the same pizza in Large (or Medium) and the free one is added for you.');
  }
  if (o.id === 'boost') {
    const meals = cart.filter(i => i.isMealEligible && i.size === 'Meal').reduce((s, i) => s + i.qty, 0);
    return promo === 'boost' ? `<b>${meals} meal upgrade${meals > 1 ? 's' : ''}</b> — you save ${rupee(T.boostDiscount)}.` : (promo ? otherApplied : 'Pick “Add as meal” and the upgrade costs ₹30 instead of ₹60.');
  }
  return '';
}
function renderOffer() {
  const o = offerById(offerId), st = offerState(o);
  const stat = $('offerStat');
  stat.className = 'ostat' + (st.k === 'live' ? '' : ' off');
  stat.textContent = st.k === 'live' ? (o.always ? 'Always on' : (o.from == null ? 'Live · all day' : `Live now · ends ${fmtTime(st.end)}`))
                   : (st.k === 'later' ? `Starts ${fmtTime(st.start)} · in ${fmtDuration(st.inH)}` : `Next · ${DAY_SHORT[st.day]} ${fmtTime(st.start)}`);
  $('offerTitle').textContent = o.head;
  $('offerSub').textContent = o.name + ' — ' + o.desc;
  const prog = offerProgress(o, st), pe = $('offerProg');
  pe.innerHTML = prog; pe.hidden = !prog;
  const list = $('offerList');
  if (list.dataset.for !== o.id) { list.innerHTML = offerRows(o.id); list.dataset.for = o.id; }   // rebuilt only when the offer changes, so scroll and focus stay put
  const count = cart.reduce((s, i) => s + i.qty, 0), T = computeCartTotals(cart);
  $('offerDone').textContent = count ? `View cart · ${rupee(T.total)}` : 'Keep browsing';
  $('offerNote').textContent = st.k === 'live' ? 'One offer per order — we apply the best one that fits your cart.' : 'Not live yet — add items now and it applies automatically when it starts.';
}
function openOffer(id, trigger) {
  offerId = id; $('offerList').dataset.for = '';
  renderOffer();
  openSheetEl(offerSheet, trigger);
}
// the cart changed (anywhere): keep an open offer sheet's progress current
function onCartChanged() {
  if (offerSheet.classList.contains('open')) renderOffer();
  if (typeof syncStudentUi === 'function') syncStudentUi();
}

offerSheet.addEventListener('click', e => {
  const b = e.target.closest('.opill'); if (!b) return;
  const { kind, name, size, qty } = b.dataset, imgEl = b.closest('.orow').querySelector('img');
  const hit = menuLookup(name); if (!hit) return;
  const price = (sizesOf(hit).find(s => s.size === size) || {}).price; if (price == null) return;
  addItem(name, size, price, kind === 'pizza', kind === 'meal', { qty: +qty, popup: false, fromEl: imgEl, img: hit.item.img });
});
$('offerDone').addEventListener('click', () => {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  closeSheets();
  if (count) openCart();
});

// any offer — ticket, link, clock bar or clock label — opens it
document.addEventListener('click', e => {
  const t = e.target.closest('[data-offer]'); if (!t) return;
  openOffer(t.dataset.offer, e.target.closest('button') || t);
});
