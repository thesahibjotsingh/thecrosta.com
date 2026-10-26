# Daily spin machine: source and build

The machine's source lives in `src/components/SlotMachine/`:

| File | What it holds |
|---|---|
| `SlotMachineEngine.js` | Three.js scene: chassis, volumetric reels, lever, ticket, prize tray, lights, sparkles, the gold coin shower, render loop. Colours come from the `--spin-*` CSS variables. |
| `SlotMachineLogic.js` | The 80-slot odds matrix, the signed 24h lock, and the game controller (spin flow, result, cart and WhatsApp hooks, `window.onCrostaWin`). |
| `SlotMachine.css` | Layout, the gold pill button, the result dialog, and the `--spin-*` colour tokens (edit them here to recolour the machine). |
| `index.js` | Glue: connects the three to the page's buttons and dialog. |

The site itself has no build step. These files are bundled into the two files it loads:

    cd tools/spin-3d
    npm install        (first time only; node_modules is git-ignored)
    npm run build      (writes js/spin-3d.js and css/slot-machine.css)

Then bump the `?v=` number on those two assets (and `js/spin-3d-boot.js`) in `index.html`.

Page hooks (set in `js/spin-3d-boot.js`): `CROSTA_CONFIG` (shop number, lock length, storage key),
`crostaAddFreeItemToCart(item)` (puts the ₹0 item in the cart), `crostaBuildWhatsAppUrl(prize)`,
and the optional `window.onCrostaWin(detail)` called on every win. Window events: `crosta:spin-start`,
`crosta:spin-end`, `crosta:win`, `crosta:add-free-item`, `crosta-spin`.
Odds check from the console: `CrostaSpin.simulate(100000)`.
