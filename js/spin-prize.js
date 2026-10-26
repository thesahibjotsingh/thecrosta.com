// ── SPIN PRIZES THAT NEED A PICK: the free veggie topping and the free 250 ml drink ──
// The spin machine (spin-3d.js) only decides WHAT was won. This file turns "Extra Topping" and
// "Free Cold Drink" into something the shop can serve:
//   · the win is remembered as a pending prize (this device, 24h, same as the spin lock)
//   · the win dialog lets the customer put it on a pizza / pick the drink right away
//   · or they can skip it: the menu then reminds them it is ₹0 (pizza cards, the Coke/Water 250 ml rows,
//     the add-on sheet) and the first pizza or drink they add gets it
//   · one use only: once it is in the cart it is spent; remove it and it comes back; it is cleared when the order is sent
// The ₹100 minimum is unchanged: the cart shows "FREE at ₹100" until the paid total reaches it (see promos.js).
(function () {
  const KEY = 'crosta_spin_prize_v1';
  const FREE_VEG = ['Onion', 'Corn', 'Capsicum', 'Mushroom', 'Olives'];                 // paneer, extra cheese and jalapeños stay paid
  const FREE_DRINKS = [
    { label: 'Coke 250 ml',  name: 'Coke',         size: '250ml', cartName: 'Coke 250ml (Free — Spin Prize)' },
    { label: 'Water 250 ml', name: 'Water 250ml',  size: 'std',   cartName: 'Water 250ml (Free — Spin Prize)' }
  ];
  const LOCK_MS = (window.CROSTA_CONFIG && window.CROSTA_CONFIG.LOCK_MS) || 24 * 60 * 60 * 1000;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- the pending prize ---------- */
  let prize = (() => { try { const p = JSON.parse(localStorage.getItem(KEY)); return p && p.kind ? p : null; } catch (_) { return null; } })();
  function save() { try { if (prize) localStorage.setItem(KEY, JSON.stringify(prize)); else localStorage.removeItem(KEY); } catch (_) { /* works without storage */ } }
  const live = kind => !!prize && prize.kind === kind && !prize.used && Date.now() < prize.exp;
  const toppingUsed = () => cart.some(i => (i.addons || []).some(a => a.free));        // spent = it is sitting on a pizza in the cart
  const drinkUsed = () => cart.some(i => i.isFreeSpinPrize && i.prizeKind === 'drink');
  const toppingAvailable = () => live('topping') && !toppingUsed();
  const drinkAvailable = () => live('drink') && !drinkUsed();

  // the spin machine calls this on every win
  const prevWin = window.onCrostaWin;
  window.onCrostaWin = function (d) {
    prize = (d.prizeId === 'topping' || d.prizeId === 'drink') ? { kind: d.prizeId, exp: (d.timestamp || Date.now()) + LOCK_MS, used: false } : null;
    save(); marks();
    if (typeof prevWin === 'function') prevWin(d);
  };
  // called when the order is sent: a prize that was used on it is spent for good
  window.markSpinPrizeUsed = function () { if (prize && (toppingUsed() || drinkUsed())) { prize.used = true; save(); marks(); } };

  /* ---------- helpers ---------- */
  const pizzaLines = () => cart.filter(i => i.isPizza && !i.isFreeSpinPrize && !i.isWeekendSpecial && !i.isGroupPerk);
  const sizeTag = i => (i.size && i.size !== 'std') ? ' ' + i.size : '';
  function addonPrice(name, size) {                                                    // the normal price of that add-on for this pizza size
    const card = document.querySelector('.addon-popup-card[data-addon="' + name + '"]');
    return card ? getAddonPriceForSize(card.dataset.tierPrices, size) : 0;
  }
  // a cart line holds one add-on set for all its units, so the free topping goes on a line of exactly one pizza
  function splitOne(line) {
    if (line.qty <= 1) return line;
    const one = { ...line, id: line._key + '|' + Date.now() + '|f', qty: 1, addons: (line.addons || []).map(a => ({ ...a })) };
    line.qty -= 1;
    cart.splice(cart.indexOf(line) + 1, 0, one);
    return one;
  }
  function rerender() { renderCart(); updateFab(); refreshMenuSteppers(); }

  /* ---------- the topping ---------- */
  function applyFreeTopping(lineId, name) {
    let line = cart.find(i => i.id === lineId);
    if (!line || !FREE_VEG.includes(name) || toppingUsed()) return null;
    line = splitOne(line);
    line.addons = (line.addons || []).filter(a => a.name !== name);
    line.addons.push({ name, price: 0, free: true, was: addonPrice(name, line.size) });
    rerender();
    return line;
  }
  // used by the add-on sheet: returns true when it took over adding this add-on as the free one
  window.spinGrantFreeAddon = function (pizzaItem, name, price) {
    if (!FREE_VEG.includes(name) || !toppingAvailable()) return false;
    const line = splitOne(pizzaItem);
    if (line !== pizzaItem && typeof currentPopupPizzaId !== 'undefined') currentPopupPizzaId = line.id;   // the open sheet now edits the single-pizza line
    line.addons.push({ name, price: 0, free: true, was: price });
    return true;
  };

  /* ---------- the drink ---------- */
  const freeDrinkFor = (name, size) => FREE_DRINKS.find(d => d.name === name && d.size === size);
  function addFreeDrinkLine(d) {
    cart.push({ id: d.cartName + '|free|' + Date.now(), _key: d.cartName, name: d.cartName, size: '', price: 0, qty: 1, addons: [], isFreeSpinPrize: true, prizeKind: 'drink' });
    rerender();
    if (typeof cartAddedFeedback === 'function') cartAddedFeedback(d.label + ' · free (₹0)');
  }
  // any way of adding a free-eligible drink uses the prize first; further units are paid as usual
  const originalAddItem = addItem;
  addItem = function (name, size, price, isPizza, isMealEligible, opts) {
    const d = drinkAvailable() ? freeDrinkFor(name, size) : null;
    if (!d) return originalAddItem.apply(this, arguments);
    addFreeDrinkLine(d);
    const rest = ((opts && opts.qty) || 1) - 1;
    if (rest > 0) originalAddItem(name, size, price, isPizza, isMealEligible, Object.assign({}, opts, { qty: rest, quiet: true }));
  };
  window.removeSpinPrize = function (id) { cart = cart.filter(i => i.id !== id); rerender(); };   // removing it gives the prize back

  /* ---------- the win dialog: the extra controls under the prize ---------- */
  const note = (parent, text) => parent.appendChild(el('p', 'c3d-sub', text));
  function chooserGroup(parent, label, options, onPick) {
    parent.appendChild(el('p', 'c3d-lbl', label));
    const row = el('div', 'c3d-opts');
    options.forEach(o => {
      const b = el('button', 'c3d-opt', o.text); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { row.querySelectorAll('.c3d-opt').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); onPick(o.value); });
      row.appendChild(b); o.btn = b;
    });
    parent.appendChild(row);
    return row;
  }
  function goToPizzas() {
    const chip = document.querySelector('.chip[data-cat="pizzas"]'); if (chip) chip.click();
    if (typeof scrollToMenu === 'function') setTimeout(() => scrollToMenu(), 60);
  }
  window.crostaPrizeActions = function (p, actions, api) {
    if (p.choose === 'topping') {
      if (toppingUsed()) { note(actions, 'Your free topping is on a pizza in your cart. Nothing more to do.'); return; }
      const pizzas = pizzaLines();
      if (!pizzas.length) {
        note(actions, 'Add any pizza and one veggie topping on it is ₹0. We will remind you in the menu.');
        const go = el('button', 'c3d-btn c3d-cart', 'Browse pizzas'); go.type = 'button';
        go.addEventListener('click', () => { api.close(); goToPizzas(); });
        actions.appendChild(go); return;
      }
      let line = pizzas[pizzas.length - 1].id, veg = null;
      const apply = el('button', 'c3d-btn c3d-cart', 'Add free topping'); apply.type = 'button'; apply.disabled = true;
      const pizzaOpts = pizzas.map(i => ({ text: i.name + sizeTag(i), value: i.id }));
      const pr = chooserGroup(actions, 'Which pizza?', pizzaOpts, v => { line = v; });
      pr.querySelectorAll('.c3d-opt')[pizzas.length - 1].setAttribute('aria-pressed', 'true');
      chooserGroup(actions, 'Which topping? (₹0)', FREE_VEG.map(v => ({ text: v, value: v })), v => { veg = v; apply.disabled = false; });
      apply.addEventListener('click', () => {
        const done = applyFreeTopping(line, veg);
        if (done) { if (typeof cartAddedFeedback === 'function') cartAddedFeedback(veg + ' on ' + done.name + ' · free (₹0)'); api.close(); }
      });
      actions.appendChild(apply);
    } else if (p.choose === 'drink') {
      if (drinkUsed()) { note(actions, 'Your free drink is in your cart. Nothing more to do.'); return; }
      note(actions, 'Pick your free 250 ml drink (₹0). Or skip this and add one from the menu: it will show as free.');
      FREE_DRINKS.forEach(d => {
        const b = el('button', 'c3d-btn c3d-cart', 'Add ' + d.label + ' · free'); b.type = 'button';
        b.addEventListener('click', () => { if (!drinkUsed()) addFreeDrinkLine(d); api.close(); });
        actions.appendChild(b);
      });
    }
  };

  /* ---------- reminders in the menu, the add-on sheet and the cart ---------- */
  function marks() {
    const topOn = toppingAvailable(), drOn = drinkAvailable();
    // every pizza card: a "Free topping" tag
    document.querySelectorAll('#tab-pizzas .menu-item').forEach(item => {
      const tag = item.querySelector('.badge-free-topping');
      if (topOn && !tag) {
        let row = item.querySelector('.badge-row');
        if (!row) { row = el('div', 'badge-row'); const left = item.querySelector('.menu-item-left'); if (left) left.insertBefore(row, left.querySelector('.add-row')); else item.appendChild(row); }
        row.appendChild(el('span', 'badge badge-free badge-free-topping', 'Free topping · ₹0'));
      } else if (!topOn && tag) { const row = tag.parentElement; tag.remove(); if (row && !row.children.length) row.remove(); }
    });
    // the 250 ml drinks: Coke's 250ml size and the Water 250ml row
    document.querySelectorAll('#tab-quickdrinks .menu-item').forEach(item => {
      const name = (item.querySelector('.menu-item-name') || {}).textContent;
      if (!name) return;
      const n = name.trim();
      if (n === 'Coke') {
        const chip = item.querySelector('.size-chip');
        if (!chip) return;
        if (drOn && !chip.classList.contains('is-free')) { chip.dataset.orig = chip.innerHTML; chip.classList.add('is-free'); chip.innerHTML = '<small>250ml</small><b>FREE</b>'; chip.setAttribute('aria-label', 'Add Coke 250ml free with your spin prize'); }
        else if (!drOn && chip.classList.contains('is-free')) { chip.classList.remove('is-free'); chip.innerHTML = chip.dataset.orig || chip.innerHTML; chip.setAttribute('aria-label', 'Add Coke, 250ml, ₹20'); }
      } else if (n === 'Water 250ml') {
        const priceEl = item.querySelector('.menu-item-price'), tag = item.querySelector('.badge-free-drink');
        if (drOn && !tag) {
          if (priceEl) priceEl.classList.add('is-free');
          let row = item.querySelector('.badge-row');
          if (!row) { row = el('div', 'badge-row'); const left = item.querySelector('.menu-item-left'); if (left) left.insertBefore(row, left.querySelector('.add-row')); }
          if (row) row.appendChild(el('span', 'badge badge-free badge-free-drink', 'Free · ₹0'));
        } else if (!drOn && tag) { if (priceEl) priceEl.classList.remove('is-free'); const row = tag.parentElement; tag.remove(); if (row && !row.children.length) row.remove(); }
      }
    });
    popupLabels();
    couponStrip(topOn, drOn);
  }
  // one dashed coupon line above the menu says what the spin won and where it applies
  function couponStrip(topOn, drOn) {
    let strip = $('prizeStrip');
    const text = topOn ? 'Free veggie topping from your spin is waiting. Add any pizza and pick it.' : drOn ? 'Free 250 ml drink from your spin is waiting. Add it from Quick drinks.' : '';
    if (!text) { if (strip) strip.remove(); return; }
    if (!strip) {
      const anchor = document.querySelector('.shop .best');
      if (!anchor) return;
      strip = el('a', 'prize-strip'); strip.id = 'prizeStrip'; strip.href = '#menu';
      strip.appendChild(el('b', null, 'Your spin prize'));
      strip.appendChild(el('span'));
      anchor.parentNode.insertBefore(strip, anchor);
    }
    strip.lastChild.textContent = text;
  }
  // inside the add-on sheet: which veggie add-on is free, and what it says
  function popupLabels() {
    const popup = $('addonPopup');
    if (!popup || !popup.classList.contains('open')) return;
    const line = cart.find(i => i.id === (typeof currentPopupPizzaId !== 'undefined' ? currentPopupPizzaId : null));
    const hasFree = !!line && (line.addons || []).some(a => a.free);
    const canFree = hasFree || toppingAvailable();
    const hint = popup.querySelector('.addon-popup-hint');
    if (hint) hint.textContent = hasFree ? 'Your spin topping is on. Any more toppings are the usual price.' : canFree ? 'Spin prize: pick one veggie topping free (₹0). Applies on orders of ₹100+.' : 'Would you like to add any toppings?';
    popup.querySelectorAll('.addon-popup-card').forEach(card => {
      const priceEl = card.querySelector('.popup-card-price'); if (!priceEl) return;
      const name = card.dataset.addon, price = card.dataset.activePrice;
      const mine = line && (line.addons || []).find(a => a.name === name);
      if (mine && mine.free) priceEl.innerHTML = '<b class="pf">FREE</b>';
      else if (canFree && !hasFree && FREE_VEG.includes(name)) priceEl.innerHTML = '<s>₹' + price + '</s> <b class="pf">FREE</b>';
      else priceEl.textContent = '₹' + price;
    });
  }
  window.refreshPopupPrizeLabels = popupLabels;

  // keep the reminders in step with every cart change
  const originalRenderCart = renderCart;
  renderCart = function () { const r = originalRenderCart.apply(this, arguments); marks(); return r; };

  document.addEventListener('DOMContentLoaded', marks);
  window.addEventListener('load', () => { marks(); setTimeout(marks, 1500); });
  setInterval(marks, 60000);                                                          // a prize that has just expired stops being advertised
})();
