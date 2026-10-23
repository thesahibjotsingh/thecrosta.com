// ── THAPAR STUDENT DISCOUNT: the page card and the cart checkbox ──
// The rules live in promos.js (setStudent / isStudentOn / resolveActivePromo).
// Both controls flip the same switch and always show the same state.
(function () {
  const card = document.getElementById('studentCard'), btn = document.getElementById('studentBtn'), cardText = document.getElementById('studentCardText');
  const box = document.getElementById('cartStudentCheck'), note = document.getElementById('cartStudentNote');
  const OFF_CARD = 'Bring your student ID card. We check it when you collect or we deliver.';
  const OFF_NOTE = 'Show your student ID card when you collect or we deliver. One offer per order.';

  window.syncStudentUi = function () {
    const on = isStudentOn();
    if (card) {
      card.classList.toggle('on', on);
      btn.textContent = on ? 'Turn off' : 'Count me in';
      btn.setAttribute('aria-pressed', String(on));
      cardText.textContent = on ? 'On for your order. Show your student ID card when you collect or we deliver.' : OFF_CARD;
    }
    if (box) {
      box.checked = on;
      let text = OFF_NOTE;
      if (on && cart.length) {
        const T = computeCartTotals(cart);
        text = T.studentActive ? `Applied: you save ${rupee(T.studentDiscount)}. Show your student ID card when you collect or we deliver.`
             : (T.activePromo ? `Not applied: ${PROMO_LABEL[T.activePromo]} saves you more on this order (one offer per order).` : OFF_NOTE);
      }
      note.textContent = text;
    }
  };

  const toggle = on => {
    setStudent(on);
    if (on) showToast('Thapar student 10% is on — show your ID card');
  };
  if (btn) btn.addEventListener('click', () => toggle(!isStudentOn()));
  if (box) box.addEventListener('change', () => toggle(box.checked));
  syncStudentUi();
})();
