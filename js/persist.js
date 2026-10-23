// ── SAVED CART, LAST ORDER AND DETAILS (this device only) ──
// Nothing leaves the phone/computer: it lives in localStorage so a refresh keeps
// the cart, "Reorder" has something to offer, and checkout is pre-filled.
const CART_KEY = 'crosta_cart', DETAILS_KEY = 'crosta_details';
const CART_MAX_AGE = 24 * 60 * 60 * 1000;           // an old cart is stale: prices and offers move on
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* private mode etc. — the cart still works */ } },
  del(k) { try { localStorage.removeItem(k); } catch (_) {} }
};
// the free promo lines are rebuilt by renderCart() from the real items, so they are never saved
const isPromoLine = i => i.isGroupPerk || i.isWeekendSpecial;

let cartRestored = false;                            // do not overwrite the saved cart before it has been read
function persistCart() {
  if (!cartRestored) return;
  const items = cart.filter(i => !isPromoLine(i));
  if (items.length) store.set(CART_KEY, { ts: Date.now(), items }); else store.del(CART_KEY);
}

// remember what was just ordered (for "Reorder") and the customer's details
function saveLastOrder(name, phone, address) {
  const items = cart.filter(i => !isPromoLine(i) && !i.isFreeSpinPrize).map(i => ({ name: i.name, size: i.size, qty: i.qty, addons: i.addons || [] }));
  if (items.length) store.set(LAST_ORDER_KEY, { ts: Date.now(), items });
  store.set(DETAILS_KEY, { name, phone, address: isPickup ? ((store.get(DETAILS_KEY) || {}).address || '') : address });
  if (typeof renderReorder === 'function') renderReorder();
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = store.get(CART_KEY);
  if (saved && Array.isArray(saved.items) && Date.now() - saved.ts < CART_MAX_AGE) {
    saved.items.forEach(i => {
      if (i.isFreeSpinPrize) { cart.push({ ...i }); return; }
      const cur = currentPrice(i.name, i.size);        // re-price at today's menu; skip anything no longer sold
      if (!cur) return;
      cart.push({ id: i.id, _key: i._key, name: i.name, size: i.size, price: cur.price, qty: i.qty, addons: i.addons || [], isPizza: cur.isPizza, isMealEligible: cur.isMealEligible });
    });
  }
  cartRestored = true;
  if (cart.length) { renderCart(); updateFab(); refreshMenuSteppers(); } else { store.del(CART_KEY); }

  const d = store.get(DETAILS_KEY);
  if (d) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value) el.value = v; };
    set('custName', d.name); set('custPhone', d.phone); set('custAddress', d.address);
  }
});
