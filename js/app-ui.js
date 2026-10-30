// ── APP UI ──
// The pieces of the app-style ordering look that need script: the Menu button and its index sheet, the
// offer-progress bar above the phone cart bar, and the thumbnails on that bar. The cart drawer's extras
// (offer card, meal carousel, offers list, bill, delivery and payment sheets) are added below.
// Styles: css/app.css. Called from onCartChanged() in sheets.js, which updateFab() runs on every cart change.
(function () {
  const $ = id => document.getElementById(id);

  /* ───────── helpers ───────── */
  // the menu photo for a cart line ("Farm House Pizza", "Paneer Garlic Bread (Paneer Tikka)", free group-perk lines…)
  const baseName = n => n.replace(/\s*\([^)]*\)\s*$/, '').trim();
  window.imgForCartItem = function (it) {
    const hit = menuLookup(it.name) || menuLookup(baseName(it.name));
    return hit && hit.item.img ? hit.item.img : '';
  };

  /* ───────── offer-progress bar (phones, above the cart bar) ─────────
     One nudge at a time: the group perk (4 Medium/Large pizzas), then a spin prize that is waiting on the
     ₹100 minimum, then the student discount waiting on its minimum. */
  const ARC = 2 * Math.PI * 14;
  function unlockState() {
    const n = qualifyingPizzaCount(cart), need = GROUP_PERK_MIN_PIZZAS;
    if (n >= 1 && n < need) {
      const left = need - n;
      return { p: n / need, num: n + '/' + need, title: `Add ${left} more pizza${left > 1 ? 's' : ''} for a free meal`, sub: 'Medium or Large · free bread, fries & drink', offer: 'group' };
    }
    if (n >= need && resolveActivePromo(cart) === 'groupperk') {
      return { p: 1, num: '✓', title: 'Free meal bundle unlocked', sub: 'Garlic bread, fries and a 2 L drink', offer: 'group', done: true };
    }
    if (spinPrizeLocked(cart)) {
      const paid = paidTotal(cart);
      return { p: paid / SPIN_MIN, num: '₹' + paid, title: `Add ${rupee(SPIN_MIN - paid)} more for your spin prize`, sub: `Spin prizes need an order of ${rupee(SPIN_MIN)}` };
    }
    if (isStudentOn() && paidTotal(cart) < STUDENT_MIN) {
      const paid = paidTotal(cart);
      return { p: paid / STUDENT_MIN, num: '₹' + paid, title: `Add ${rupee(STUDENT_MIN - paid)} more for ${studentPercent()}% off`, sub: 'Thapar student discount · show your ID' };
    }
    return null;
  }
  function renderUnlock() {
    const el = $('unlock'), s = cart.length ? unlockState() : null;
    el.hidden = !s;
    document.body.classList.toggle('has-unlock', !!s);
    if (!s) return;
    el.classList.toggle('done', !!s.done);
    const arc = $('unlockArc');
    arc.style.strokeDasharray = ARC.toFixed(1);
    arc.style.strokeDashoffset = (ARC * (1 - Math.min(1, s.p))).toFixed(1);
    $('unlockNum').textContent = s.num;
    $('unlockTitle').textContent = s.title;
    $('unlockSub').textContent = s.sub;
    if (s.offer) el.dataset.offer = s.offer; else delete el.dataset.offer;   // the group perk opens its offer sheet (sheets.js)
  }

  /* ───────── cart bar thumbnails ───────── */
  function renderThumbs() {
    const seen = [];
    cart.forEach(i => { const s = window.imgForCartItem(i); if (s && !seen.includes(s)) seen.push(s); });
    $('cbThumbs').innerHTML = seen.slice(0, 3).map(s => `<img src="${s}" alt="">`).join('');
  }

  window.appCartChanged = function () {
    renderUnlock();
    renderThumbs();
  };

  /* ───────── Menu button + index sheet (phones) ───────── */
  const fab = $('menuFab'), menuEl = $('menu');
  if (menuEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => document.body.classList.toggle('menu-in-view', e.isIntersecting)), { rootMargin: '-25% 0px -25% 0px' }).observe(menuEl);
  }
  function indexRows() {
    return [...document.querySelectorAll('#chips .chip')].map(c => {
      const cat = c.dataset.cat, anchor = c.dataset.anchor;
      const scope = anchor ? $(anchor) : (cat === 'burgerswraps' ? $('qb-burgers') : $('tab-' + cat));
      return { cat, anchor: anchor || '', label: c.querySelector('span').textContent, img: c.querySelector('img').getAttribute('src'), n: scope ? scope.querySelectorAll('.menu-item').length : 0 };
    });
  }
  fab.addEventListener('click', () => {
    $('menuIndexList').innerHTML = indexRows().map(r =>
      `<button class="index-row" type="button" data-cat="${r.cat}"${r.anchor ? ` data-anchor="${r.anchor}"` : ''}><img src="${r.img}" alt="" width="44" height="44"><span>${r.label}</span><i>${r.n}</i><svg class="ui-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>`).join('');
    openSheetEl($('menuIndex'), fab);
  });
  // the page-wide [data-cat] handler in menu-ui.js does the jump; this just gets the sheet out of the way first
  $('menuIndexList').addEventListener('click', e => { if (e.target.closest('.index-row')) closeSheets(); });

  /* ═════════════════════ CART DRAWER ═════════════════════
     renderCart() (cart-render.js) draws the item rows and then calls renderCartExtras() below. The drawer has two
     steps: "cart" (review, offers, bill → Next) and "order" (delivery confirmed → pay bar + Order on WhatsApp).
     The inputs, payment panel and place-order code are the old ones; they just live in sheets now. */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };   // skip identical redraws: keeps scroll and focus
  const ic = d => `<svg class="ui-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    percent: 'M19 5 5 19M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    cap: 'm22 10-10-5L2 10l10 5zM6 12v5c3 2 9 2 12 0v-5',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    zap: 'M13 2 3 14h9l-1 8 10-12h-9z',
    gift: 'M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H8a2.5 2.5 0 1 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 1 0 0-5c-3 0-4 5-4 5z',
    check: 'M20 6 9 17l-5-5',
    plus: 'M12 5v14M5 12h14',
    store: 'm3 9 1.6-5h14.8L21 9M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9.5 20v-5h5v5',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    receipt: 'M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2zM8 8h8M8 12h8'
  };
  const PROMO_INFO = {
    weekday:   { icon: 'percent', label: 'Weekday lunch',    short: '20% off pizzas',   desc: '20% off every pizza, Mon to Wed, 11 AM to 3 PM.' },
    boost:     { icon: 'zap',     label: 'The Crosta Boost', short: 'meal for ₹30',     desc: 'Make a burger, wrap or sandwich a meal for ₹30, not ₹60. Daily, 4 to 6 PM.' },
    weekend:   { icon: 'gift',    label: 'Weekend special',  short: 'a free pizza',     desc: 'Buy 2 Large, get 1 Medium free (or 2 Medium, 1 Small). Same flavour. Saturday and Sunday.' },
    groupperk: { icon: 'users',   label: 'Group perk',       short: 'free meal bundle', desc: 'Garlic bread, fries and a 2 L drink are free with 4 or more Medium or Large pizzas.' },
    student:   { icon: 'cap',     label: 'Thapar student',   short: '',                 desc: 'Show your student ID card when you collect or we deliver.' }
  };
  // what the applied offer is worth on this cart, in rupees
  const savingOf = (T, p) => p === 'weekday' ? T.pizzaDiscount : p === 'boost' ? T.boostDiscount : p === 'student' ? T.studentDiscount : p === 'weekend' ? promoSaving(cart, 'weekend') : p === 'groupperk' ? groupPerkValue() : 0;
  const isFreeOffer = p => p === 'weekend' || p === 'groupperk';

  /* ── offer card on top ── */
  function renderOfferCard(T) {
    const p = T.activePromo, el = $('cartOfferCard');
    if (!p) { setHTML(el, ''); return; }
    const info = PROMO_INFO[p], short = p === 'student' ? studentPercent() + '% off' : info.short;
    setHTML(el, `<div class="cart-card offer-card"><div class="oc-row"><span class="oc-ic">${ic(IC[info.icon])}</span>
      <div class="t"><span class="lab">OFFER APPLIED</span><b>${esc(info.label)} · ${esc(short)}</b><small>Applied automatically</small></div>
      <div class="oc-r"><span class="pill ok">${ic(IC.check)}APPLIED</span><span class="save">${isFreeOffer(p) ? 'FREE' : '−' + rupee(savingOf(T, p))}</span></div></div></div>`);
  }

  /* ── "Make it a meal" ideas ── */
  const MEAL = ['Salted Fries', 'Cheesy Garlic Bread', 'Coke', 'Oreo Crumble Shake', 'Cheese Fries'];
  function mealItems() {
    return MEAL.map(menuLookup).filter(Boolean).map(h => {
      const it = h.item, labels = (it.priceNote || '').split('/').map(s => s.trim()), multi = it.prices.length > 1;
      const size = multi ? labels[0] : 'std';
      return { name: it.name, size, price: it.prices[0], img: it.img, label: multi && /\d/.test(size) ? it.name + ' ' + size : it.name };
    });
  }
  function renderMeal() {
    const card = $('cartMealCard'), el = $('cartMeal'), items = mealItems();
    const added = n => cart.some(i => i.name === n);
    card.hidden = !items.length || items.every(m => added(m.name));
    const sl = el.scrollLeft;
    setHTML(el, items.map(m => {
      const on = added(m.name);
      return `<div class="mc"><div class="mc-ph"><img src="${esc(m.img)}" alt="" loading="lazy"><i class="ui-veg"></i>
        <button class="mc-add${on ? ' on' : ''}" type="button" ${on ? 'disabled aria-label="' + esc(m.label) + ' is in your cart"' : `aria-label="Add ${esc(m.label)}, ${rupee(m.price)}" data-name="${esc(m.name)}" data-size="${esc(m.size)}" data-price="${m.price}"`}>${ic(on ? IC.check : IC.plus)}</button></div>
        <b>${esc(m.label)}</b><span>${rupee(m.price)}</span></div>`;
    }).join(''));
    el.scrollLeft = sl;
  }
  $('cartMeal').addEventListener('click', e => {
    const b = e.target.closest('.mc-add[data-name]'); if (!b) return;
    addItem(b.dataset.name, b.dataset.size, +b.dataset.price, false, false, { popup: false, quiet: false });
  });

  /* ── offers list: what is on, what is applied, and why ── */
  const coRow = (key, title, sub, action, dim) =>
    `<div class="co-row${dim ? ' dim' : ''}"><span class="co-ic${dim ? ' mut' : ''}">${ic(IC[key])}</span><div class="t"><b>${title}</b><small>${sub}</small></div>${action || ''}</div>`;
  const pillOk = `<span class="pill ok">${ic(IC.check)}APPLIED</span>`;
  const pillGo = (id, text) => `<button class="pill go" type="button" data-offer="${id}">${text}</button>`;
  const pillOff = text => `<span class="pill off">${text}</span>`;
  const whenText = s => s.k === 'later' ? fmtTime(s.start) : `${DAY_SHORT[s.day]} ${fmtTime(s.start)}`;
  function renderOffers(T) {
    const promo = T.activePromo, now = shopNow(), rows = [];
    const states = ['lunch', 'weekend', 'boost'].map(id => ({ o: offerById(id), s: offerState(offerById(id), now) }));
    const live = states.filter(x => x.s.k === 'live');
    const soon = states.filter(x => x.s.k !== 'live').sort((a, b) => (a.s.k === 'later' ? a.s.start : a.s.i * 24 + a.s.start) - (b.s.k === 'later' ? b.s.start : b.s.i * 24 + b.s.start))[0];
    const other = p => promo && promo !== p ? `Not used: ${PROMO_LABEL[promo]} applies (one offer per order).` : '';
    const rowFor = ({ o, s }) => {
      const upcoming = s.k !== 'live';
      if (o.id === 'lunch') {
        if (upcoming) return coRow('percent', 'Weekday lunch', `20% off every pizza · ${o.stub}`, pillOff(whenText(s)), true);
        if (promo === 'weekday') return coRow('percent', 'Weekday lunch', `20% off every pizza · you save <i>${rupee(T.pizzaDiscount)}</i>`, pillOk);
        return coRow('percent', 'Weekday lunch', other('weekday') || 'Add any pizza and 20% comes off.', promo ? '' : pillGo('lunch', 'ADD PIZZA'), !!promo);
      }
      if (o.id === 'weekend') {
        if (upcoming) return coRow('gift', 'Weekend special', `Buy 2 Large, get 1 Medium free · ${o.stub}`, pillOff(whenText(s)), true);
        if (promo === 'weekend') return coRow('gift', 'Weekend special', `A free pizza is in your order · worth <i>${rupee(promoSaving(cart, 'weekend'))}</i>`, pillOk);
        return coRow('gift', 'Weekend special', other('weekend') || 'Buy 2 Large, get 1 Medium free (same flavour).', promo ? '' : pillGo('weekend', 'ADD'), !!promo);
      }
      if (upcoming) return coRow('zap', 'The Crosta Boost', `Burger, wrap or sandwich meal for ₹30, not ₹60 · ${o.stub}, ${fmtTime(o.from)} to ${fmtTime(o.to)}`, pillOff(whenText(s)), true);
      if (promo === 'boost') return coRow('zap', 'The Crosta Boost', `Meal upgrade for ₹30, not ₹60 · you save <i>${rupee(T.boostDiscount)}</i>`, pillOk);
      return coRow('zap', 'The Crosta Boost', other('boost') || 'Make a burger, wrap or sandwich a meal for ₹30, not ₹60.', promo ? '' : pillGo('boost', 'ADD MEAL'), !!promo);
    };
    live.forEach(x => rows.push(rowFor(x)));
    const n = qualifyingPizzaCount(cart), need = GROUP_PERK_MIN_PIZZAS;
    if (promo === 'groupperk') rows.push(coRow('users', 'Group perk', 'Free garlic bread, fries and 2 L drink are in your order.', pillOk));
    else if (n >= need) rows.push(coRow('users', 'Group perk', other('groupperk'), '', true));
    else rows.push(coRow('users', 'Group perk', `Add ${need - n} more Medium or Large pizza${need - n > 1 ? 's' : ''} for a free garlic bread, fries and 2 L drink (${rupee(groupPerkValue())}).${promo ? ' Used instead of ' + PROMO_LABEL[promo].toLowerCase() + '.' : ''}`, pillGo('group', 'ADD')));
    if (soon) rows.push(rowFor(soon));
    setHTML($('cartOffersList'), rows.join(''));
  }
  // an offer sheet opens over the menu, so tuck the cart away first (the sheet's "View cart" button brings it back)
  $('cartOffersList').addEventListener('click', e => { if (e.target.closest('[data-offer]')) closeCart(); }, true);

  /* ── bill ── */
  function renderBill(T) {
    const p = T.activePromo, rows = [`<div class="rw"><span>Item total</span><span>${rupee(T.subtotal)}</span></div>`];
    if (T.discount > 0) rows.push(`<div class="rw sv"><span>${esc(PROMO_LABEL[p])}</span><span>−${rupee(T.discount)}</span></div>`);
    else if (isFreeOffer(p)) rows.push(`<div class="rw sv"><span>${esc(PROMO_LABEL[p])}</span><span>free items added</span></div>`);
    rows.push(`<div class="rw tot"><span>To pay</span><span>${rupee(T.total)}</span></div>`);
    setHTML($('cartBill'), `<div class="cc-h"><span class="cc-ic">${ic(IC.receipt)}</span><h3>Bill details</h3></div>${rows.join('')}`);
  }

  /* ── delivery / pickup, and which footer is showing ── */
  let confirmed = false;
  const drawer = $('cartDrawer');
  function renderDeliver() {
    const el = $('cartDeliver');
    if (!confirmed) { setHTML(el, ''); return; }
    const addr = $('custAddress').value.trim(), who = [$('custName').value.trim(), $('custPhone').value.trim()].filter(Boolean).join(' · ');
    setHTML(el, `<button class="cart-card dl-card" type="button" data-edit-delivery><span class="cc-ic">${ic(isPickup ? IC.store : IC.pin)}</span>
      <span class="t"><b>${isPickup ? 'Pickup at the shop' : 'Delivery to ' + esc(addr)}</b><small>Ready in about 25–35 min · ${esc(who)}</small></span><span class="dl-change">Change</span></button>`);
  }
  function syncPayLabel() {
    const upi = payMethod === 'upi';
    $('payUsingTag').textContent = upi ? 'UPI' : 'CASH';
    $('payUsingText').textContent = upi ? 'Pay now' : (isPickup ? 'At pickup' : 'On delivery');
  }
  window.renderCartExtras = function () {
    const T = computeCartTotals(cart), n = cart.reduce((s, i) => s + i.qty, 0);
    $('cartHeadSub').textContent = `${n} item${n === 1 ? '' : 's'} · The Crosta`;
    renderOfferCard(T); renderMeal(); renderOffers(T); renderBill(T); renderDeliver(); syncPayLabel();
    $('cartFooter').dataset.step = confirmed ? 'order' : 'cart';
  };

  /* ── sheets inside the cart (delivery, payment, offer unlocked) ── */
  const dsheets = ['deliverySheet', 'paySheet', 'unlockedSheet'];
  function openD(id) {
    dsheets.forEach(s => $(s).classList.remove('open'));
    $('cartDim').classList.add('open'); $(id).classList.add('open'); drawer.classList.add('dopen');
    $(id).focus({ preventScroll: true });
  }
  function closeD() {
    dsheets.forEach(s => $(s).classList.remove('open'));
    $('cartDim').classList.remove('open'); drawer.classList.remove('dopen');
  }
  drawer.addEventListener('click', e => {
    if (e.target.closest('[data-dclose]') || e.target === $('cartDim')) closeD();
    else if (e.target.closest('[data-edit-delivery]')) openDelivery();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.querySelector('.dsheet.open')) { e.stopPropagation(); closeD(); } }, true);

  function syncSeg() {
    $('segDelivery').classList.toggle('on', !isPickup); $('segDelivery').setAttribute('aria-pressed', String(!isPickup));
    $('segPickup').classList.toggle('on', isPickup); $('segPickup').setAttribute('aria-pressed', String(isPickup));
    $('deliveryFields').hidden = isPickup; $('pickupCard').hidden = !isPickup;
  }
  function openDelivery() { syncSeg(); openD('deliverySheet'); }
  $('segDelivery').addEventListener('click', () => { if (isPickup) togglePickup(); syncSeg(); });
  $('segPickup').addEventListener('click', () => { if (!isPickup) togglePickup(); syncSeg(); });
  $('cartNext').addEventListener('click', openDelivery);
  $('payUsing').addEventListener('click', () => openD('paySheet'));
  document.addEventListener('click', e => { if (e.target.closest('.pay-opt')) syncPayLabel(); });
  $('noteToggle').addEventListener('click', () => {
    const box = $('cartNoteBox'); box.hidden = !box.hidden;
    $('noteToggle').setAttribute('aria-expanded', String(!box.hidden));
    if (!box.hidden) $('custNote').focus();
  });

  $('dsConfirm').addEventListener('click', () => {
    const name = $('custName'), phone = $('custPhone'), addr = $('custAddress');
    let first = null;
    if (!name.value.trim())  { showFieldError(name, 'Please enter your name'); first = first || name; }
    if (!phone.value.trim()) { showFieldError(phone, 'Please enter your phone number'); first = first || phone; }
    if (!isPickup && !addr.value.trim()) { showFieldError(addr, 'Enter a delivery address or choose Pickup'); first = first || addr; }
    if (first) { first.focus(); return; }
    confirmed = true; closeD(); renderCartExtras();
  });
  // placeOrder() sends people here when something is missing (it used to scroll to the form)
  window.scrollToDetails = function () { openDelivery(); setTimeout(() => $('custName').focus(), 350); };

  /* ── "offer unlocked": once per offer per visit, when the cart opens ── */
  const celebrated = new Set();
  try { JSON.parse(sessionStorage.getItem('crosta_seen_promos') || '[]').forEach(p => celebrated.add(p)); } catch (_) { /* no storage: it just shows once per page load */ }
  function celebrate() {
    const T = computeCartTotals(cart), p = T.activePromo;
    if (!p || celebrated.has(p)) return;
    const amt = savingOf(T, p); if (!amt) return;
    celebrated.add(p);
    try { sessionStorage.setItem('crosta_seen_promos', JSON.stringify([...celebrated])); } catch (_) { /* fine */ }
    const info = PROMO_INFO[p];
    $('unSave').textContent = rupee(amt);
    $('unText').innerHTML = `<b>${esc(p === 'student' ? 'Thapar student ' + studentPercent() + '%' : info.label)}:</b> ${esc(info.desc)} Applied automatically. One offer per order.`;
    openD('unlockedSheet');
  }

  // opening the cart starts at step 1; closing it tucks the sheets away
  const _openCart = window.openCart, _closeCart = window.closeCart;
  window.openCart = function () {
    confirmed = false; closeD();
    _openCart();
    if (typeof renderCart === 'function') renderCart();
    setTimeout(() => { if (drawer.classList.contains('open') && cart.length) celebrate(); }, 520);
  };
  window.closeCart = function () { closeD(); _closeCart(); };
})();
