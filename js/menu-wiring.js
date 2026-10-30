// ── WIRE UP ADD BUTTONS ──
document.addEventListener('DOMContentLoaded', function() {

  let activePills = null;
  let activeBtn = null;

  function closeSizePills() {
    if (activePills) { activePills.classList.remove('open'); activePills = null; }
    if (activeBtn) { activeBtn.classList.remove('active'); activeBtn = null; }
  }

  // The app-style row (css/app.css): the starting price and a share button on one line, and a caption under ADD.
  // data-min feeds the "Under ₹100" filter in menu-ui.js.
  const SHARE_ICON = '<svg class="ui-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>';
  function decorateRow(item, name, minPrice, caption) {
    if (minPrice != null) item.dataset.min = minPrice;
    const line = document.createElement('div');
    line.className = 'menu-price-line';
    const priceEl = item.querySelector(':scope > .menu-from') || item.querySelector(':scope > .menu-item-price');
    if (priceEl) line.appendChild(priceEl);
    const share = document.createElement('button');
    share.type = 'button'; share.className = 'share-btn'; share.innerHTML = SHARE_ICON;
    share.setAttribute('aria-label', 'Share ' + name);
    share.addEventListener('click', (e) => {
      e.stopPropagation();
      // the phone's own share sheet (WhatsApp is in it); a plain link to WhatsApp elsewhere. Not window.open: track.js counts wa.me opens as shop messages.
      const url = 'https://thecrosta.com/#menu', text = name + ' at The Crosta: pure veg pizza, burgers and more, near Thapar University, Patiala.';
      if (navigator.share) { navigator.share({ title: name + ' · The Crosta', text, url }).catch(() => {}); return; }
      const a = document.createElement('a');
      a.href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url); a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
    line.appendChild(share);
    item.appendChild(line);
    if (caption) {
      const cap = document.createElement('span');
      cap.className = 'menu-opts'; cap.textContent = caption;
      item.appendChild(cap);
    }
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
    decorateRow(item, baseName, price, '');
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
    let minPrice = null, caption = '';

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

      // "+" opens the size sheet (same one the bestsellers use); the sheet adds through addItem()
      const sizeStepperWrap = document.createElement('div');
      sizeStepperWrap.className = 'size-stepper-wrap';
      sizeStepperWrap.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;margin-top:0.45rem;';
      row.appendChild(sizeStepperWrap);
      row._sizeStepperWrap = sizeStepperWrap;
      row._sizeData = sizeLabels.map((size, i) => ({ size, price: prices[i], name: getItemName(), isPizza, isMealEligible }));

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const imgEl = item.querySelector('.menu-item-img');
        openSizeSheet(sizeEntryFor(getItemName(), menuLookup(name), imgEl ? imgEl.getAttribute('src') : ''), btn);
      });

      // each size is a button with its price: one tap adds it (pizzas then offer add-ons, as the size sheet does)
      const chips = document.createElement('div');
      chips.className = 'size-chips';
      chips.style.setProperty('--n', sizeLabels.length);
      chips.setAttribute('role', 'group');
      chips.setAttribute('aria-label', 'Add ' + name + ' by size');
      sizeLabels.forEach((size, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'size-chip';
        chip.innerHTML = '<small>' + size + '</small><b>₹' + prices[i] + '</b>';
        chip.setAttribute('aria-label', 'Add ' + name + ', ' + size + ', ₹' + prices[i]);
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const imgEl = item.querySelector('.menu-item-img');
          addItem(getItemName(), size, prices[i], isPizza, isMealEligible, imgEl ? { fromEl: imgEl, img: imgEl.getAttribute('src') } : {});
        });
        chips.appendChild(chip);
      });
      row.insertBefore(chips, sizeStepperWrap);
      const from = document.createElement('span');
      from.className = 'menu-from';
      from.innerHTML = '<small>from</small> ₹' + Math.min.apply(null, prices);
      item.appendChild(from);
      minPrice = Math.min.apply(null, prices);
      caption = /meal/i.test(priceNote.textContent) ? 'Single or meal' : sizeLabels.length + ' sizes';

    } else {
      const price = parseInt(priceText.replace(/[₹,\s]/g, ''));
      if (isNaN(price) || price <= 0) return;
      const key = name + '|std';
      row.dataset.itemKey = key;
      row._proto = { name, size: 'std', price, isPizza, isMealEligible };
      btn.addEventListener('click', (e) => { e.stopPropagation(); addItem(name, 'std', price, isPizza, isMealEligible); });
      minPrice = price;
    }

    left.appendChild(row);
    decorateRow(item, name, minPrice, caption);
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
      // spin prize: the first veggie topping is ₹0 (spinGrantFreeAddon adds it, on a single-pizza line)
      if (!(typeof spinGrantFreeAddon === 'function' && spinGrantFreeAddon(pizzaItem, addonName, price))) {
        pizzaItem.addons.push({ name: addonName, price });
      }
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
