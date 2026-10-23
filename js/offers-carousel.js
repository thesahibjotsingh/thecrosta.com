// ── OFFERS CAROUSEL ──
(function() {
  let idx = 0, timer = null;
  const track = document.getElementById('offersTrack');
  const dotsWrap = document.getElementById('offersDots');
  if (!track || !dotsWrap) return;
  const slides = track.children.length;

  for (let i = 0; i < slides; i++) {
    const dot = document.createElement('button');
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', 'Go to offer ' + (i + 1));
    dot.onclick = () => { goTo(i); restart(); };
    dotsWrap.appendChild(dot);
  }
  const dots = dotsWrap.querySelectorAll('button');

  function render() {
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }
  function goTo(i) { idx = (i + slides) % slides; render(); }
  window.offersMove = function(dir) { goTo(idx + dir); restart(); };
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => goTo(idx + 1), 4500);
  }

  const carousel = document.querySelector('.offers-carousel');
  carousel.addEventListener('mouseenter', () => clearInterval(timer));
  carousel.addEventListener('mouseleave', restart);

  let touchX = null;
  carousel.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
  carousel.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1));
    touchX = null;
    restart();
  }, { passive: true });

  render();
  restart();
})();
