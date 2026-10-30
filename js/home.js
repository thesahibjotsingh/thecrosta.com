// ── HOME: "what's on right now" ──
// Header status, offer tickets, the interactive clock strip, the reorder card
// and bestsellers. Everything follows the shop's clock (shop.js / offers.js).

const $ = id => document.getElementById(id);
let firstPaint = true;                 // entrance animation only on the first paint
const isPhone = () => matchMedia('(max-width:760px)').matches;

/* ───────────── header + tickets ───────────── */
// "11 AM" -> { n: "11", u: "AM" }; the bold desktop stub shows the numbers huge and AM/PM small
const splitT = t => { const m = /^(\d+(?::\d+)?)\s*(AM|PM)$/i.exec(String(t).trim()); return m ? { n: m[1], u: m[2].toUpperCase() } : null; };
const bigTm = (t1, t2) => {
  const a = splitT(t1), b = t2 ? splitT(t2) : null;
  if (!a || (t2 && !b)) return null;
  const unit = x => `<span class="u"> ${x.u}</span>`;
  const ap = !b || a.u === b.u ? a.u : `${a.u} – ${b.u}`;
  return `<span class="tm bigtm${b && a.u !== b.u ? ' diff' : ''}"><b><span class="n">${a.n}</span>${unit(a)}</b>${b ? `<i class="tw">to</i><b><span class="n">${b.n}</span>${unit(b)}</b>` : ''}<span class="ap">${ap}</span></span>`;
};
// phone tickets: the hours as a dark chip above the title ("11–3 PM", "All day", "11 AM")
const chipHtml = (t1, t2) => {
  const a = splitT(t1), b = t2 ? splitT(t2) : null;
  if (a && b) return `<span class="tchip"><span class="tm">${a.n}–${b.n}<small>${b.u}</small></span></span>`;
  if (a && !t2) return `<span class="tchip"><span class="tm">${a.n}<small>${a.u}</small></span></span>`;
  return `<span class="tchip txt">${t1}${t2 ? ' to ' + t2 : ''}</span>`;
};
const tmHtml = o => `<span class="tm${o.t1.length > 6 ? ' long' : ''}"><b>${o.t1}</b>${o.t2 ? `<i class="tw">to</i><b>${o.t2}</b>` : ''}</span>`;

function offerMeta({ o, s }) {
  if (s.k === 'live') return o.always ? 'Always on' : (o.from == null ? 'Live · all day' : `Live · ends ${fmtTime(s.end)} · ${fmtDuration(s.left)} left`);
  if (s.k === 'later') return `Starts ${fmtTime(s.start)} · in ${fmtDuration(s.inH)}`;
  return `Next · ${DAY_SHORT[s.day]} ${fmtTime(s.start)}`;
}

// the small status tag on a desktop mini ticket: can I use it now, soon, or later?
const spillText = ({ s }) => s.k === 'live' ? 'Live now' : (s.k === 'later' ? `In ${fmtDuration(s.inH)}` : `Next ${DAY_SHORT[s.day]} ${fmtTime(s.start)}`);

function renderLive() {
  const now = shopNow(), st = shopStatus(), t = hourOf(now);
  document.body.classList.toggle('is-closed', !st.open);

  const statusHtml = `<span class="dot"></span><span>${shopStatusText(st)}</span>`;
  const top = $('statusTop'), row = $('statusRow');
  top.innerHTML = `<span class="dot"></span><span>${shopStatusText(st).replace(/ · ready in about \d+ min$/, '')}</span>`; top.className = 'status' + (st.open ? '' : ' is-closed');
  row.innerHTML = statusHtml; row.className = 'status-row' + (st.open ? '' : ' is-closed');
  $('waBtn').hidden = !st.open;
  $('closedBtn').hidden = st.open;
  $('closedBtnLbl').textContent = st.open ? '' : `Opens ${fmtTime(st.opensAt)}`;

  // closed: the cart can still be built, but it cannot be sent, and nothing can be paid
  const opensText = `${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt)}`;
  const closedRow = $('cartClosedRow');
  if (closedRow) {
    closedRow.style.display = st.open ? 'none' : 'flex';
    $('cartClosedText').textContent = `We’re closed right now — we open ${opensText}. You can build your order now and send it once we open.`;
  }
  // hours card: "Open now" line and today's row highlighted
  const ho = $('hoursOpen');
  if (ho) {
    ho.className = 'hours-open' + (st.open ? '' : ' closed');
    $('hoursOpenText').textContent = st.open ? `Open now · closes ${fmtTime(st.closesAt)}` : `Closed · opens ${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt)}`;
    document.querySelectorAll('.hours-row').forEach(r => r.classList.add('today'));   // one row: every day has the same hours
  }
  const orderBtn = $('orderBtn');
  if (orderBtn) {
    orderBtn.disabled = !st.open;
    orderBtn.classList.toggle('is-closed', !st.open);
    $('orderBtnLabel').textContent = st.open ? 'Order on WhatsApp' : `Closed · opens ${st.today ? 'today' : DAY_NAMES[st.opensDay]} ${fmtTime(st.opensAt)}`;
  }
  const payWrap = $('payWrap');
  if (payWrap) payWrap.hidden = !st.open;

  // desktop shows the shop status above the headline; phones and tablets keep "Monday · 12:30 PM · Patiala" (their header has the status)
  $('clockLine').innerHTML = `<span class="cl-day">${DAY_NAMES[now.day]} · ${fmtTime(now.hour, now.minute)} · Patiala</span><span class="cl-status${st.open ? '' : ' closed'}"><i class="dot" aria-hidden="true"></i>${shopStatusText(st)}</span>`;
  const heroCta = $('heroCta'); if (heroCta) heroCta.firstChild.textContent = st.open ? 'Order now ' : 'See the menu ';
  $('lede').textContent = st.open ? 'Oven’s hot — here’s what’s on right now.' : 'Oven’s resting — have a look, then order when we open.';

  // tickets: live first, then later today (soonest), then next on a later day
  const states = OFFERS.map(o => ({ o, s: offerState(o, now) }));
  // the Offers link and phone tab show a badge while a timed offer is on (the always-on group perk doesn't count)
  const liveNow = st.open ? states.filter(x => x.s.k === 'live' && !x.o.always).map(x => x.o.name) : [];
  document.querySelectorAll('#mainnav a[data-nav="offers"], #dock a[data-dock="offers"]').forEach(a => {
    a.classList.toggle('live', liveNow.length > 0);
    a.title = liveNow.length ? `Live now: ${liveNow.join(', ')}` : '';
  });
  const rank = { live: 0, later: 1, next: 2 };
  const sorted = states.slice().sort((a, b) => (rank[a.s.k] - rank[b.s.k]) || (a.s.k === 'later' ? a.s.start - b.s.start : 0) || (a.s.k === 'next' ? a.s.i - b.s.i : 0));
  const enter = (i) => firstPaint ? ` enter" style="--i:${i}` : '" style="';
  const lead = sorted[0];
  let primary, rest = sorted;
  if (st.open && lead.s.k === 'live') {
    const { o, s } = lead; rest = sorted.slice(1);
    const timed = !o.always && o.from != null;
    const prog = timed
      ? `<div class="prog"><div class="prog-bar"><i style="width:${Math.round((t - s.start) / (s.end - s.start) * 100)}%"></i></div><p>Ends ${fmtTime(s.end)} · ${fmtDuration(s.left)} left</p></div>`
      : `<div class="prog"><p>${o.always ? 'Always on' : 'Live all day'}</p></div>`;
    primary = `<article class="ticket primary live${enter(0)}" data-offer="${o.id}"><div class="stub"><span class="d">${o.stub}</span>${bigTm(o.t1, o.t2) || tmHtml(o)}</div><div class="tbody"><span class="stamp">Live now</span>${chipHtml(o.t1, o.t2)}<p class="kicker">${o.name}</p><h2 class="thead">${o.head}</h2><p class="tdesc">${o.desc}</p>${prog}<button class="btn fill" type="button" data-offer="${o.id}">Use this offer →</button><img class="pie" src="${o.pie}" alt=""></div></article>`;
  } else {
    const nx = sorted.find(x => x.s.k !== 'live') || lead;
    primary = `<article class="ticket primary closedcard${enter(0)}"><div class="stub"><span class="d">Closed</span>${bigTm(fmtTime(st.opensAt)) || `<span class="tm"><b>${fmtTime(st.opensAt)}</b></span>`}</div><div class="tbody"><span class="stamp">Closed</span>${chipHtml(fmtTime(st.opensAt))}<p class="kicker">Back soon</p><h2 class="thead">Back ${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt).replace(' ', ' ')}</h2><p class="tdesc">Browse the menu now and order when we open. Next offer: ${nx.o.name} (${offerMeta(nx).replace(/^./, c => c.toLowerCase())}).</p></div></article>`;
  }
  $('primary').innerHTML = primary;
  $('more').innerHTML = rest.slice(0, 3).map((x, i) => {
    const cls = x.s.k === 'next' ? ' dim' : (x.s.k === 'live' ? ' live' : '');
    return `<article class="ticket${cls}${enter(i + 1)}" data-offer="${x.o.id}"><div class="stub"><span class="d">${x.o.stub}</span>${tmHtml(x.o)}</div><div class="tbody"><div class="mtop"><span class="spill ${x.s.k}">${spillText(x)}</span><span class="swhen">${x.o.always || x.o.from == null ? x.o.stub : `${x.o.t1} – ${x.o.t2}`}</span></div>${chipHtml(x.o.t1, x.o.t2)}<p class="kicker">${x.o.name}</p><h3 class="thead">${x.o.head}</h3><p class="tmeta ${x.s.k === 'live' ? 'live' : ''}">${offerMeta(x)}</p><button class="tlink" type="button" data-offer="${x.o.id}">${x.s.k === 'live' ? 'Use this offer →' : 'See how it works →'}</button></div></article>`;
  }).join('');

  renderOnNow(states, sorted, st, now);

  if (!clockView) buildClock(); else updateClockUI();
  if (typeof setupDeck === 'function') setupDeck();
  firstPaint = false;
}

// the Offers section's "On right now": the lead offer large, the others as a list (same states as the hero tickets)
function renderOnNow(states, sorted, st, now) {
  const main = $('onNowMain'); if (!main) return;
  const live = states.filter(x => x.s.k === 'live');
  $('onNowSub').textContent = !st.open
    ? `We’re closed. We open ${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt)}.`
    : `${DAY_NAMES[now.day]}, ${fmtTime(now.hour, now.minute)} · ${live.map(x => x.o.name).join(' and ')} ${live.length === 1 ? 'is' : 'are'} live.`;
  // every offer takes a turn in the big card; the list on the right picks one and shows the timer
  const closedNote = st.open ? '' : `<span class="onnow-note">Shop opens ${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt)}</span>`;
  const slides = sorted.map((x, i) => {
    const { o, s } = x, usable = st.open && s.k === 'live';
    const badge = usable ? (o.always ? 'Always on' : (o.from == null ? 'Live · all day' : `Live until ${fmtTime(s.end)}`)) : spillText(x);
    return `<article class="onnow-big onnow-slide${usable ? '' : ' off'}${i === onNowIdx ? ' on' : ''}" data-offer="${o.id}"${i === onNowIdx ? '' : ' aria-hidden="true"'}><img src="${o.pie}" alt="" loading="lazy"><span class="onnow-live">${badge}</span><h3>${o.head}</h3><p>${o.desc}</p><p class="onnow-meta">${offerMeta(x)}</p>${closedNote}<button class="btn fill" type="button" data-offer="${o.id}" tabindex="${i === onNowIdx ? 0 : -1}">${usable ? 'Use this offer →' : 'See how it works →'}</button></article>`;
  }).join('');
  const rows = sorted.map((x, i) => `<button class="onnow-row${i === onNowIdx ? ' on' : ''}" type="button" data-slide="${i}" aria-pressed="${i === onNowIdx}"><img src="${x.o.pie}" alt="" loading="lazy"><span class="onnow-tx"><b>${x.o.name}</b><small>${x.o.head}</small></span><span class="onnow-when"><i class="spill ${x.s.k}">${spillText(x)}</i><em>${x.o.always || x.o.from == null ? x.o.stub : `${x.o.t1} – ${x.o.t2}`}</em></span></button>`).join('');
  const sig = slides + rows;
  if (sig === onNowSig) return;               // nothing changed: leave the slideshow (and its progress bar) alone
  onNowSig = sig; onNowCount = sorted.length;
  main.innerHTML = slides;
  $('onNowList').innerHTML = rows;
}
let onNowIdx = 0, onNowSig = '', onNowCount = 0;
function onNowGo(i) {
  if (!onNowCount) return;
  onNowIdx = (i + onNowCount) % onNowCount;
  document.querySelectorAll('#onNowMain .onnow-slide').forEach((el, k) => {
    const on = k === onNowIdx;
    el.classList.toggle('on', on);
    if (on) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
    const b = el.querySelector('button'); if (b) b.tabIndex = on ? 0 : -1;
  });
  const rows = document.querySelectorAll('#onNowList .onnow-row');
  rows.forEach((el, k) => { el.classList.remove('on'); el.setAttribute('aria-pressed', 'false'); });
  void document.getElementById('onNowList').offsetWidth;   // restart the progress bar on the new row
  if (rows[onNowIdx]) { rows[onNowIdx].classList.add('on'); rows[onNowIdx].setAttribute('aria-pressed', 'true'); }
}
(function () {
  const grid = document.querySelector('.onnow-grid'); if (!grid) return;
  const pause = on => grid.classList.toggle('paused', on);
  grid.addEventListener('mouseenter', () => pause(true));
  grid.addEventListener('mouseleave', () => pause(false));
  grid.addEventListener('focusin', () => pause(true));
  grid.addEventListener('focusout', () => pause(false));
  document.addEventListener('visibilitychange', () => pause(document.hidden));
  $('onNowList').addEventListener('click', e => { const r = e.target.closest('.onnow-row'); if (r) onNowGo(+r.dataset.slide); });
  // the progress bar on the active row drives the rotation, so pausing it pauses the show
  $('onNowList').addEventListener('animationend', e => { if (e.animationName === 'onnow-prog') onNowGo(onNowIdx + 1); });
})();
// "See the full week" shows the clock (closed otherwise); the clock's own header closes it again
(function () {
  const link = $('onNowWeek'), c = $('clock'); if (!link || !c) return;
  const label = () => { link.textContent = c.open ? 'Hide the full week ↑' : 'See the full week →'; link.setAttribute('aria-expanded', String(c.open)); };
  link.addEventListener('click', e => {
    e.preventDefault();
    c.open = !c.open; setClockNote(); label();
    if (c.open) c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  });
  c.addEventListener('toggle', label);
  label();
})();

/* ───────────── the interactive clock strip ───────────── */
const VA = 10.5, VZ = 23, VSPAN = VZ - VA;     // the strip shows 10:30 AM → 11 PM
let clockView = null;                          // null = follow the real clock; else { day, t } the visitor picked
const viewNow = () => clockView ? { day: clockView.day, hour: Math.floor(clockView.t), minute: Math.round((clockView.t % 1) * 60) } : shopNow();
const pctOf = h => ((Math.min(Math.max(h, VA), VZ) - VA) / VSPAN * 100);
const tagPct = h => ((Math.min(Math.max(h, VA + 0.9), VZ - 0.9) - VA) / VSPAN * 100);

function bandClass(o, v) {
  const t = hourOf(v), [open, close] = SHOP_HOURS[v.day], w = offerWindow(o, v.day);
  if (!w) return 'off';
  return (t >= open && t < close && t >= w[0] && t < w[1]) ? 'live' : (t < w[0] ? 'later' : 'done');
}
function clockSummary(v) {
  const st = shopStatus(v), when = `${fmtTime(v.hour, v.minute)} on ${DAY_NAMES[v.day]}`;
  const lead = clockView ? `At ${when}` : `Right now (${fmtTime(v.hour, v.minute)})`;
  if (!st.open) return `${lead}: we’re closed. We open ${st.today ? 'today' : DAY_NAMES[st.opensDay]} at ${fmtTime(st.opensAt)}.`;
  const live = OFFERS.filter(o => offerState(o, v).k === 'live').map(o => o.name);
  return live.length === 1 ? `${lead}: only ${live[0]} is live.` : `${lead}: ${live.slice(0, -1).join(', ')} and ${live[live.length - 1]} are live.`;
}
function updateClockUI() {
  const v = viewNow(), t = hourOf(v), root = $('lanes');
  if (!root.firstElementChild) return;
  root.querySelectorAll('.needle').forEach(n => { n.style.left = pctOf(t) + '%'; });
  const tag = root.querySelector('.needle-tag'), tg = Math.min(Math.max(t, VA + 0.9), VZ - 0.9);
  tag.textContent = (clockView ? '' : 'Now ') + fmtTime(v.hour, v.minute);
  placeTag(tag, t);
  tag.setAttribute('aria-valuenow', Math.round(t * 60));
  tag.setAttribute('aria-valuetext', `${fmtTime(v.hour, v.minute)} on ${DAY_NAMES[v.day]}`);
  root.querySelectorAll('.tick').forEach(k => { k.style.visibility = Math.abs(+k.dataset.h - tg) < 1.3 ? 'hidden' : ''; });
  root.querySelectorAll('.band[data-o]').forEach(b => { b.className = 'band ' + bandClass(OFFERS[+b.dataset.o], v); });
  const sum = $('clockSum'); sum.textContent = clockSummary(v); sum.classList.toggle('exploring', !!clockView);
  $('clockNow').hidden = !clockView;
}
// centre the marker's tag on the time, but never let it hang outside the bar
function placeTag(tag, t) {
  const track = tag.parentElement, W = track.clientWidth, tw = tag.offsetWidth;
  if (!W || !tw) { tag.style.left = tagPct(t) + '%'; return; }
  tag.style.left = Math.min(Math.max(pctOf(t) / 100 * W, tw / 2), W - tw / 2) + 'px';
}
window.addEventListener('resize', () => { const tag = document.querySelector('#lanes .needle-tag'); if (tag) placeTag(tag, hourOf(viewNow())); });
function buildClock() {
  const v = viewNow(), [open, close] = SHOP_HOURS[v.day];
  const ticks = [11, 13, 15, 17, 19, 21, 23].map(h => `<span class="tick${[13, 17, 21].includes(h) ? ' minor' : ''}" data-h="${h}" style="left:${pctOf(h)}%">${fmtTime(h).replace(':00', '').replace(' ', '').toLowerCase()}</span>`).join('');
  const shut = `<i class="shut" style="left:0;width:${pctOf(open)}%"></i><i class="shut" style="left:${pctOf(close)}%;right:0"></i>`;
  let html = `<div class="lane axis"><div class="lane-label"></div><div class="track">${ticks}<button class="needle-tag" type="button" role="slider" aria-label="Time of day" aria-valuemin="${VA * 60}" aria-valuemax="${VZ * 60}"></button></div></div>`;
  html += OFFERS.map((o, i) => {
    const w = offerWindow(o, v.day), cls = bandClass(o, v);
    let band;
    if (!w) {
      const s = offerState(o, { day: v.day, hour: 0, minute: 0 });
      band = `<i class="band off" data-o="${i}">Not on ${DAY_NAMES[v.day]}${s && s.k === 'next' ? ' · next ' + DAY_SHORT[s.day] + ' ' + fmtTime(s.start) : ''}</i>`;
    } else {
      band = `<i class="band ${cls}" data-o="${i}" style="--i:${i};left:${pctOf(w[0])}%;width:${pctOf(w[1]) - pctOf(w[0])}%">${o.band}</i>`;
    }
    const range = w ? ` · ${fmtTime(w[0])}–${fmtTime(w[1])}` : '';
    return `<div class="lane"><div class="lane-label"><button class="lane-btn" type="button" data-offer="${o.id}">${o.lane}</button><span>${o.laneSub}${range}</span></div><div class="track">${shut}${band}<i class="needle"></i></div></div>`;
  }).join('');
  $('lanes').innerHTML = html;
  const today = shopNow().day;
  $('days').innerHTML = DAY_SHORT.map((d3, d) => `<button class="dchip${d === today ? ' today' : ''}" type="button" data-d="${d}" aria-pressed="${d === v.day}">${d3}</button>`).join('');
  const dz = $('days'), sel = dz.querySelector('[aria-pressed="true"]');
  if (sel) dz.scrollLeft = sel.offsetLeft - dz.clientWidth / 2 + sel.offsetWidth / 2;
  updateClockUI();
  setClockNote();
}
function setClockNote() {
  $('clockNote').textContent = $('clock').open ? (isPhone() ? '' : 'Tap an offer · drag the marker') : (isPhone() ? 'See today’s schedule' : 'See the full week');
}
function setClockView(t, day) {
  const base = shopNow(), cur = clockView ? clockView.day : base.day, d = day ?? cur;
  t = Math.round(Math.min(Math.max(t, VA), VZ - 0.25) * 4) / 4;
  const same = d === base.day && Math.abs(t - hourOf(base)) < 0.13;
  const dayChanged = d !== cur;
  clockView = same ? null : { day: d, t };
  dayChanged ? buildClock() : updateClockUI();
}
(function wireClock() {
  const root = $('lanes'); let dragging = false, pending = null;
  const at = e => { const tr = root.querySelector('.track'); if (!tr) return; const r = tr.getBoundingClientRect(); setClockView(VA + Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * VSPAN); };
  const startDrag = e => { dragging = true; try { root.setPointerCapture(e.pointerId); } catch (_) {} };
  root.addEventListener('pointerdown', e => {
    if (!e.target.closest('.track')) return;
    const band = e.target.closest('.band[data-o]');
    if (band) { pending = { x: e.clientX, o: +band.dataset.o, band }; return; }   // a tap on a bar opens its offer; a drag still scrubs
    startDrag(e); at(e);
  });
  root.addEventListener('pointermove', e => {
    if (pending && Math.abs(e.clientX - pending.x) > 4) { pending = null; startDrag(e); }
    if (dragging) at(e);
  });
  const end = e => {
    if (pending) { const q = pending; pending = null; openOffer(OFFERS[q.o].id, q.band); }
    dragging = false; try { root.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', () => { pending = null; dragging = false; });
  root.addEventListener('keydown', e => {
    if (!e.target.classList.contains('needle-tag')) return;
    const t = hourOf(viewNow()), step = { ArrowLeft: -0.25, ArrowDown: -0.25, ArrowRight: 0.25, ArrowUp: 0.25, PageDown: -1, PageUp: 1 }[e.key];
    if (step !== undefined) { e.preventDefault(); setClockView(t + step); }
    else if (e.key === 'Home') { e.preventDefault(); setClockView(VA); }
    else if (e.key === 'End') { e.preventDefault(); setClockView(VZ); }
  });
  $('days').addEventListener('click', e => { const b = e.target.closest('.dchip'); if (b) setClockView(hourOf(viewNow()), +b.dataset.d); });
  $('clockNow').addEventListener('click', () => { clockView = null; buildClock(); });
  $('clock').open = false;                    // collapsed everywhere: the tickets already say what is live, the week is one tap away
  $('clock').addEventListener('toggle', setClockNote);
})();

/* ───────────── bestsellers ───────────── */
const BESTSELLERS = [
  { name: 'Farm House Pizza',           tag: 'Most popular',  img: 'images/hero-farm-house-pizza.webp' },
  { name: 'Crosta Garlic Butter Pizza', tag: 'Best seller',   img: 'images/hero-garlic-butter-pizza.webp' },
  { name: 'The Crosta Burger',          tag: 'Most popular',  img: 'images/hero-the-crosta-burger.webp' },
  { name: 'Pizza Burger',               tag: 'Chef’s pick',   img: 'images/hero-pizza-burger.webp' },
  { name: 'Oreo Crumble Shake',         tag: 'Fan favourite', img: 'images/hero-oreo-shake.webp' }
];
(function renderBestsellers() {
  const plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const cards = BESTSELLERS.map(b => ({ b, hit: menuLookup(b.name) })).filter(x => x.hit).map(({ b, hit }) => {
    const prices = hit.item.prices, multi = prices.length > 1;
    return `<article class="card"><div class="ph"><img src="${b.img}" alt="${b.name}" loading="lazy" width="720" height="720"></div><span class="tag">${b.tag}</span><div class="cb"><div><h3>${b.name}</h3><span class="price">${multi ? 'from ' : ''}${rupee(Math.min(...prices))}</span></div><button class="plus" type="button" data-best="${b.name}" aria-label="${multi ? 'Choose size and add' : 'Add'} ${b.name}">${plus}</button></div></article>`;
  });
  $('bestGrid').innerHTML = cards.join('');
  $('bestGrid').addEventListener('click', e => {
    const btn = e.target.closest('.plus'); if (!btn) return;
    const b = BESTSELLERS.find(x => x.name === btn.dataset.best), hit = menuLookup(b.name);
    quickAdd(b.name, hit, btn.closest('.card').querySelector('img'), b.img, btn);
  });
})();

/* ───────────── reorder (last order, saved on this device) ───────────── */
const LAST_ORDER_KEY = 'crosta_last_order';
function readLastOrder() { try { return JSON.parse(localStorage.getItem(LAST_ORDER_KEY)) || null; } catch (_) { return null; } }
// price an old order line at today's menu price; null if the item is gone
function currentPrice(name, size) {
  // flavour / variant suffixes — "Paneer Garlic Bread (Paneer Tikka)", "Virgin Mojito (Sweet)" — map to the base item
  const hit = menuLookup(name) || menuLookup(name.replace(/ \([^)]*\)$/, ''));
  if (!hit) return null;
  if (hit.item.variant) return { price: hit.item.variant.cartPrice, isPizza: false, isMealEligible: false };
  const labels = (hit.item.priceNote || '').split('/').map(s => s.trim());
  const i = hit.item.prices.length === 1 ? 0 : labels.indexOf(size);
  return i < 0 ? null : { price: hit.item.prices[i], isPizza: hit.panelId === 'pizzas', isMealEligible: hit.panelId === 'burgerswraps' };
}
function renderReorder() {
  const last = readLastOrder(), card = $('reorder');
  if (!last || !last.items || !last.items.length) { card.hidden = true; return; }
  const lines = last.items.map(i => ({ ...i, cur: currentPrice(i.name, i.size) })).filter(i => i.cur);
  if (!lines.length) { card.hidden = true; return; }
  const total = lines.reduce((s, i) => s + i.qty * (i.cur.price + (i.addons || []).reduce((a, x) => a + x.price, 0)), 0);
  const label = i => `${i.name.replace(/ Pizza$/, '')}${i.size && i.size !== 'std' ? ' ' + i.size : ''}`;
  $('reorderText').textContent = lines.slice(0, 2).map(label).join(' + ') + (lines.length > 2 ? ` + ${lines.length - 2} more` : '');
  $('reorderBtn').textContent = `Reorder · ${rupee(total)}`;
  card.hidden = false;
}
$('reorderBtn').addEventListener('click', () => {
  const last = readLastOrder(); if (!last) return;
  let n = 0;
  last.items.forEach((i, idx) => {
    const cur = currentPrice(i.name, i.size); if (!cur) return;
    addItem(i.name, i.size, cur.price, cur.isPizza, cur.isMealEligible, { qty: i.qty, popup: false, quiet: true });
    const added = cart.find(c => c._key === i.name + '|' + i.size);
    if (added && (i.addons || []).length && !(added.addons || []).length) { added.addons = i.addons.map(a => ({ ...a })); }
    n += i.qty;
  });
  renderCart(); updateFab();
  cartAddedFeedback(n ? `Added your last order (${n} item${n === 1 ? '' : 's'})` : 'Those items are no longer on the menu', { fromEl: $('reorderBtn'), img: 'images/hero-farm-house-pizza.webp' });
  openCart();
});

/* ───────────── start ───────────── */
renderReorder();
renderLive();
// keep countdowns and offer windows fresh while the page is open (skip while a ticket has keyboard focus)
setInterval(() => {
  const a = document.activeElement;
  if (a && a.closest && a.closest('#primary, #more')) return;
  renderLive();
}, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderLive(); });
