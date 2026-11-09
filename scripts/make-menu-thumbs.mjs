// For every dish photo, write a 240px thumbnail beside it and shrink the
// full-size one to 800px.
//
// The ordering list only ever shows an 88px square (MenuBrowser) and the item
// modal shows roughly 200px tall, so shipping one 900px file for both wasted
// most of the bytes on every menu load.
//
// Re-runnable: running it twice just re-encodes to the same sizes.
//
//   node scripts/make-menu-thumbs.mjs public/menu-images/balham

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/make-menu-thumbs.mjs <folder>");
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".webp") && !f.endsWith("-sm.webp"));
let before = 0;

for (const f of files) {
  const full = join(dir, f);
  before += statSync(full).size;
  // Read into memory first — sharp keeps the source file open otherwise, and
  // Windows then refuses to overwrite it (EBUSY).
  const src = readFileSync(full);
  const sm = await sharp(src).resize(240, 240, { fit: "cover" }).webp({ quality: 70 }).toBuffer();
  const lg = await sharp(src).resize(800, 800, { fit: "cover" }).webp({ quality: 78 }).toBuffer();
  writeFileSync(join(dir, f.replace(/\.webp$/, "-sm.webp")), sm);
  writeFileSync(full, lg);
}

const all = readdirSync(dir).filter((f) => f.endsWith(".webp"));
const thumbs = all.filter((f) => f.endsWith("-sm.webp"));
const size = (list) => list.reduce((a, f) => a + statSync(join(dir, f)).size, 0);

console.log(`images:      ${files.length}`);
console.log(`before:      ${(before / 1048576).toFixed(1)}MB`);
console.log(`after:       ${(size(all) / 1048576).toFixed(1)}MB (full + thumbs)`);
console.log(`thumbs only: ${(size(thumbs) / 1048576).toFixed(2)}MB, avg ${Math.round(size(thumbs) / thumbs.length / 1024)}KB each`);
