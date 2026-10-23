// ── CART STATE ──
let cart = []; // [{id, name, size, price, qty}]
let openPicker = null;

// ── PIZZA vs ADDON detection ──
const ADDON_IDS = ['Extra Cheese','Paneer Topping','Jalapeños','Onion','Corn','Capsicum','Mushroom','Olives'];
function isPizzaItem(name) {
  return !ADDON_IDS.some(a => name === 'Add-on: ' + a);
}

// ── CART OPEN / CLOSE ──
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Animation 5: stagger cart items on open
  setTimeout(() => {
    document.querySelectorAll('#cartItems .cart-item').forEach((el, i) => {
      el.classList.remove('animate-in');
      void el.offsetWidth;
      el.style.animationDelay = (i * 45) + 'ms';
      el.classList.add('animate-in');
      el.addEventListener('animationend', () => el.classList.remove('animate-in'), { once: true });
    });
  }, 60);
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
  if (openPicker) { openPicker.classList.remove('open'); openPicker = null; }
  // Reset pickup toggle
  if (isPickup) togglePickup();
}

// ── ADD ITEM ──
function addItem(name, size, price, isPizza, isMealEligible) {
  const key = name + '|' + size;

  // If item already in cart (pizza or not) — just increment, no popup
  const existing = cart.find(i => i._key === key);
  if (existing) {
    existing.qty++;
    renderCart();
    updateFab();
    refreshMenuSteppers();
    triggerFabWobble();
    return;
  }

  // First time adding — create new cart entry
  const id = name + '|' + size + '|' + Date.now();
  cart.push({ id, _key: key, name, size, price, qty: 1, addons: [], isPizza: !!isPizza, isMealEligible: !!isMealEligible });
  renderCart();
  updateFab();
  refreshMenuSteppers();
  if (openPicker) { openPicker.classList.remove('open'); openPicker = null; }

  triggerFabWobble();

  // Only show addon popup on first add of a pizza
  if (isPizza) {
    setTimeout(() => openAddonPopup(id, name), 320);
  }
}

// ── REFRESH MENU STEPPERS ──
// Called after any cart change to update every menu card's add-row UI
function refreshMenuSteppers() {
  // Flat-price items
  document.querySelectorAll('.add-row[data-item-key]').forEach(row => {
    const key = row.dataset.itemKey;
    const qty = cart.filter(i => i._key === key).reduce((s,i) => s + i.qty, 0);
    const btn = row.querySelector('.add-btn');
    let stepper = row.querySelector('.menu-stepper');

    if (qty > 0) {
      if (btn) btn.style.display = 'none';
      if (!stepper) {
        stepper = document.createElement('div');
        stepper.className = 'menu-stepper';
        stepper.innerHTML = `
          <button class="stepper-btn stepper-minus" onclick="menuStepperChange(this,event)">−</button>
          <span class="stepper-count">${qty}</span>
          <button class="stepper-btn stepper-plus" onclick="menuStepperChange(this,event)">+</button>`;
        row.appendChild(stepper);
      } else {
        const countEl = stepper.querySelector('.stepper-count');
        const prevQty = countEl.textContent;
        countEl.textContent = qty;
        if (prevQty !== String(qty)) {
          // Animation 8: bounce
          countEl.classList.remove('bouncing');
          void countEl.offsetWidth;
          countEl.classList.add('bouncing');
          countEl.addEventListener('animationend', () => countEl.classList.remove('bouncing'), { once: true });
        }
        stepper.style.display = '';
      }
    } else {
      if (btn) btn.style.display = '';
      if (stepper) stepper.style.display = 'none';
    }
  });

  // Multi-size items (pizzas, sized fries, etc.)
  document.querySelectorAll('.add-row').forEach(row => {
    const wrap = row._sizeStepperWrap;
    const sizeData = row._sizeData;
    if (!wrap || !sizeData) return;

    wrap.innerHTML = '';
    let anyAdded = false;

    sizeData.forEach(({ size, price, name, isPizza, isMealEligible }) => {
      const key = name + '|' + size;
      const qty = cart.filter(i => i._key === key).reduce((s,i) => s + i.qty, 0);
      if (qty === 0) return;
      anyAdded = true;

      const sps = document.createElement('div');
      sps.className = 'size-pill-stepper';
      const lineTotal = price * qty;
      sps.innerHTML = `
        <span class="sps-size-label">${size}</span>
        <div class="sps-qty-wrap">
          <button class="sps-btn sps-minus">−</button>
          <span class="sps-count">${qty}</span>
          <button class="sps-btn sps-plus">+</button>
        </div>
        <span class="sps-price">₹${lineTotal}</span>`;

      sps.querySelector('.sps-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        addItem(name, size, price, isPizza, isMealEligible);
      });
      sps.querySelector('.sps-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        const entries = cart.filter(i => i._key === key);
        if (!entries.length) return;
        const last = entries[entries.length - 1];
        last.qty--;
        if (last.qty <= 0) cart = cart.filter(i => i.id !== last.id);
        renderCart();
        updateFab();
        refreshMenuSteppers();
      });

      wrap.appendChild(sps);
    });

    // Show/hide the main Add button: always visible for multi-size (allows adding another size)
    const btn = row.querySelector('.add-btn');
    if (btn) btn.style.display = '';
  });
}

function menuStepperChange(btn, e) {
  e.stopPropagation();
  const row = btn.closest('.add-row');
  const key = row.dataset.itemKey;
  const delta = btn.classList.contains('stepper-plus') ? 1 : -1;

  if (delta === 1) {
    // find the prototype item to re-add
    const proto = row._proto;
    if (proto) addItem(proto.name, proto.size, proto.price, proto.isPizza, proto.isMealEligible);
    return;
  }
  // decrement: remove one qty from the last matching cart entry
  const entries = cart.filter(i => i._key === key);
  if (!entries.length) return;
  const last = entries[entries.length - 1];
  last.qty--;
  if (last.qty <= 0) cart = cart.filter(i => i.id !== last.id);
  renderCart();
  updateFab();
  refreshMenuSteppers();
}

// ── ADDON POPUP ──
let currentPopupPizzaId = null;

const ADDON_SIZE_ORDER = ['8″', '10″', '12″'];

function getAddonPriceForSize(tierPricesAttr, size) {
  const tiers = (tierPricesAttr || '').split(',').map(n => parseInt(n, 10));
  const idx = ADDON_SIZE_ORDER.indexOf(size);
  if (idx !== -1 && tiers[idx] !== undefined) return tiers[idx];
  // fallback: unknown/flat-price item — use first tier value
  return tiers[0] || 0;
}

function openAddonPopup(pizzaId, pizzaName) {
  currentPopupPizzaId = pizzaId;
  const popup = document.getElementById('addonPopup');
  if (!popup) return;
  popup.querySelector('.addon-popup-pizza').textContent = '🍕 ' + pizzaName;

  const pizzaItem = cart.find(i => i.id === pizzaId);
  const size = pizzaItem ? pizzaItem.size : ADDON_SIZE_ORDER[0];

  // update each addon card's price for this pizza's size
  popup.querySelectorAll('.addon-popup-card').forEach(card => {
    const price = getAddonPriceForSize(card.dataset.tierPrices, size);
    card.dataset.activePrice = price;
    const priceEl = card.querySelector('.popup-card-price');
    if (priceEl) priceEl.textContent = '₹' + price;
  });

  // update each group header's displayed price for this pizza's size
  popup.querySelectorAll('.addon-popup-group-title').forEach(title => {
    const price = getAddonPriceForSize(title.dataset.tierPrices, size);
    const priceEl = title.querySelector('.addon-group-price');
    if (priceEl) priceEl.textContent = '₹' + price;
  });

  // reset all cards to unselected
  popup.querySelectorAll('.addon-popup-card').forEach(c => c.classList.remove('selected'));

  // pre-check any already-chosen addons for this pizza
  if (pizzaItem && pizzaItem.addons) {
    pizzaItem.addons.forEach(a => {
      const card = popup.querySelector(`.addon-popup-card[data-addon="${a.name}"]`);
      if (card) card.classList.add('selected');
    });
  }
  popup.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateAddonPopupFooter();

  // Animation 4 (reused): stagger-in topping rows, same as menu category items
  const staggerEls = popup.querySelectorAll('.addon-popup-group-title, .addon-popup-card');
  staggerEls.forEach((el, i) => {
    el.classList.remove('pop-in');
    void el.offsetWidth;
    el.style.animationDelay = (i * 35) + 'ms';
    el.classList.add('pop-in');
    el.addEventListener('animationend', () => el.classList.remove('pop-in'), { once: true });
  });
}

function updateAddonPopupFooter() {
  const popup = document.getElementById('addonPopup');
  if (!popup) return;
  const hasSelection = !!popup.querySelector('.addon-popup-card.selected');
  const skipBtn = popup.querySelector('.addon-popup-skip');
  const doneBtn = popup.querySelector('.addon-popup-done');
  if (skipBtn) {
    skipBtn.style.display = hasSelection ? 'none' : 'block';
    skipBtn.style.marginRight = hasSelection ? '0' : '';
  }
  if (doneBtn) doneBtn.style.display = hasSelection ? 'block' : 'none';
}

function closeAddonPopup() {
  const popup = document.getElementById('addonPopup');
  if (!popup) return;
  popup.classList.remove('open');
  document.body.style.overflow = '';
  currentPopupPizzaId = null;
  renderCart();
  updateFab();
}

// (toggleAddonPopupCard defined below, near the other addon-popup functions)

// ── QTY CHANGE ──
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  if (delta < 0 && item.qty === 1) {
    // Animation 3: slide-out before removing
    const cartEl = document.querySelector(`#cartItems .cart-item:nth-child(${cart.indexOf(item) + 1})`);
    // find by scanning all cart-items for matching content
    const allItems = document.querySelectorAll('#cartItems .cart-item');
    let targetEl = null;
    allItems.forEach((el) => {
      if (el.querySelector('.cart-item-name') &&
          el.querySelector('.cart-item-name').textContent.includes(item.name)) {
        targetEl = el;
      }
    });
    if (targetEl) {
      targetEl.style.maxHeight = targetEl.offsetHeight + 'px';
      targetEl.classList.add('removing');
      setTimeout(() => {
        cart = cart.filter(i => i.id !== id);
        renderCart();
        updateFab();
        refreshMenuSteppers();
        if (typeof refreshAddonLock === 'function') refreshAddonLock();
      }, 230);
      return;
    }
  }

  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  renderCart();
  updateFab();
  refreshMenuSteppers();
  if (typeof refreshAddonLock === 'function') refreshAddonLock();

  // Animation 8: bounce the qty count in cart
  if (delta !== 0) {
    document.querySelectorAll('#cartItems .qty-num').forEach(el => {
      el.classList.remove('bouncing');
      void el.offsetWidth;
      el.classList.add('bouncing');
      el.addEventListener('animationend', () => el.classList.remove('bouncing'), { once: true });
    });
  }
}

// ── RENDER CART ITEMS ──
function clearCart() {
  cart = [];
  renderCart();
  updateFab();
  refreshMenuSteppers();
}
