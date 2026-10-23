// ── WIRE UP ADD BUTTONS ──
document.addEventListener('DOMContentLoaded', function() {

  let activePills = null;
  let activeBtn = null;

  function closeSizePills() {
    if (activePills) { activePills.classList.remove('open'); activePills = null; }
    if (activeBtn) { activeBtn.classList.remove('active'); activeBtn = null; }
  }

  document.addEventListener('click', function(e) {
    if (activePills && !activePills.contains(e.target) && e.target !== activeBtn && !activeBtn?.contains(e.target)) {
      closeSizePills();
    }
  });

  // ── 1. VARIANT items (Fresh Lime Soda, Virgin Mojito, Blue Lagoon) ──
  document.querySelectorAll('[data-variant-item]').forEach((item) => {
    const baseName = item.dataset.baseName;
    const price = parseInt(item.dataset.price);
    const defaultVariant = item.dataset.defaultVariant;
    const isPizza = !!item.closest('#tab-pizzas');

    let selectedVariant = defaultVariant;

    item.querySelectorAll('.variant-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        item.querySelectorAll('.variant-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedVariant = pill.dataset.variant;
        // update row key when variant changes
        const row = item.querySelector('.add-row');
        if (row) {
          const newKey = `${baseName} (${selectedVariant})|std`;
          row.dataset.itemKey = newKey;
          row._proto = { name: `${baseName} (${selectedVariant})`, size: 'std', price, isPizza };
        }
        refreshMenuSteppers();
      });
    });

    const left = item.querySelector('.menu-item-left');
    const row = document.createElement('div');
    row.className = 'add-row';
    const initKey = `${baseName} (${selectedVariant})|std`;
    row.dataset.itemKey = initKey;
    row._proto = { name: `${baseName} (${selectedVariant})`, size: 'std', price, isPizza };

    const btn = document.createElement('button');
    btn.className = 'add-btn';
    btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg> Add`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addItem(`${baseName} (${selectedVariant})`, 'std', price, isPizza);
    });
    row.appendChild(btn);
    left.appendChild(row);
  });

  // ── 2. REGULAR items (size-based or flat price) ──
  document.querySelectorAll('.menu-item:not([data-variant-item])').forEach((item) => {
    const nameEl = item.querySelector('.menu-item-name');
    const priceEl = item.querySelector('.menu-item-price');
    if (!nameEl || !priceEl) return;

    const name = nameEl.textContent.trim();
    const priceText = priceEl.childNodes[0].textContent.trim();
    const priceNote = item.querySelector('.price-note');
    const isMultiSize = priceNote && priceText.includes('/');
    const isPizza = !!item.closest('#tab-pizzas');
    const isMealEligible = !!item.closest('#tab-burgerswraps');

    const left = item.querySelector('.menu-item-left');
    const row = document.createElement('div');
    row.className = 'add-row';

    const btn = document.createElement('button');
    btn.className = 'add-btn';
    btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg> Add`;
    row.appendChild(btn);

    if (isMultiSize) {
      const sizeLabels = priceNote.textContent.split('/').map(s => s.trim());
      const prices = priceText.replace(/[₹\s]/g, '').split('/').map(p => parseInt(p));

      // Build a name → size price lookup for pizzas, used by the Weekend Special
      // to price the free Medium/Small pizza correctly per flavour.
      if (isPizza) {
        PIZZA_PRICE_TABLE[name] = {};
        sizeLabels.forEach((s, i) => { PIZZA_PRICE_TABLE[name][s] = prices[i]; });
      }

      // Optional flavor variant support (e.g. Paneer Tikka | Tandoori)
      const flavorAttr = item.dataset.flavorOptions;
      const flavors = flavorAttr ? flavorAttr.split('|').map(s => s.trim()) : null;
      let selectedFlavor = flavors ? flavors[0] : null;
      const getItemName = () => flavors ? `${name} (${selectedFlavor})` : name;

      if (flavors) {
        const flavorWrap = document.createElement('div');
        flavorWrap.className = 'variant-pills-row';
        flavors.forEach((fl, fi) => {
          const fbtn = document.createElement('button');
          fbtn.className = 'variant-pill' + (fi === 0 ? ' active' : '');
          fbtn.dataset.variant = fl;
          fbtn.textContent = fl;
          fbtn.addEventListener('click', (e) => {
            e.stopPropagation();
            flavorWrap.querySelectorAll('.variant-pill').forEach(p => p.classList.remove('active'));
            fbtn.classList.add('active');
            selectedFlavor = fl;
            if (row._sizeData) row._sizeData.forEach(sd => sd.name = getItemName());
            refreshMenuSteppers();
          });
          flavorWrap.appendChild(fbtn);
        });
        left.appendChild(flavorWrap);
      }

      const pillsWrap = document.createElement('div');
      pillsWrap.className = 'size-pills';

      const lbl = document.createElement('span');
      lbl.className = 'size-pills-label';
      lbl.textContent = 'Size:';
      pillsWrap.appendChild(lbl);

      sizeLabels.forEach((size, i) => {
        const pill = document.createElement('div');
        pill.className = 'size-pill';
        pill.dataset.sizeKey = name + '|' + size;
        pill.dataset.sizeName = size;
        pill.dataset.sizePrice = prices[i];
        pill.dataset.itemName = name;
        pill.dataset.isPizza = isPizza ? '1' : '';
        pill.innerHTML = `<span class="pill-size">${size}</span><span class="pill-price">₹${prices[i]}</span>`;

        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          addItem(getItemName(), size, prices[i], isPizza, isMealEligible);
          closeSizePills();
          // refreshMenuSteppers will convert this pill to a stepper
        });
        pillsWrap.appendChild(pill);
      });

      // A separate "size stepper" area shown when ≥1 size has been added
      const sizeStepperWrap = document.createElement('div');
      sizeStepperWrap.className = 'size-stepper-wrap';
      sizeStepperWrap.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;margin-top:0.45rem;';
      row.appendChild(sizeStepperWrap);

      row.appendChild(pillsWrap);
      row._sizeStepperWrap = sizeStepperWrap;
      row._sizeData = sizeLabels.map((size, i) => ({ size, price: prices[i], name: getItemName(), isPizza, isMealEligible }));

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activePills === pillsWrap) {
          closeSizePills();
        } else {
          closeSizePills();
          pillsWrap.classList.add('open');
          btn.classList.add('active');
          activePills = pillsWrap;
          activeBtn = btn;
        }
      });

    } else {
      const price = parseInt(priceText.replace(/[₹,\s]/g, ''));
      if (isNaN(price) || price <= 0) return;
      const key = name + '|std';
      row.dataset.itemKey = key;
      row._proto = { name, size: 'std', price, isPizza, isMealEligible };
      btn.addEventListener('click', (e) => { e.stopPropagation(); addItem(name, 'std', price, isPizza, isMealEligible); });
    }

    left.appendChild(row);
  });

  // Animation 6: pulse the first Add button once on load
  setTimeout(() => {
    const firstBtn = document.querySelector('.add-btn');
    if (firstBtn) {
      firstBtn.classList.add('first-pulse');
      firstBtn.addEventListener('animationend', () => firstBtn.classList.remove('first-pulse'), { once: true });
    }
  }, 900);

  // Animation 4: set stagger delays for the initially active pizza panel
  const activePanel = document.querySelector('.menu-panel.active');
  if (activePanel) {
    activePanel.querySelectorAll('.menu-item').forEach((item, i) => {
      item.style.animationDelay = (i * 35) + 'ms';
    });
  }

  // Remove old global picker if present
  const old = document.getElementById('globalSizePicker');
  if (old) old.remove();
});

// ── TOGGLE ADDON POPUP CARD ──
function toggleAddonPopupCard(card) {
  if (!currentPopupPizzaId) return;
  const pizzaItem = cart.find(i => i.id === currentPopupPizzaId);
  if (!pizzaItem) return;

  const addonName = card.dataset.addon;
  const price     = parseInt(card.dataset.activePrice, 10) || getAddonPriceForSize(card.dataset.tierPrices, pizzaItem.size);

  card.classList.toggle('selected');
  const isNowSelected = card.classList.contains('selected');

  if (isNowSelected) {
    if (!pizzaItem.addons.find(a => a.name === addonName)) {
      pizzaItem.addons.push({ name: addonName, price });
    }
  } else {
    pizzaItem.addons = pizzaItem.addons.filter(a => a.name !== addonName);
  }

  updateAddonPopupFooter();
  renderCart();
  updateFab();
}

// ── TOGGLE ADDON (main panel) ──
function toggleAddon(btn) {
  const card  = btn.closest('.addon-card');
  const panel = card.closest('.addons-panel');
  if (panel && panel.classList.contains('locked')) return;

  // attach to the most recently added pizza in cart
  const pizzas = cart.filter(i => i.isPizza);
  if (!pizzas.length) return;
  const pizzaItem = pizzas[pizzas.length - 1];

  const addonName = card.dataset.addon;
  const price     = parseInt(card.dataset.price);

  if (card.classList.contains('selected')) {
    pizzaItem.addons = pizzaItem.addons.filter(a => a.name !== addonName);
    card.classList.remove('selected');
    btn.textContent = '＋';
  } else {
    if (!pizzaItem.addons.find(a => a.name === addonName)) {
      pizzaItem.addons.push({ name: addonName, price });
    }
    card.classList.add('selected');
    btn.textContent = '✓';
  }
  renderCart();
  updateFab();
  if (typeof refreshAddonLock === 'function') refreshAddonLock();
  triggerFabWobble();
}
