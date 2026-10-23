# The Crosta — thecrosta.com

Static site, no build step required. Open it through any local web server:

```
python -m http.server 8000
```

Deployed from this repo by Cloudflare. Orders go out as WhatsApp messages; there is no backend.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Page markup (menu panels and structured data are baked in — see *Pre-render*) |
| `css/styles.css` | Original section styles (menu, reviews, hours, cart drawer, spin…) |
| `css/home.css` | New layer: header, "what's on" tickets, clock strip, tools bar, bestsellers, cart bar, sheets, checkout extras |
| `js/menu-data.js` | **The menu** — every item, price, badge and photo. Edit this to change the menu. |
| `js/shop.js` | **Opening hours**, the shop clock (Patiala time), time formatting, and the **UPI ID** |
| `js/offers.js` | The four offers: windows, wording, and the state functions the tickets/clock/cart share |
| `js/promos.js` | Cart promo rules (one offer per order: weekend > group perk > weekday lunch > boost) |
| `js/menu-render.js` | Turns `menu-data.js` into the menu panels |
| `js/menu-ui.js` | Category chips, menu search, jumping to categories |
| `js/home.js` | Header status, offer tickets, interactive clock strip, bestsellers, reorder card |
| `js/sheets.js` | Size picker and "use this offer" sheets |
| `js/cart.js`, `cart-render.js`, `order.js`, `menu-wiring.js` | Cart, add-ons popup, checkout and the WhatsApp message |
| `js/persist.js` | Saved cart, last order (for Reorder), pre-filled details — device only |
| `js/payment.js` | Delivery location pin and UPI payment |
| `js/ui.js` | Toast, thumbnail-to-cart animation, count bump |
| `js/spin.js`, `reviews.js`, `offers-carousel.js`, `contact.js`, `page-ui.js` | Spin wheel, reviews lightbox, poster carousel, contact form, small page behaviours |
| `tools/prerender.js` | Bakes the menu + structured data into `index.html` |
| `images/` | Optimised WebP photos; `og-share.jpg` is the link-preview card; `upi-qr.webp` is the shop's PhonePe QR |
| `mockups/top-section.html` | The approved design mockup (not deployed logic; reference only) |

Scripts are plain `<script defer>` files loaded in the order listed at the bottom of `index.html`; keep that order.

## Everyday edits

- **Change the menu or prices** → edit `js/menu-data.js`, then run `node tools/prerender.js`.
- **Change opening hours** → edit `SHOP_HOURS` in `js/shop.js`, update the *Hours* section text in `index.html`, then run `node tools/prerender.js`.
- **Change an offer's time or wording** → `js/offers.js` (the header tickets, the clock strip *and* the cart discounts all read it).
- **Change the UPI ID** → `UPI` in `js/shop.js`; replace `images/upi-qr.webp` if the QR changes.

## Pre-render

`node tools/prerender.js` rewrites the blocks between the `PRERENDER` markers in `index.html`: the seven menu panels and the Restaurant + Menu structured data (address, hours, vegetarian menu with prices). That is what search engines and visitors without JavaScript see. The page's own JavaScript renders the same menu again at load. Run it after any change to the menu data or hours, and commit the result.

## Shop time

Everything time-based (open/closed, offers, the clock strip, cart discounts) follows **Asia/Kolkata**, not the visitor's device clock.

## Known issues

Three drinks show one price on the menu but charge ₹1 more in the cart
(Mint Fresh Lime Soda ₹49/₹50, Virgin Mojito ₹89/₹90, Blue Lagoon ₹89/₹90).
Both values are kept as they were; set them equal in `menu-data.js` once the right price is confirmed.
