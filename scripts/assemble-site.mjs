// Assemble the combined deploy directory.
//
// Vite builds the React shop into dist/shop (see base:'/shop/' in vite.config.js).
// This script copies the static marketing landing page (the landing/ folder) into
// the root of dist/, so the final layout Vercel publishes is:
//
//   dist/            <- landing page at the site root  (/)
//   dist/index.html  <- landing home
//   dist/shop/       <- the installable React shop      (/shop)
//
// Runs cross-platform (Node's fs.cp) as the second half of `npm run build`.

import { cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const landing = join(root, 'landing');
const dist = join(root, 'dist');

// Copy everything in landing/ into dist/, but never clobber the built shop.
await cp(landing, dist, {
  recursive: true,
  force: true,
  filter: (src) => {
    // Skip the landing folder's own tooling and any nested dist.
    const rel = src.slice(landing.length + 1).replace(/\\/g, '/');
    if (rel === 'vercel.json') return false;      // root vercel.json is authoritative
    if (rel === 'package.json') return false;     // landing has no build of its own
    return true;
  },
});

// Guard: the shop must survive the copy.
await rm(join(dist, 'shop', '.vercel'), { recursive: true, force: true }).catch(() => {});

console.log('Assembled dist/: landing at /, shop at /shop');
