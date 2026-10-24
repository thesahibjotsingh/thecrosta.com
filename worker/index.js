// The Crosta analytics counter (a Cloudflare Worker).
//   POST /e            the website sends one small anonymous note per action (see js/track.js)
//   GET  /stats?key=…  your private results page (needs the STATS_KEY secret you set)
// Storage: one Cloudflare D1 table called `events` (worker/schema.sql).
// No names, phone numbers, addresses or IP addresses are stored. See worker/README.md.

const ALLOWED_ORIGINS = ['https://thecrosta.com', 'https://www.thecrosta.com'];
const EVENTS = new Set(['visit', 'menu_cat', 'add_item', 'cart_open', 'order_tap', 'order_sent', 'contact_sent', 'upi_tap',
  'offer_tap', 'student_toggle', 'spin', 'nav_tap', 'directions_tap', 'wa_header_tap', 'call_tap']);

const DETAILS = new Set(['item', 'size', 'cat', 'from', 'id', 'app', 'total', 'items', 'promo', 'pay', 'pickup', 'on', 'to']);
const short = (v, n = 40) => (typeof v === 'string' ? v.replace(/[^\w .,@&+/:|%₹–-]/g, '').slice(0, n) : '');

// the day and hour in Indian time, whatever time zone the Worker runs in
function indiaTime(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hr: parseInt(p.hour, 10) };
}

export async function handleEvent(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return new Response(null, { status: 403 });
  let note;
  try {
    const text = await request.text();
    if (text.length > 2000) return new Response(null, { status: 413 });
    note = JSON.parse(text);
  } catch (_) { return new Response(null, { status: 400 }); }
  if (!note || !EVENTS.has(note.e)) return new Response(null, { status: 400 });

  // keep only short, plain values; anything else is dropped
  // only these detail names are ever stored, and anything that looks like a phone number is dropped
  const p = {};
  if (note.p && typeof note.p === 'object') {
    Object.keys(note.p).filter(k => DETAILS.has(k)).forEach(k => {
      const v = note.p[k];
      if (typeof v === 'number' && isFinite(v)) p[k] = Math.round(v);
      else if (typeof v === 'string' && !/\d{7,}/.test(v.replace(/[\s-]/g, ''))) p[k] = short(v);
    });
  }
  const now = Date.now(), t = indiaTime(now);
  await env.DB.prepare('INSERT INTO events (ts, day, hr, e, vid, dev, src, open, p) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(now, t.day, t.hr, note.e, short(note.vid, 24), ['phone', 'tablet', 'desktop'].includes(note.dev) ? note.dev : '', short(note.src, 30) || 'direct',
      note.open === 1 ? 1 : note.open === 0 ? 0 : null, JSON.stringify(p)).run();
  return new Response(null, { status: 204 });
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–');

export async function statsPage(env, days = 14) {
  const since = indiaTime(Date.now() - (days - 1) * 86400000).day;
  const all = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results || [];

  const daily = await all(`SELECT day,
      COUNT(DISTINCT CASE WHEN e='visit' THEN vid END) AS visitors,
      COUNT(DISTINCT CASE WHEN e='add_item' THEN vid END) AS adders,
      COUNT(DISTINCT CASE WHEN e='cart_open' THEN vid END) AS carters,
      SUM(e='order_tap') AS taps, SUM(e='order_sent') AS sent,
      COALESCE(SUM(CASE WHEN e='order_sent' THEN json_extract(p,'$.total') END), 0) AS revenue
    FROM events WHERE day >= ? GROUP BY day ORDER BY day DESC`, since);
  const sum = daily.reduce((a, d) => ({ visitors: a.visitors + d.visitors, adders: a.adders + d.adders, carters: a.carters + d.carters, taps: a.taps + d.taps, sent: a.sent + d.sent, revenue: a.revenue + d.revenue }),
    { visitors: 0, adders: 0, carters: 0, taps: 0, sent: 0, revenue: 0 });
  const items = await all(`SELECT json_extract(p,'$.item') AS k, COUNT(*) AS n FROM events WHERE e='add_item' AND day >= ? GROUP BY k ORDER BY n DESC LIMIT 10`, since);
  const cats = await all(`SELECT json_extract(p,'$.cat') AS k, COUNT(*) AS n FROM events WHERE e='menu_cat' AND day >= ? GROUP BY k ORDER BY n DESC LIMIT 8`, since);
  const offers = await all(`SELECT json_extract(p,'$.id') AS k, COUNT(*) AS n FROM events WHERE e='offer_tap' AND day >= ? GROUP BY k ORDER BY n DESC`, since);
  const upi = await all(`SELECT json_extract(p,'$.app') AS k, COUNT(*) AS n FROM events WHERE e='upi_tap' AND day >= ? GROUP BY k ORDER BY n DESC`, since);
  const sources = await all(`SELECT src AS k, COUNT(DISTINCT vid) AS n FROM events WHERE e='visit' AND day >= ? GROUP BY src ORDER BY n DESC LIMIT 8`, since);
  const devices = await all(`SELECT dev AS k, COUNT(DISTINCT vid) AS n FROM events WHERE e='visit' AND day >= ? GROUP BY dev ORDER BY n DESC`, since);
  const hours = await all(`SELECT hr AS k, COUNT(*) AS n FROM events WHERE e='order_tap' AND day >= ? GROUP BY hr ORDER BY hr`, since);
  const closed = (await all(`SELECT COUNT(DISTINCT vid) AS n FROM events WHERE e='visit' AND open=0 AND day >= ?`, since))[0]?.n || 0;
  const extras = Object.fromEntries((await all(`SELECT e AS k, COUNT(*) AS n FROM events WHERE e IN ('spin','student_toggle','directions_tap','call_tap','wa_header_tap','contact_sent') AND day >= ? GROUP BY e`, since)).map(r => [r.k, r.n]));

  const list = (rows, label) => rows.length ? `<table>${rows.map(r => `<tr><td>${esc(r.k || '(none)')}</td><td class="n">${r.n}</td></tr>`).join('')}</table>` : `<p class="muted">No ${label} yet.</p>`;
  const maxH = Math.max(1, ...hours.map(h => h.n));
  const hourBars = hours.length ? `<div class="bars">${hours.map(h => `<div class="bar" title="${h.n} taps"><i style="height:${Math.round(h.n / maxH * 100)}%"></i><span>${h.k}</span></div>`).join('')}</div>` : '<p class="muted">No order taps yet.</p>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>The Crosta stats</title><style>
body{margin:0;background:#FFF0C4;color:#1A1A18;font:15px/1.45 system-ui,sans-serif;padding:18px}
.w{max-width:960px;margin:0 auto}h1{font-size:1.5rem;margin:0 0 2px}h2{font-size:1.05rem;margin:0 0 8px}.muted{color:#6B6460;margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.card{background:#FFFCF6;border:1.5px solid #1A1A18;border-radius:14px;padding:12px 14px}.big{font-size:1.9rem;font-weight:800;line-height:1.1}.lbl{font-size:.78rem;color:#6B6460;text-transform:uppercase;letter-spacing:.06em}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px}table{width:100%;border-collapse:collapse}td,th{padding:5px 4px;border-bottom:1px solid #E8D5BD;text-align:left}th{font-size:.78rem;color:#6B6460}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.bars{display:flex;gap:3px;align-items:flex-end;height:90px}.bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}.bar i{display:block;width:100%;background:#D35400;border-radius:3px 3px 0 0;min-height:2px}.bar span{font-size:.65rem;color:#6B6460}
.scroll{overflow-x:auto}
</style></head><body><div class="w">
<h1>The Crosta: last ${days} days</h1><p class="muted">Anonymous counts only. Indian time. A tap on Order is not proof the WhatsApp message was sent; "sent" means the message was handed to WhatsApp.</p>
<div class="grid">
<div class="card"><div class="lbl">Visitors</div><div class="big">${sum.visitors}</div></div>
<div class="card"><div class="lbl">Added to cart</div><div class="big">${sum.adders}</div><div class="muted">${pct(sum.adders, sum.visitors)} of visitors</div></div>
<div class="card"><div class="lbl">Opened the cart</div><div class="big">${sum.carters}</div><div class="muted">${pct(sum.carters, sum.adders)} of adders</div></div>
<div class="card"><div class="lbl">Tapped Order</div><div class="big">${sum.taps}</div><div class="muted">${pct(sum.taps, sum.carters)} of cart openers</div></div>
<div class="card"><div class="lbl">Order sent to WhatsApp</div><div class="big">${sum.sent}</div><div class="muted">${rupee(sum.revenue)} before payment checks</div></div>
<div class="card"><div class="lbl">Visited while closed</div><div class="big">${closed}</div><div class="muted">${pct(closed, sum.visitors)} of visitors</div></div>
</div>
<div class="card scroll"><h2>Day by day</h2><table><tr><th>Day</th><th class="n">Visitors</th><th class="n">Added</th><th class="n">Cart</th><th class="n">Tapped Order</th><th class="n">Sent</th><th class="n">Value</th></tr>
${daily.map(d => `<tr><td>${esc(d.day)}</td><td class="n">${d.visitors}</td><td class="n">${d.adders}</td><td class="n">${d.carters}</td><td class="n">${d.taps}</td><td class="n">${d.sent}</td><td class="n">${rupee(d.revenue)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No data yet.</td></tr>'}</table></div>
<div class="cols">
<div class="card"><h2>Most added items</h2>${list(items, 'items')}</div>
<div class="card"><h2>Menu sections tapped</h2>${list(cats, 'taps')}</div>
<div class="card"><h2>Offers tapped</h2>${list(offers, 'offer taps')}</div>
<div class="card"><h2>Where visitors come from</h2>${list(sources, 'visits')}</div>
<div class="card"><h2>Phone or computer</h2>${list(devices, 'visits')}</div>
<div class="card"><h2>UPI app tapped</h2>${list(upi, 'UPI taps')}</div>
<div class="card"><h2>When people tap Order (hour, India)</h2>${hourBars}</div>
<div class="card"><h2>Other taps</h2><table>
<tr><td>Spin wheel</td><td class="n">${extras.spin || 0}</td></tr><tr><td>Student discount switched</td><td class="n">${extras.student_toggle || 0}</td></tr>
<tr><td>Find us (directions)</td><td class="n">${extras.directions_tap || 0}</td></tr><tr><td>Call button</td><td class="n">${extras.call_tap || 0}</td></tr>
<tr><td>Header WhatsApp</td><td class="n">${extras.wa_header_tap || 0}</td></tr><tr><td>Contact form sent</td><td class="n">${extras.contact_sent || 0}</td></tr></table></div>
</div></div></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
    if (url.pathname === '/e' && request.method === 'POST') return handleEvent(request, env);
    if (url.pathname === '/stats' && request.method === 'GET') {
      const key = url.searchParams.get('key') || '';
      if (!env.STATS_KEY || key.length !== env.STATS_KEY.length || key !== env.STATS_KEY) return new Response('Not found', { status: 404 });
      const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days'), 10) || 14));
      return new Response(await statsPage(env, days), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    return new Response('Not found', { status: 404 });
  }
};
