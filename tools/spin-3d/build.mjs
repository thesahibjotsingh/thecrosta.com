// Builds the daily-spin machine from src/components/SlotMachine/ into the two files the site loads:
//   js/spin-3d.js        (Three.js + engine + logic + glue, minified, lazy-loaded by js/spin-3d-boot.js)
//   css/slot-machine.css (the component stylesheet)
// Usage:  cd tools/spin-3d && npm install && npm run build      (then bump ?v= in index.html)
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const src = path.join(root, 'src', 'components', 'SlotMachine');
const common = { bundle: true, minify: true, legalComments: 'none', logLevel: 'info', nodePaths: [path.join(here, 'node_modules')] };

await build({ ...common, entryPoints: [path.join(src, 'index.js')], outfile: path.join(root, 'js', 'spin-3d.js'), format: 'iife', target: 'es2020' });
await build({ ...common, entryPoints: [path.join(src, 'SlotMachine.css')], outfile: path.join(root, 'css', 'slot-machine.css') });
