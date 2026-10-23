// ── MOBILE SUBNAV ACTIVE STATE ──
(function() {
  const subLinks = document.querySelectorAll('.mobile-subnav > a, .subnav-more-menu a');
  const moreBtn = document.getElementById('subnavMoreBtn');
  const moreMenu = document.getElementById('subnavMoreMenu');
  const sections = ['offers','menu','spin','hours','contact'].map(id => document.getElementById(id)).filter(Boolean);
  function updateActive() {
    let active = null;
    sections.forEach(sec => { if (window.scrollY >= sec.offsetTop - 120) active = sec; });
    const activeHref = active ? ('#' + active.id) : null;
    subLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === activeHref));
    if (moreBtn) {
      moreBtn.classList.toggle('active', activeHref === '#hours' || activeHref === '#contact');
    }
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  if (moreBtn && moreMenu) {
    document.body.appendChild(moreMenu); // escape .mobile-subnav's overflow + backdrop-filter containing block
    function positionMoreMenu() {
      const rect = moreBtn.getBoundingClientRect();
      moreMenu.style.top = (rect.bottom + 6) + 'px';
      moreMenu.style.right = (window.innerWidth - rect.right) + 'px';
    }
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = moreMenu.classList.contains('open');
      if (!isOpen) positionMoreMenu();
      moreMenu.classList.toggle('open', !isOpen);
      moreBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });
    moreMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      moreMenu.classList.remove('open');
      moreBtn.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('click', (e) => {
      if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
        moreMenu.classList.remove('open');
        moreBtn.setAttribute('aria-expanded', 'false');
      }
    });
    window.addEventListener('scroll', () => {
      moreMenu.classList.remove('open');
      moreBtn.setAttribute('aria-expanded', 'false');
    }, { passive: true });
  }
})();
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── SCROLL-TRIGGERED SECTION REVEALS ──
(function() {
  const targets = [
    document.querySelector('.spin-section'),
    document.querySelector('.how-section'),
    document.querySelector('.info-section'),
    document.querySelector('.contact-section'),
    document.querySelector('footer'),
  ].filter(Boolean);

  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.07 });

  targets.forEach(el => observer.observe(el));
})();

// ── STICKY ORDER NUDGE ──
(function() {
  const nudge = document.getElementById('orderNudge');
  const menuSection = document.getElementById('menu');
  const nudgeCount = document.getElementById('nudgeCount');
  const nudgeTotal = document.getElementById('nudgeTotal');

  function updateNudge() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const { total } = computeCartTotals(cart);
    nudgeCount.textContent = count + (count === 1 ? ' item' : ' items');
    nudgeTotal.textContent = '₹' + total;

    const menuRect = menuSection ? menuSection.getBoundingClientRect() : null;
    const pastMenu = menuRect && menuRect.bottom < 60;
    const cartOpen = document.getElementById('cartDrawer').classList.contains('open');
    const shouldShow = count > 0 && pastMenu && !cartOpen;
    nudge.classList.toggle('visible', shouldShow);
  }

  window.addEventListener('scroll', updateNudge, { passive: true });

  // hook into cart state changes by patching updateFab
  const _origUpdateFab = updateFab;
  window.updateFab = function() { _origUpdateFab(); updateNudge(); };

  // hide nudge when cart opens/closes
  document.getElementById('cartDrawer').addEventListener('transitionend', updateNudge);
})();

// ── WA SHIMMER (all green WA buttons, every 4s) ──
(function() {
  const waSelectors = '.whatsapp-btn, .btn-whatsapp-hero, .how-cta, .nav-wa';
  function shimmerAll() {
    document.querySelectorAll(waSelectors).forEach(btn => {
      btn.classList.remove('wa-shimmer');
      void btn.offsetWidth;
      btn.classList.add('wa-shimmer');
      btn.addEventListener('animationend', () => btn.classList.remove('wa-shimmer'), { once: true });
    });
  }
  // first shimmer after 2.5s, then every 4s
  setTimeout(() => { shimmerAll(); setInterval(shimmerAll, 4000); }, 2500);
})();
