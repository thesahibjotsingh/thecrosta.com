# The Crosta analytics: setup (about 20 minutes, once)

This turns on the counting. The website already has the tracker (`js/track.js`) but it sends nothing until you finish steps 1–4.

**What it counts:** visits, menu taps, items added, cart opened, "Order" taps, orders handed to WhatsApp (and their value), UPI app taps, offer taps, spin, student switch, directions, call.
**What it never stores:** names, phone numbers, addresses, location, cart notes, anything typed, IP addresses.

## 1. Create the database
1. Cloudflare dashboard → **Storage & Databases → D1 SQL database → Create database**. Name it `crosta-analytics`.
2. Open it → **Console** tab → paste everything from `worker/schema.sql` → **Execute**.

## 2. Create the Worker
1. Dashboard → **Workers & Pages → Create → Create Worker**. Name it `crosta-analytics` → **Deploy**.
2. Click **Edit code**, delete the sample, paste the whole of `worker/index.js`, click **Deploy**.
3. Worker → **Settings → Bindings → Add → D1 database**. Variable name must be exactly `DB`; pick `crosta-analytics`. Save.
4. Worker → **Settings → Variables and Secrets → Add** → type **Secret**, name `STATS_KEY`, value = a long password you invent (letters and numbers, 20+ characters). Save and keep it somewhere safe.
5. Copy the Worker's address from the top of the page. It looks like `https://crosta-analytics.YOURNAME.workers.dev`.

## 3. Tell the website where to send the notes
In `js/track.js`, near the top, fill in:
```js
endpoint: 'https://crosta-analytics.YOURNAME.workers.dev/e',
```
(note the `/e` at the end), then bump the `?v=` number in `index.html` as usual and deploy.

## 4. Look at your numbers
Open `https://crosta-analytics.YOURNAME.workers.dev/stats?key=YOUR_STATS_KEY`
(add `&days=30` for a month). Bookmark it on your phone. Anyone without the key sees "Not found".

## 5. Optional: Cloudflare's own visitor charts
Dashboard → **Analytics & Logs → Web Analytics → Add a site** → `thecrosta.com`. Copy the token it shows and put it in `js/track.js` as `cfBeaconToken: '...'`. No cookies. These charts add city and page-speed details.

## Keep your own taps out of the numbers
Open `https://thecrosta.com/?notrack=1` once on your phone and your computer. Turn counting back on with `?notrack=0`.

## Track where visitors come from
Add `?from=` to any link you share: `thecrosta.com/?from=instagram`, `?from=poster-qr`, `?from=thapar-whatsapp-group`. The results page lists these under "Where visitors come from".

## Cost
Free. The Worker and D1 free plans allow far more than this shop will ever send (100,000 requests a day).

## How the pieces fit
`js/track.js` (on the site) → one small anonymous note per action → `worker/index.js` (Cloudflare) → table `events` in D1 → `/stats` page.
