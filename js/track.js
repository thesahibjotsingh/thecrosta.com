// ── ANALYTICS: what customers do, never who they are ──
// Sends small anonymous notes ("added to cart", "tapped Order") to our own counter (worker/).
// A note holds: the event name, an anonymous random visitor id, phone/desktop, where the visitor came
// from, whether the shop was open, and a few harmless numbers (item name, order total). It NEVER holds a
// name, phone number, address, location, notes, or what is typed in any box.
//
// Off by default: until CONFIG.endpoint is filled in (see worker/README.md) nothing leaves the page.
// The owner's own phone can opt out with ?notrack=1 (and back in with ?notrack=0).
(function () {
  const CONFIG = {
    endpoint: 'https://crosta-analytics.sahibjotsingh-social.workers.dev/e',          // e.g. 'https://crosta-analytics.YOURNAME.workers.dev/e'
    cfBeaconToken: ''      // Cloudflare Web Analytics token (optional: adds the visitor/source charts in Cloudflare)
  };

  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  try {
    const m = /[?&]notrack=(\w+)/.exec(location.search);
    if (m) { if (m[1] === '1') localStorage.setItem('crosta_notrack', '1'); else localStorage.removeItem('crosta_notrack'); }
  } catch (_) { /* storage unavailable: tracking still works, opt-out just can't be remembered */ }
  const optedOut = () => { try { return localStorage.getItem('crosta_notrack') === '1'; } catch (_) { return false; } };
  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';

  // anonymous visitor id: random, lives only on this phone, tied to nobody
  let vid = '';
  try { vid = localStorage.getItem('crosta_vid') || ''; } catch (_) { /* fall through */ }
  if (!vid) {
    vid = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem('crosta_vid', vid); } catch (_) { /* id then lasts this page only */ }
  }

  // where did they come from? first touch of the visit wins (?from=instagram, ?utm_source=, or the referring site)
  function source() {
    try { const s = sessionStorage.getItem('crosta_src'); if (s) return s; } catch (_) { /* ignore */ }
    const q = new URLSearchParams(location.search);
    let s = q.get('from') || q.get('utm_source') || '';
    if (!s && document.referrer) { try { const h = new URL(document.referrer).hostname.replace(/^www\./, ''); if (h && h !== location.hostname.replace(/^www\./, '')) s = h; } catch (_) { /* ignore */ } }
    s = (s || 'direct').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30) || 'direct';
    try { sessionStorage.setItem('crosta_src', s); } catch (_) { /* ignore */ }
    return s;
  }
  const device = () => innerWidth <= 760 ? 'phone' : innerWidth <= 1020 ? 'tablet' : 'desktop';
  const shopOpen = () => { try { return typeof shopStatus === 'function' ? (shopStatus().open ? 1 : 0) : null; } catch (_) { return null; } };

  // only short strings and numbers, so nothing typed by a customer can slip into a note
  function clean(p) {
    const out = {};
    Object.keys(p || {}).slice(0, 8).forEach(k => {
      const v = p[k];
      if (typeof v === 'number' && isFinite(v)) out[k] = Math.round(v);
      else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
      else if (typeof v === 'string') out[k] = v.slice(0, 40);
    });
    return out;
  }

  function track(e, props) {
    if (optedOut() || dnt) return;
    const note = { e, vid, dev: device(), src: source(), open: shopOpen(), p: clean(props) };
    if (window.__trackSink) window.__trackSink.push(note);        // lets the page be tested without sending anything
    if (!CONFIG.endpoint || local) return;
    try {
      const body = JSON.stringify(note);
      if (!(navigator.sendBeacon && navigator.sendBeacon(CONFIG.endpoint, new Blob([body], { type: 'text/plain' })))) {
        fetch(CONFIG.endpoint, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
      }
    } catch (_) { /* analytics must never break the shop */ }
  }
  window.track = track;

  // Cloudflare's own visitor counter (cookie-free); only if a token was filled in
  if (CONFIG.cfBeaconToken && !local && !optedOut() && !dnt) {
    const s = document.createElement('script');
    s.defer = true; s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CONFIG.cfBeaconToken }));
    document.head.appendChild(s);
  }

  /* ───────────── what we count ───────────── */
  const totals = () => { try { const T = computeCartTotals(cart); return { total: T.total, items: cart.reduce((n, i) => n + i.qty, 0), promo: T.activePromo || '' }; } catch (_) { return {}; } };

  // functions that already exist: do their job, and make a note on the way
  function wrap(name, note) {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () { try { note.apply(this, arguments); } catch (_) { /* never block the shop */ } return orig.apply(this, arguments); };
  }
  wrap('addItem', (name, size) => track('add_item', { item: name, size: size && size !== 'std' ? size : '' }));
  wrap('openCart', () => { const t = totals(); track('cart_open', { items: t.items, total: t.total }); });
  window.addEventListener('crosta:spin-start', e => { if (!(e.detail && e.detail.retry)) track('spin'); });
  wrap('setStudent', on => track('student_toggle', { on: !!on }));

  // the WhatsApp order: the moment the order message is handed to WhatsApp
  const origOpen = window.open;
  window.open = function (url) {
    try {
      const u = String(url || '');
      if (/wa\.me\//.test(u) && /text=/.test(u)) {
        const text = decodeURIComponent(u.split('text=')[1] || '');
        if (text.indexOf('New Order') !== -1) {
          const t = totals();
          track('order_sent', { total: t.total, items: t.items, promo: t.promo, pay: typeof payMethod !== 'undefined' ? payMethod : '', pickup: typeof isPickup !== 'undefined' ? isPickup : '' });
        } else track('contact_sent');
      }
    } catch (_) { /* ignore */ }
    return origOpen.apply(window, arguments);
  };

  // taps, noticed once for the whole page
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    let m;
    if ((m = t.closest('#orderBtn'))) { const x = totals(); track('order_tap', { total: x.total, items: x.items, promo: x.promo }); return; }
    if ((m = t.closest('.upi-app, #upiPayBtn'))) { track('upi_tap', { app: m.id === 'upiPhonePe' ? 'phonepe' : m.id === 'upiGPay' ? 'gpay' : m.id === 'upiPaytm' ? 'paytm' : 'upi' }); return; }
    if ((m = t.closest('[data-offer]'))) { track('offer_tap', { id: m.dataset.offer }); return; }
    if ((m = t.closest('[data-cat]'))) { track('menu_cat', { cat: m.dataset.cat, from: m.classList.contains('chip') ? 'chip' : m.classList.contains('tile') ? 'tile' : 'link' }); return; }
    if ((m = t.closest('#mainnav a, #dock a, #dock button'))) { track('nav_tap', { to: m.dataset.nav || m.dataset.dock || '' }); return; }
    if (t.closest(".find-card, .visit-directions")) { track('directions_tap'); return; }
    if (t.closest('#waBtn')) { track('wa_header_tap'); return; }
    if (t.closest('a[href^="tel:"]')) { track('call_tap'); }
  }, true);

  // one "visit" per browsing session; open = was the shop open at the time (tells you how many come after hours)
  let seen = false;
  try { seen = sessionStorage.getItem('crosta_visit') === '1'; sessionStorage.setItem('crosta_visit', '1'); } catch (_) { /* ignore */ }
  if (!seen) track('visit');
})();
