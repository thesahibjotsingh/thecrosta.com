// ── Contact form ──
// There is no server to receive form posts, so the message is composed into a
// WhatsApp chat with the shop (same channel orders use). Nothing is claimed as
// "sent" until the customer actually taps Send in WhatsApp.
function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const val = id => form.querySelector('#' + id).value.trim();

  const lines = ['👋 *Message from thecrosta.com*', '', `Name: ${val('contactName')}`];
  if (val('contactPhone')) lines.push(`Phone: ${val('contactPhone')}`);
  if (val('contactEmail')) lines.push(`Email: ${val('contactEmail')}`);
  lines.push('', val('contactMessage'));

  window.open('https://wa.me/919877636100?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');

  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = '✓ Opening WhatsApp…';
  btn.style.background = '#2E7D32';
  setTimeout(() => { btn.textContent = 'Send via WhatsApp'; btn.style.background = ''; form.reset(); }, 3000);
}
