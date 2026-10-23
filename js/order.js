// ── PLACE ORDER via WHATSAPP ──
// ── PICKUP TOGGLE ──
let isPickup = false;
function togglePickup() {
  const btn     = document.getElementById('pickupBtn');
  const addrEl  = document.getElementById('custAddress');
  isPickup = !isPickup;
  if (isPickup) {
    btn.classList.add('active');
    btn.innerHTML = '<span class="pickup-icon">✓</span> Pickup';
    addrEl.value = '';
    addrEl.disabled = true;
    addrEl.placeholder = 'Picking up in person ✓';
    addrEl.style.background = '#f5f5f2';
    addrEl.style.color = 'var(--warm-gray)';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<span class="pickup-icon">🏃</span> Pickup';
    addrEl.disabled = false;
    addrEl.placeholder = 'Delivery address';
    addrEl.style.background = '';
    addrEl.style.color = '';
    addrEl.focus();
  }
}

// ── SCROLL TO DETAILS ──
function scrollToDetails() {
  const details = document.getElementById('cartDetails');
  if (details) {
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('custName').focus(), 400);
  }
}

// ── FORM VALIDATION SHAKE ──
function showFieldError(el, msg) {
  el.classList.remove('input-error');
  // Remove any existing error message
  const prev = el.nextElementSibling;
  if (prev && prev.classList.contains('input-error-msg')) prev.remove();
  // Force reflow so animation replays
  void el.offsetWidth;
  el.classList.add('input-error');
  const errMsg = document.createElement('div');
  errMsg.className = 'input-error-msg';
  errMsg.innerHTML = `⚠ ${msg}`;
  el.after(errMsg);
  el.addEventListener('input', () => {
    el.classList.remove('input-error');
    if (errMsg.parentNode) errMsg.remove();
  }, { once: true });
}

// ── PHONE FIELD: digits only, shake + flash red on invalid keystrokes ──
function filterPhoneInput(el) {
  const hadInvalid = /[^0-9]/.test(el.value);
  el.value = el.value.replace(/[^0-9]/g, '');
  if (hadInvalid) {
    el.classList.remove('input-error');
    void el.offsetWidth;
    el.classList.add('input-error');
    clearTimeout(el._phoneErrTimeout);
    el._phoneErrTimeout = setTimeout(() => el.classList.remove('input-error'), 400);
  }
}

// ── NAME FIELD: letters only (spaces/hyphens/apostrophes allowed), shake + flash red on invalid keystrokes ──
function filterNameInput(el) {
  const allowed = /[^a-zA-Z\s'-]/;
  const hadInvalid = allowed.test(el.value);
  el.value = el.value.replace(/[^a-zA-Z\s'-]/g, '');
  if (hadInvalid) {
    el.classList.remove('input-error');
    void el.offsetWidth;
    el.classList.add('input-error');
    clearTimeout(el._nameErrTimeout);
    el._nameErrTimeout = setTimeout(() => el.classList.remove('input-error'), 400);
  }
}

function placeOrder() {
  if (cart.length === 0) return;

  const nameEl    = document.getElementById('custName');
  const phoneEl   = document.getElementById('custPhone');
  const addressEl = document.getElementById('custAddress');
  const noteEl    = document.getElementById('custNote');

  const name    = nameEl.value.trim();
  const phone   = phoneEl.value.trim();
  const address = addressEl.value.trim();
  const note    = noteEl.value.trim();

  let hasError = false;
  if (!name) {
    scrollToDetails();
    setTimeout(() => { showFieldError(nameEl, 'Please enter your name'); nameEl.focus(); }, 300);
    hasError = true;
  }
  if (!phone) {
    if (!hasError) {
      scrollToDetails();
      setTimeout(() => { showFieldError(phoneEl, 'Please enter your phone number'); phoneEl.focus(); }, 300);
    } else {
      setTimeout(() => showFieldError(phoneEl, 'Please enter your phone number'), 300);
    }
    hasError = true;
  }
  if (!isPickup && !address) {
    if (!hasError) {
      scrollToDetails();
      setTimeout(() => { showFieldError(addressEl, 'Enter a delivery address or tap Pickup'); addressEl.focus(); }, 300);
    } else {
      setTimeout(() => showFieldError(addressEl, 'Enter a delivery address or tap Pickup'), 300);
    }
    hasError = true;
  }
  if (hasError) return;

  const { subtotal, pizzaDiscount, boostDiscount, discount, total, groupPerkActive, weekendSpecialActive } = computeCartTotals(cart);

  // ── Rich itemised WhatsApp message ──
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: SHOP_TIMEZONE });

  let msg = `🍕 *New Order — The Crosta*\n`;
  msg += `🕐 ${timeStr}  ·  Patiala\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*ORDER ITEMS*\n`;

  cart.forEach((item, idx) => {
    const sizeStr   = item.size !== 'std' && item.size ? ` (${item.size})` : '';
    const addonsTotal = (item.addons || []).reduce((a, b) => a + b.price, 0);
    const lineTotal   = (item.price + addonsTotal) * item.qty;
    msg += `\n${idx + 1}. ${item.name}${sizeStr}\n`;
    if (item.isGroupPerk || item.isFreeSpinPrize || item.isWeekendSpecial) {
      msg += `   Qty: ${item.qty}  ·  FREE 🎁\n`;
    } else {
      msg += `   Qty: ${item.qty}  ·  ₹${item.price}${item.size !== 'std' ? ' each' : ''}\n`;
    }
    if ((item.addons || []).length > 0) {
      item.addons.forEach(a => { msg += `   ＋ ${a.name} (+₹${a.price})\n`; });
    }
    if (!item.isGroupPerk && !item.isFreeSpinPrize && !item.isWeekendSpecial) msg += `   *Subtotal: ₹${lineTotal}*\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  if (weekendSpecialActive) {
    msg += `🎉 *Weekend Special unlocked:* Your free pizza is included above!\n`;
  }
  if (groupPerkActive) {
    msg += `🎁 *Group Perk unlocked:* Complete Meal Bundle (Garlic Bread + Fries + 2L Cold Drink) is FREE on this order!\n`;
  }
  if (discount > 0) {
    msg += `Subtotal: ₹${subtotal}\n`;
    if (pizzaDiscount > 0) msg += `🎉 Weekday Lunch Offer (20% off pizzas): −₹${pizzaDiscount}\n`;
    if (boostDiscount > 0) msg += `🍔 The Crosta Boost (Meal upgrade ₹30 instead of ₹60): −₹${boostDiscount}\n`;
  }
  msg += `💰 *TOTAL: ₹${total}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*CUSTOMER DETAILS*\n`;
  msg += `👤 Name: ${name}\n`;
  msg += `📞 Phone: ${phone}\n`;
  msg += isPickup ? `📍 Pickup (customer will collect)\n` : (address ? `📍 Delivery to: ${address}\n` : `📍 Address: not provided\n`);
  if (!isPickup) msg += `📌 Also drop your location pin here (📎 → Location) so our rider finds you faster\n`;
  if (note) msg += `🍳 Cooking request: ${note}\n`;
  msg += `\n💳 Payment: Cash / UPI on delivery\n`;
  if (!shopStatus().open) msg += `
⏰ Sent while closed — please confirm once you open
`;
  msg += `⏱ Expecting delivery in ~25–35 min`;

  saveLastOrder(name, phone, address);
  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/919888383010?text=${encoded}`, '_blank');
}

// ── Cart count "bump" (used by steppers and the spin prize; adds use cartAddedFeedback) ──
function triggerFabWobble() {
  document.querySelectorAll('.cart-count').forEach(bump);
}
