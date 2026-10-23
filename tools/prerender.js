#!/usr/bin/env node
// Bakes the menu and the search-engine structured data into index.html, so
// crawlers and visitors without JavaScript see them. Run after editing
// js/menu-data.js, js/shop.js (hours / UPI) or the details below:
//
//     node tools/prerender.js
//
// It rewrites only the blocks between the PRERENDER markers in index.html.
// The page's own JavaScript renders the same menu again at load, so nothing
// changes for normal visitors.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// ── load the site's own data/renderer in a sandbox ──
const sandbox = { window: {}, document: { getElementById: () => null } };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(read('js/menu-data.js'), sandbox);
vm.runInContext(read('js/menu-render.js'), sandbox);
vm.runInContext(read('js/shop.js') + '\nthis.SHOP_HOURS = SHOP_HOURS; this.DAY_NAMES = DAY_NAMES;', sandbox);
const { MENU_DATA, SHOP_HOURS, DAY_NAMES } = sandbox;

// ── the shop's public facts (edit here) ──
const ORIGIN = 'https://thecrosta.com';
const SHOP = {
  name: 'The Crosta',
  phone: '+91-9888383010',
  email: 'thecrosta@gmail.com',
  street: 'Shop No. 4, Prem Nagar, Bhadson Road, Near Thapar University',
  city: 'Patiala', region: 'Punjab', postcode: '147001',
  instagram: 'https://instagram.com/thecrostapatiala',
  map: 'https://maps.app.goo.gl/ed5fcPS7DioLcqyH7',
  description: 'Pure veg pizza, burgers, pasta and shakes in Patiala, near Thapar University. Fresh dough daily, pizzas from ₹89. Order on WhatsApp or call 9888383010.'
};

// ── menu panels ──
const panels = MENU_DATA.panels.map(p =>
  `  <div class="menu-panel${p.id === 'pizzas' ? ' active' : ''}" id="tab-${p.id}">${sandbox.menuPanelHtml(p)}</div>`
).join('\n');

// ── structured data ──
const abs = src => (/^https?:/.test(src) ? src : `${ORIGIN}/${src}`);
const hh = h => { const m = Math.round((h % 1) * 60); return String(Math.floor(h)).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };

// group days that share the same hours: Mon–Thu 11–22, Fri 11–23 …
const hours = [];
for (let d = 0; d < 7; d++) {
  const [o, c] = SHOP_HOURS[d], last = hours[hours.length - 1];
  if (last && last.opens === hh(o) && last.closes === hh(c)) last.dayOfWeek.push(DAY_NAMES[d]);
  else hours.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [DAY_NAMES[d]], opens: hh(o), closes: hh(c) });
}

const restaurant = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  '@id': `${ORIGIN}/#restaurant`,
  name: SHOP.name,
  description: SHOP.description,
  url: `${ORIGIN}/`,
  image: [`${ORIGIN}/images/og-share.jpg`],
  logo: `${ORIGIN}/apple-touch-icon.png`,
  telephone: SHOP.phone,
  email: SHOP.email,
  priceRange: '₹',
  servesCuisine: ['Pizza', 'Italian', 'Fast food', 'Vegetarian'],
  address: { '@type': 'PostalAddress', streetAddress: SHOP.street, addressLocality: SHOP.city, addressRegion: SHOP.region, postalCode: SHOP.postcode, addressCountry: 'IN' },
  hasMap: SHOP.map,
  openingHoursSpecification: hours,
  hasMenu: { '@id': `${ORIGIN}/#menu` },
  sameAs: [SHOP.instagram]
};

const offerFor = it => {
  const labels = (it.priceNote || '').split('/').map(s => s.trim());
  const one = (price, name) => Object.assign({ '@type': 'Offer', price: String(price), priceCurrency: 'INR' }, name ? { name } : {});
  return it.prices.length > 1 ? it.prices.map((p, i) => one(p, labels[i])) : one(it.prices[0]);
};
const menu = {
  '@context': 'https://schema.org',
  '@type': 'Menu',
  '@id': `${ORIGIN}/#menu`,
  name: `${SHOP.name} menu`,
  inLanguage: 'en-IN',
  hasMenuSection: MENU_DATA.panels.map(p => ({
    '@type': 'MenuSection',
    name: p.label,
    hasMenuSection: p.categories.map(c => ({
      '@type': 'MenuSection',
      name: c.title.replace(/^[^\p{L}\p{N}]+/u, '').trim(),
      hasMenuItem: c.items.map(it => {
        const base = it.variant ? it.variant.baseName : it.name;
        const item = { '@type': 'MenuItem', name: base, suitableForDiet: 'https://schema.org/VegetarianDiet', offers: offerFor(it) };
        if (it.desc) item.description = it.desc;
        if (it.img) item.image = abs(it.img);
        return item;
      })
    }))
  }))
};
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

// ── write into index.html ──
let html = read('index.html');
const swap = (name, body) => {
  const re = new RegExp(`(<!-- PRERENDER:${name}:START -->)[\\s\\S]*?(<!-- PRERENDER:${name}:END -->)`);
  if (!re.test(html)) throw new Error(`marker PRERENDER:${name} not found in index.html`);
  html = html.replace(re, (_, a, b) => `${a}\n${body}\n  ${b}`);
};
swap('MENU', panels);
swap('JSONLD', `${ld(restaurant)}\n${ld(menu)}`);
fs.writeFileSync(path.join(root, 'index.html'), html);

const items = MENU_DATA.panels.reduce((n, p) => n + p.categories.reduce((m, c) => m + c.items.length, 0), 0);
console.log(`prerendered ${MENU_DATA.panels.length} panels, ${items} items; structured data written (${hours.length} opening-hour groups).`);
