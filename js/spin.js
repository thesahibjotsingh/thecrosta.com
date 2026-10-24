(function() {
  // Order matches the wheel image, clockwise from the top segment
  const SEGMENTS = [
    { label: 'Lucky Spin Again',      emoji: '🔄', weight: 3,  msg: '' },
    { label: 'Extra Topping',         emoji: '🌶️', weight: 3,  msg: '🎉 I won a FREE extra topping on my pizza from The Crosta spin wheel!',  cartItem: { name: 'Extra Topping (Free — Spin Prize)', size: '' } },
    { label: 'Better Luck Next Time', emoji: '😅', weight: 55, msg: '', noWin: true },
    { label: '20% Off',               emoji: '🏷️', weight: 4,  msg: '🎉 I won 20% off my order from The Crosta spin wheel! Please apply it.' },
    { label: 'Free 250ml Cold Drink', emoji: '🥤', weight: 4,  msg: '🎉 I won a FREE 250ml Cold Drink with my order from The Crosta spin wheel!', cartItem: { name: 'Cold Drink 250ml (Free — Spin Prize)', size: '' } },
    { label: 'Double Cheese',         emoji: '🧀', weight: 2,  msg: '🎉 I won FREE Double Cheese on my pizza from The Crosta spin wheel!' },
    { label: 'Free Garlic Bread',     emoji: '🍞', weight: 2,  msg: '🎉 I won a FREE Garlic Bread with my order from The Crosta spin wheel!', cartItem: { name: 'Garlic Bread (Free — Spin Prize)', size: '' } },
    { label: '10% Off',               emoji: '🏷️', weight: 4,  msg: '🎉 I won 10% off my order from The Crosta spin wheel! Please apply it.' },
    { label: 'Free Fries',            emoji: '🍟', weight: 3,  msg: '🎉 I won FREE Fries with my order from The Crosta spin wheel!',         cartItem: { name: 'Fries (Free — Spin Prize)', size: '' } },
  ];

  // Build weighted pool
  const pool = [];
  SEGMENTS.forEach((s, i) => { for (let j = 0; j < s.weight; j++) pool.push(i); });

  const wheelImg = document.getElementById('wheelImage');
  const btn      = document.getElementById('spinBtn');
  const total    = SEGMENTS.length;
  const arcDeg   = 360 / total; // degrees per segment, segment i centred at i*arcDeg from top

  const LOCK_KEY  = 'crosta_spin_ts';
  const LOCK_MS   = 86400 * 1000; // 24 hours

  // localStorage can throw (private mode, blocked storage) — the spin must still work.
  function readLock()  { try { return localStorage.getItem(LOCK_KEY); } catch (e) { return null; } }
  function writeLock() { try { localStorage.setItem(LOCK_KEY, Date.now().toString()); } catch (e) { /* in-memory lock still applies */ } window.dispatchEvent(new Event('crosta-spin')); }

  function getLockRemaining() {
    const ts = readLock();
    if (!ts) return 0;
    const remaining = LOCK_MS - (Date.now() - parseInt(ts, 10));
    return remaining > 0 ? remaining : 0;
  }

  function formatCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `Come back in ${h}h ${m}m`;
    if (m > 0) return `Come back in ${m}m ${s}s`;
    return `Come back in ${s}s`;
  }

  let currentAngle = 0; // degrees, cumulative CSS rotation
  let spinning     = false;
  let hasSpun      = getLockRemaining() > 0;
  let countdownInterval = null;

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const rem = getLockRemaining();
      if (rem <= 0) {
        clearInterval(countdownInterval);
        hasSpun = false;
        btn.classList.remove('is-locked');
        btn.querySelector('.spin-btn-text').textContent = 'Spin the Wheel';
      } else {
        btn.querySelector('.spin-btn-text').textContent = formatCountdown(rem);
      }
    }, 1000);
  }

  function setWheelRotation(deg) {
    wheelImg.style.transform = `rotate(${deg}deg)`;
  }

  setWheelRotation(currentAngle);

  // If locked from a previous spin, show countdown
  if (hasSpun) {
    btn.classList.add('is-locked');
    btn.querySelector('.spin-btn-text').textContent = formatCountdown(getLockRemaining());
    startCountdown();
  }

  function jerkWheel() {
    const wrap = document.getElementById('spinWheelWrap');
    wrap.classList.remove('jerk');
    // force reflow so the animation can replay on repeated clicks
    void wrap.offsetWidth;
    wrap.classList.add('jerk');
  }

  window.doSpin = function() {
    if (spinning || hasSpun) { jerkWheel(); return; }
    spinning = true;
    btn.classList.add('is-locked');

    // Pick winner from weighted pool
    const winIdx   = pool[Math.floor(Math.random() * pool.length)];
    const winner   = SEGMENTS[winIdx];

    // Segment i is centred at (i * arcDeg) degrees clockwise from the top.
    // We need to rotate the wheel so that centre lands under the pointer (top, 0deg).
    const alpha         = winIdx * arcDeg;
    const base          = ((currentAngle % 360) + 360) % 360;
    const desiredMod     = ((-alpha % 360) + 360) % 360;
    const forwardDelta   = ((desiredMod - base) % 360 + 360) % 360;
    const extraSpins     = 5 + Math.floor(Math.random() * 4); // 5-8 full rotations
    const targetAngle    = currentAngle + forwardDelta + extraSpins * 360;

    const duration = 4200 + Math.random() * 800;
    const startAngle = currentAngle;
    const startTime  = performance.now();

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function animate(now) {
      const elapsed = now - startTime;
      const t       = Math.min(elapsed / duration, 1);
      currentAngle  = startAngle + (targetAngle - startAngle) * easeOut(t);
      setWheelRotation(currentAngle);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // `spinning` is only cleared once the wheel has fully stopped, so a
        // second click can never start an overlapping animation.
        spinning = false;
        if (winner.label === 'Lucky Spin Again') {
          // Free re-spin: no lock yet — unlock the button and show the card.
          btn.classList.remove('is-locked');
          showResultCard({ label: '🔄 Spin Again!', emoji: '🔄', msg: '' }, true);
        } else {
          writeLock();
          hasSpun = true;
          btn.classList.add('is-locked');
          startCountdown();
          showResultCard(winner, false);
        }
      }
    }

    requestAnimationFrame(animate);
  };

  function showResultCard(winner, isRepin) {
    const result    = document.getElementById('spinResult');
    const prizeEl   = document.getElementById('spinResultPrize');
    const emojiEl   = document.getElementById('spinResultEmoji');
    const waBtn     = document.getElementById('spinWaBtn');

    if (isRepin) {
      prizeEl.textContent = 'Spin Again — Lucky you!';
      emojiEl.textContent = '🔄';
      waBtn.style.display = 'none';
      document.getElementById('spinAddCartBtn').style.display = 'none';
      document.querySelector('.spin-again-hint').textContent = '← Try your luck again!';
    } else if (winner.noWin) {
      prizeEl.textContent = 'Better Luck Next Time!';
      emojiEl.textContent = '😅';
      waBtn.style.display = 'none';
      document.getElementById('spinAddCartBtn').style.display = 'none';
      document.querySelector('.spin-again-hint').textContent = 'Come back tomorrow for another spin!';
    } else {
      prizeEl.textContent = winner.label;
      emojiEl.textContent = winner.emoji;
      waBtn.style.display = '';
      // A win can follow a free re-spin, which changed this text — put it back.
      document.querySelector('.spin-again-hint').textContent = '← Spin again next visit';
      const msg = `${winner.msg}\n\nPlease apply this to my order (orders of ₹100 or more). Thank you! 🍕`;
      waBtn.href = `https://wa.me/919888383010?text=${encodeURIComponent(msg)}`;

      // Show "Add to Cart" only if the prize maps to a cartable free item
      const cartBtn = document.getElementById('spinAddCartBtn');
      if (winner.cartItem) {
        window._spinPrize = winner.cartItem; // store for addSpinPrizeToCart()
        cartBtn.textContent = `🛒 Add ${winner.label} to Cart`;
        cartBtn.classList.remove('added');
        cartBtn.disabled = false;
        cartBtn.style.display = '';
      } else {
        cartBtn.style.display = 'none';
      }
    }

    result.classList.add('visible');
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  window.addSpinPrizeToCart = function() {
    const prize = window._spinPrize;
    if (!prize) return;
    const id = prize.name + '|free|' + Date.now();
    cart.push({ id, _key: prize.name, name: prize.name, size: prize.size || '', price: 0, qty: 1, addons: [], isFreeSpinPrize: true });
    renderCart();
    updateFab();
    refreshMenuSteppers();
    triggerFabWobble();
    const cartBtn = document.getElementById('spinAddCartBtn');
    cartBtn.textContent = '✓ Added! Add more items below';
    cartBtn.classList.add('added');
    cartBtn.disabled = true;
    // scroll to menu after brief pause
    setTimeout(() => {
      document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 700);
  };

  window.resetSpin = function() {
    // Only resets display, not session — so they can't spam real deals
    document.getElementById('spinResult').classList.remove('visible');
  };
})();
