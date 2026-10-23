// ── Tab switching ──
// ── TABS SCROLL HINT ──
(function() {
  const tabs = document.getElementById('menuTabs');
  const hint = document.getElementById('tabsScrollHint');
  if (!tabs || !hint) return;
  function updateHint() {
    const atEnd = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 8;
    hint.classList.toggle('hidden', atEnd);
  }
  tabs.addEventListener('scroll', updateHint, { passive: true });
  window.addEventListener('resize', updateHint);
  // run once after layout
  setTimeout(updateHint, 100);
})();

function showTab(name, btn) {
  document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('tab-' + name);
  panel.classList.add('active');
  btn.classList.add('active');

  // Animation 4: stagger-in menu items
  panel.querySelectorAll('.menu-item').forEach((item, i) => {
    item.style.animationDelay = (i * 35) + 'ms';
  });

  // show / hide Quick Bites sub-nav
  const subnav = document.getElementById('qbSubnav');
  if (name === 'quickbites') {
    subnav.classList.add('visible');
    document.querySelectorAll('.qb-sub-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  } else {
    subnav.classList.remove('visible');
  }

  // keep the mobile category picker's active row in sync
  syncMobileCatPicker(name);

  // show/swap the menu-sizes box depending on category
  updateMenuSizesBox(name);
}

// ── MENU SIZES / MEAL UPSELL / DOUGH INFO BOX ──
function updateMenuSizesBox(name) {
  const box = document.getElementById('menuSizesBox');
  if (!box) return;
  const variants = ['pizzas', 'burgerswraps', 'garlicbread'];
  if (variants.includes(name)) {
    box.classList.remove('menu-sizes-hidden');
    box.querySelectorAll('.menu-sizes-variant').forEach(v => {
      v.classList.toggle('active', v.dataset.variant === name);
    });
  } else {
    box.classList.add('menu-sizes-hidden');
  }
}

// ── MOBILE CATEGORY PICKER (replaces sliding tabs on small screens) ──
function syncMobileCatPicker(name) {
  document.querySelectorAll('.mobile-cat-sheet-row').forEach(r => {
    r.classList.toggle('active', r.dataset.cat === name);
  });
}

function selectMobileCategory(name) {
  const desktopBtn = document.querySelector('.tab[data-cat="' + name + '"]');
  if (!desktopBtn) return;
  showTab(name, desktopBtn);
  closeMobileCatSheet();
  const menuSection = document.getElementById('menu');
  if (menuSection) {
    const top = menuSection.getBoundingClientRect().top + window.scrollY - 68;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function openMobileCatSheet() {
  document.getElementById('mobileCatTrigger')?.classList.add('open');
  document.getElementById('mobileCatTrigger')?.setAttribute('aria-expanded', 'true');
  document.getElementById('mobileCatSheetOverlay')?.classList.add('open');
  document.getElementById('mobileCatSheet')?.classList.add('open');
}

function closeMobileCatSheet() {
  document.getElementById('mobileCatTrigger')?.classList.remove('open');
  document.getElementById('mobileCatTrigger')?.setAttribute('aria-expanded', 'false');
  document.getElementById('mobileCatSheetOverlay')?.classList.remove('open');
  document.getElementById('mobileCatSheet')?.classList.remove('open');
}

(function initMobileCatPicker() {
  const list = document.getElementById('mobileCatSheetList');
  const trigger = document.getElementById('mobileCatTrigger');
  const overlay = document.getElementById('mobileCatSheetOverlay');
  if (!list || !trigger || !overlay) return;

  document.querySelectorAll('.tab[data-cat]').forEach(tabBtn => {
    const cat = tabBtn.dataset.cat;
    const label = tabBtn.textContent.trim();
    const panel = document.getElementById('tab-' + cat);
    const count = panel ? panel.querySelectorAll('.menu-item').length : 0;

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'mobile-cat-sheet-row' + (tabBtn.classList.contains('active') ? ' active' : '');
    row.dataset.cat = cat;
    row.innerHTML = `<span>${label}</span><span class="mobile-cat-sheet-row-count">${count}</span>`;
    row.addEventListener('click', () => selectMobileCategory(cat));
    list.appendChild(row);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (trigger.classList.contains('open')) closeMobileCatSheet();
    else openMobileCatSheet();
  });
  overlay.addEventListener('click', closeMobileCatSheet);
})();


function scrollToQbCategory(id, btn) {
  document.querySelectorAll('.qb-sub-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 68 + 60; // nav height + subnav height
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ── Intersection observer: highlight active sub-nav pill while scrolling ──
(function() {
  const cats = ['qb-fries','qb-springrolls'];
  const observer = new IntersectionObserver((entries) => {
    const panel = document.getElementById('tab-quickbites');
    if (!panel || !panel.classList.contains('active')) return;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = cats.indexOf(entry.target.id);
        if (idx === -1) return;
        document.querySelectorAll('.qb-sub-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.addEventListener('DOMContentLoaded', () => {
    cats.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
  });
})();
