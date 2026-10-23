# The Crosta — thecrosta.com

Static site (no build step). Open `index.html` through any local web server, e.g.

```
python -m http.server 8000
```

## Layout

| Path | What it is |
|---|---|
| `index.html` | Page markup only |
| `css/styles.css` | All styles |
| `js/menu-data.js` | **The menu** — every item, price, badge and photo. Edit this to change the menu. |
| `js/menu-render.js` | Turns `menu-data.js` into the menu panels |
| `js/menu-ui.js`, `reviews.js`, `offers-carousel.js`, `page-ui.js` | Tabs, reviews lightbox, offers carousel, nav/scroll behaviour |
| `js/cart.js`, `cart-render.js`, `order.js`, `menu-wiring.js` | Cart, add-ons popup, checkout and the WhatsApp order message |
| `js/promos.js` | Offer rules (weekday lunch, weekend special, group perk, Crosta Boost) and the shop clock |
| `js/spin.js` | Spin-the-wheel |
| `js/contact.js` | Contact form (opens a WhatsApp message to the shop) |
| `images/` | Optimised WebP images |

Scripts are plain `<script defer>` files loaded in the order listed at the bottom of `index.html`; keep that order.

## Editing the menu

Each item is one line in `js/menu-data.js`:

- `prices` — one number per size, matching `priceNote` (e.g. `[89, 179, 299]` with `"8″ / 10″ / 12″"`).
- `badges` — `type` is `veg`, `best` or `spicy`.
- `img` — path in `images/` (or a full URL); omit for no photo.
- `variant` — drinks with a flavour picker. `prices[0]` is what the menu **shows**; `cartPrice` is what the cart **charges**.

## Offers use shop time

Offer windows (`js/promos.js`) follow **Asia/Kolkata**, not the visitor's device clock.

## Known issue

Three drinks show one price on the menu but charge ₹1 more in the cart
(Mint Fresh Lime Soda ₹49/₹50, Virgin Mojito ₹89/₹90, Blue Lagoon ₹89/₹90).
Both values are kept as they were; set them equal in `menu-data.js` once the right price is confirmed.
