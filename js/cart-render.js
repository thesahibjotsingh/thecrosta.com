function renderCart() {
  syncWeekendSpecialBundle();
  syncGroupPerkBundle();
  const container = document.getElementById('cartItems');
  const empty     = document.getElementById('cartEmpty');
  const details   = document.getElementById('cartDetails');
  const footer    = document.getElementById('cartFooter');
  const summaryBar = document.getElementById('cartSummaryBar');
  const summaryChips = document.getElementById('cartSummaryChips');
  const clearBtn  = document.getElementById('cartClearBtn');
  if (clearBtn) clearBtn.style.display = cart.length > 0 ? '' : 'none';

  if (cart.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'flex';
    details.style.display = 'none';
    footer.style.display = 'none';
    document.getElementById('cartItemsWrap').classList.remove('collapsed');
    const headerCount = document.getElementById('cartHeaderCount');
    if (headerCount) { headerCount.textContent = ''; headerCount.classList.remove('visible'); }
    const nudge = document.getElementById('cartFillNudge');
    if (nudge) nudge.classList.remove('visible');
    return;
  }

  empty.style.display = 'none';
  details.style.display = 'block';
  footer.style.display = 'block';

  // Item count badge in header
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const headerCount = document.getElementById('cartHeaderCount');
  if (headerCount) {
    headerCount.textContent = totalQty;
    headerCount.classList.toggle('visible', totalQty > 0);
  }

  // Nudge button
  const nudge = document.getElementById('cartFillNudge');
  if (nudge) nudge.classList.toggle('visible', cart.length > 0);

  // Update summary chips (hidden stub — kept for JS compat)
  const groups = {};
  cart.forEach(item => {
    const k = item._key || (item.name + '|' + item.size);
    if (!groups[k]) groups[k] = { name: item.name, size: item.size, qty: 0 };
    groups[k].qty += item.qty;
  });
  summaryChips.innerHTML = Object.values(groups).map(g => {
    const shortName = g.name.replace(/Pizza$/i,'').replace(/Crosta /i,'').trim();
    const sizeTag = g.size && g.size !== 'std' ? ` ${g.size}` : '';
    return `<span class="cart-summary-chip"><span class="chip-qty">${g.qty}</span>${shortName}${sizeTag}</span>`;
  }).join('');

  container.innerHTML = cart.map(item => {
    const sizeLabel = (item.size && item.size !== 'std') ? `<span class="cart-item-size">${item.size}</span>` : '';
    const addonsTotal = (item.addons || []).reduce((s, a) => s + a.price, 0);
    const itemTotal   = (item.price + addonsTotal) * item.qty;

    const addonLines = item.isPizza ? (() => {
      const tags = (item.addons || []).map(a =>
        `<span class="cart-addon-tag${a.free ? ' is-free' : ''}">＋ ${a.name} <em>${a.free ? (spinPrizeLocked(cart) ? 'FREE at ₹100' : 'FREE') : '₹' + a.price}</em></span>`
      ).join('');
      const editBtn = `<button class="cart-addon-edit" onclick="editAddons('${item.id}', '${item.name.replace(/'/g,"\\'")}')">Edit</button>`;
      const addBtn  = `<button class="cart-addon-add" onclick="editAddons('${item.id}', '${item.name.replace(/'/g,"\\'")}')">＋ add toppings</button>`;
      return (item.addons || []).length > 0
        ? `<div class="cart-item-addons">${tags}${editBtn}</div>`
        : `<div class="cart-item-addons">${addBtn}</div>`;
    })() : '';

    const qtyRow = item.isFreeSpinPrize
      ? `<div class="cart-item-qty"><span style="font-size:0.72rem;color:var(--warm-gray);font-style:italic;">Spin prize · 1 free</span><button class="cart-addon-edit" onclick="removeSpinPrize('${item.id}')">Remove</button></div>`
      : (item.isGroupPerk || item.isWeekendSpecial)
      ? `<div class="cart-item-qty"><span style="font-size:0.72rem;color:var(--warm-gray);font-style:italic;">Included free with your order</span></div>`
      : `<div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        </div>`;

    return `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name} ${sizeLabel}</div>
        ${addonLines}
        ${qtyRow}
      </div>
      <div class="cart-item-price">${(item.isFreeSpinPrize && spinPrizeLocked(cart)) ? '<span style="color:#A84300;font-size:0.76rem;font-weight:700;">FREE at ₹100</span>' : (item.isFreeSpinPrize || item.isGroupPerk || item.isWeekendSpecial) ? '<span style="color:#1aad4b;font-size:0.8rem;font-weight:700;">FREE</span>' : '₹' + itemTotal}</div>
    </div>`;
  }).join('');

  const { total, pizzaDiscount, boostDiscount, studentDiscount, groupPerkActive, weekendSpecialActive } = computeCartTotals(cart);

  const weekendRow = document.getElementById('cartWeekendRow');
  if (weekendRow) {
    weekendRow.style.display = weekendSpecialActive ? 'flex' : 'none';
    if (weekendSpecialActive) {
      const freeItem = cart.find(i => i.isWeekendSpecial);
      document.getElementById('cartWeekendText').textContent = freeItem
        ? `Weekend Special unlocked — FREE ${freeItem.name.replace(/\s*\(Weekend Special.*\)$/, '')} (${freeItem.size})`
        : 'Weekend Special unlocked — Free pizza!';
    }
  }

  const groupPerkRow = document.getElementById('cartGroupPerkRow');
  if (groupPerkRow) groupPerkRow.style.display = groupPerkActive ? 'flex' : 'none';

  const offerRow = document.getElementById('cartOfferRow');
  if (offerRow) {
    offerRow.style.display = pizzaDiscount > 0 ? 'flex' : 'none';
    document.getElementById('cartDiscountAmount').textContent = pizzaDiscount;
  }

  const boostRow = document.getElementById('cartBoostRow');
  if (boostRow) {
    boostRow.style.display = boostDiscount > 0 ? 'flex' : 'none';
    document.getElementById('cartBoostAmount').textContent = boostDiscount;
  }

  const lockRow = document.getElementById('cartSpinLock');
  if (lockRow) {
    const locked = spinPrizeLocked(cart);
    lockRow.hidden = !locked;
    if (locked) document.getElementById('cartSpinLockText').textContent = `Your spin prize unlocks on orders of ${rupee(SPIN_MIN)} or more. Add ${rupee(SPIN_MIN - paidTotal(cart))} more.`;
  }

  const studentRow = document.getElementById('cartStudentRow');
  if (studentRow) {
    studentRow.style.display = studentDiscount > 0 ? 'flex' : 'none';
    document.getElementById('cartStudentAmount').textContent = studentDiscount;
  }

  // Animation 7: flash the total price on change
  const totalEl = document.getElementById('cartTotal');
  const prevTotal = totalEl.textContent;
  totalEl.textContent = total;
  if (prevTotal !== String(total) && prevTotal !== '0') {
    const amountEl = totalEl.closest('.cart-total-amount');
    if (amountEl) {
      amountEl.classList.remove('flashing');
      void amountEl.offsetWidth;
      amountEl.classList.add('flashing');
      amountEl.addEventListener('animationend', () => amountEl.classList.remove('flashing'), { once: true });
    }
  } else {
    totalEl.textContent = total;
  }
}

// ── TOGGLE CART ITEMS VISIBILITY ──
function toggleCartItems() {
  const wrap = document.getElementById('cartItemsWrap');
  const bar  = document.getElementById('cartSummaryBar');
  const lbl  = document.getElementById('cartSummaryToggleLabel');
  const isCollapsed = wrap.classList.contains('collapsed');
  wrap.classList.toggle('collapsed', !isCollapsed);
  bar.classList.toggle('open', isCollapsed);
  lbl.textContent = isCollapsed ? 'Hide' : 'Show all';
}

// ── EDIT ADDONS FROM CART ──
function editAddons(pizzaId, pizzaName) {
  openAddonPopup(pizzaId, pizzaName);
}

// ── UPDATE HEADER CART + PHONE CART BAR ──
// What each promo is called in toasts and the cart bar.
const PROMO_LABEL = { weekend: 'Weekend special', groupperk: 'Group perk', weekday: 'Weekday lunch', boost: 'The Crosta Boost', student: 'Thapar student discount' };
function promoSummary(T) {
  switch (T.activePromo) {
    case 'weekend':   return 'Weekend special: free pizza added';
    case 'groupperk': return 'Group perk: free meal bundle';
    case 'weekday':   return `Weekday lunch: you save ${rupee(T.pizzaDiscount)}`;
    case 'boost':     return `The Crosta Boost: you save ${rupee(T.boostDiscount)}`;
    case 'student':   return `Thapar student ${studentPercent()}%: you save ${rupee(T.studentDiscount)} · show your ID`;
    default:          return '';
  }
}
function updateFab() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const T = computeCartTotals(cart);
  document.querySelectorAll('.cart-count').forEach(e => { e.textContent = count; });
  document.querySelectorAll('.cart-total').forEach(e => { e.textContent = rupee(T.total); });
  document.querySelectorAll('.cart-word').forEach(e => { e.textContent = count === 1 ? 'item' : 'items'; });
  document.querySelectorAll('.cart').forEach(e => e.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}, ${rupee(T.total)}`));
  const bar = document.getElementById('cartbar');
  if (bar) bar.classList.toggle('show', count > 0);
  document.body.classList.toggle('has-cartbar', count > 0);
  const save = document.getElementById('cbSave');
  if (save) save.textContent = promoSummary(T);
  if (typeof persistCart === 'function') persistCart();
  if (typeof updatePaymentUi === 'function') updatePaymentUi();
  if (typeof onCartChanged === 'function') onCartChanged();
}
