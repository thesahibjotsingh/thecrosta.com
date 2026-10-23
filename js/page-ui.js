// ── PAGE POLISH ──

// Keep --hdr equal to the real header height (it grows a status row on phones),
// so the tools bar sticks right under it and anchor jumps clear both bars.
(function () {
  const bar = document.getElementById('bar');
  if (!bar) return;
  const set = () => document.documentElement.style.setProperty('--hdr', bar.offsetHeight + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(bar);
  window.addEventListener('resize', set);
})();

// ── SCROLL-TRIGGERED SECTION REVEALS ──
(function () {
  const targets = [
    document.querySelector('.spin-section'),
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

// ── WA SHIMMER (the green WhatsApp buttons in the cart and spin result, every 4s) ──
(function () {
  const waSelectors = '.whatsapp-btn';
  function shimmerAll() {
    document.querySelectorAll(waSelectors).forEach(btn => {
      btn.classList.remove('wa-shimmer');
      void btn.offsetWidth;
      btn.classList.add('wa-shimmer');
      btn.addEventListener('animationend', () => btn.classList.remove('wa-shimmer'), { once: true });
    });
  }
  // first shimmer after 2.5s, then every 4s — not at all for people who prefer less motion
  if (!reducedMotion()) setTimeout(() => { shimmerAll(); setInterval(shimmerAll, 4000); }, 2500);
})();
