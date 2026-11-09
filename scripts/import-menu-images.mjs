// Import dish photos into the site and wire them to menu items.
//
// Takes a folder of photos (any names, .jpg/.jpeg/.png/.webp), matches each one
// to a dish on the Balham menu, converts it to a web-sized .webp, writes it to
// public/menu-images/<location>/<handle>.webp, and emits the SQL that points
// menu_items.image_url at it.
//
// Matching is by name: a file called "Butter Paneer.jpg", "butter-paneer-d.png"
// or "butter_paneer_d.webp" all land on the same dish. Anything it cannot match
// confidently is listed at the end and left alone — never guessed at.
//
// Usage:
//   node scripts/import-menu-images.mjs <source-folder>
//   node scripts/import-menu-images.mjs <source-folder> --location balham
//   node scripts/import-menu-images.mjs <source-folder> --dry-run
//
// Then paste supabase/seed_balham_images.sql into the Supabase SQL Editor.
//
// NOTE: menu_items.image_url is shared across branches (it is not in
// location_menu_items), so a photo set here shows at every location that serves
// the dish. That is fine while Balham is the only branch online.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const srcDir = args.find((a) => !a.startsWith("--"));
const location = (args.find((a) => a.startsWith("--location=")) || "--location=balham").split("=")[1];
const dryRun = args.includes("--dry-run");

if (!srcDir) {
  console.error("Usage: node scripts/import-menu-images.mjs <source-folder> [--location=balham] [--dry-run]");
  process.exit(1);
}
if (!existsSync(srcDir)) {
  console.error(`Source folder not found: ${srcDir}`);
  process.exit(1);
}

const MENU_JSON = "supabase/balham-live-menu.json";
const OUT_DIR = join("public", "menu-images", location);
const OUT_SQL = `supabase/seed_${location}_images.sql`;
const MAX_EDGE = 900;   // plenty for a menu card; keeps pages fast
const QUALITY = 80;

const menu = JSON.parse(readFileSync(MENU_JSON, "utf8"));

// "Butter Paneer (D)" / "butter_paneer_d" -> "butterpaneerd"
const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
// Word tokens, minus noise that carries no meaning in a dish name.
const STOP = new Set(["the", "and", "with", "of", "in", "a", "d", "n", "g", "e", "s", "v", "m", "p"]);
const tokens = (s) =>
  String(s).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t));

// Score 0..1 — how much two names overlap, weighted toward the shorter one so
// "Butter Paneer.jpg" still matches "Butter Paneer (D)".
function similarity(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let hits = 0;
  for (const t of A) if (B.has(t)) hits++;
  return hits / Math.min(A.size, B.size);
}

function matchDish(fileStem) {
  const fk = key(fileStem);
  // 1. Exact match on handle or name.
  for (const d of menu) if (key(d.handle) === fk || key(d.name) === fk) return { dish: d, how: "exact", score: 1 };
  // 2. Same meaningful words, in any order, ignoring allergen letters:
  //    "Butter Paneer" == "Butter Paneer (D)". Deliberately NOT a substring
  //    test - "Garlic Naan" is inside "Cheese Chili Garlic Naan" but is a
  //    different bread.
  const sigOf = (s) => tokens(s).slice().sort().join(" ");
  const fs2 = sigOf(fileStem);
  for (const d of menu) {
    if (fs2 && (sigOf(d.name) === fs2 || sigOf(d.handle) === fs2)) {
      return { dish: d, how: "same-words", score: 0.95 };
    }
  }
  // 3. Token overlap, best candidate only if it clears the bar and is unambiguous.
  const scored = menu
    .map((d) => ({ dish: d, score: Math.max(similarity(fileStem, d.name), similarity(fileStem, d.handle)) }))
    .sort((a, b) => b.score - a.score);
  const [best, runnerUp] = scored;
  if (best && best.score >= 0.75 && (!runnerUp || best.score - runnerUp.score >= 0.15)) {
    return { dish: best.dish, how: "fuzzy", score: best.score };
  }
  return null;
}

const files = readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
if (!files.length) {
  console.error(`No .jpg/.jpeg/.png/.webp files in ${srcDir}`);
  process.exit(1);
}

if (!dryRun) mkdirSync(OUT_DIR, { recursive: true });

const matched = [];
const unmatched = [];
const claimed = new Map(); // handle -> source file, so two photos can't fight over one dish

for (const file of files) {
  const stem = basename(file, extname(file));
  const hit = matchDish(stem);
  if (!hit) { unmatched.push({ file, reason: "no confident match" }); continue; }
  const handle = hit.dish.handle;
  if (claimed.has(handle)) {
    unmatched.push({ file, reason: `dish "${hit.dish.name}" already taken by ${claimed.get(handle)}` });
    continue;
  }
  claimed.set(handle, file);
  matched.push({ file, ...hit });
}

let written = 0;
for (const m of matched) {
  const dest = join(OUT_DIR, `${m.dish.handle}.webp`);
  if (dryRun) { written++; continue; }
  try {
    await sharp(join(srcDir, m.file))
      .rotate()                                              // honour EXIF orientation
      .resize(MAX_EDGE, MAX_EDGE, { fit: "cover", position: "centre" })
      .webp({ quality: QUALITY })
      .toFile(dest);
    written++;
  } catch (err) {
    unmatched.push({ file: m.file, reason: `convert failed: ${err.message}` });
  }
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
// The menu lists some dishes twice: "Aloo Gobhi (D)" under the side dishes and
// "Aloo Gobhi" under VEGAN DISHES. One photo should cover every spelling, so
// group dishes by their meaningful words (allergen letters are stop words).
const sig = (name) => tokens(name).slice().sort().join(" ");
const bySig = new Map();
for (const d of menu) {
  const k = sig(d.name);
  if (!bySig.has(k)) bySig.set(k, []);
  bySig.get(k).push(d.name);
}

const updates = matched
  .map((m) => {
    const url = `/menu-images/${location}/${m.dish.handle}.webp`;
    const names = bySig.get(sig(m.dish.name)) || [m.dish.name];
    const list = names
      .map((n) => `upper(regexp_replace(${q(n)}, '[^a-zA-Z0-9]', '', 'g'))`)
      .join(",\n             ");
    const also = names.length > 1
      ? `  -- one photo, ${names.length} spellings: ${names.join(" / ")}\n`
      : "";
    // Match on the normalised name: the catalog spells dishes differently from
    // the .uk site ("ONION BHAJI (2 PCS) (E)" vs "Onion Bhaji (E)").
    return `${also}update menu_items set image_url = ${q(url)}\n` +
           ` where upper(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'))\n` +
           `       in (${list});`;
  })
  .join("\n");

const sql = `-- Dish photos for ${location} — generated by scripts/import-menu-images.mjs
-- Source folder: ${srcDir}
-- Generated: ${new Date().toISOString().slice(0, 10)}  (${matched.length} photos)
-- Re-runnable: each statement just sets image_url, so running twice is harmless.
--
-- Check the result with:
--   select count(*) from menu_items where image_url is not null;

begin;

${updates}

commit;
`;

if (!dryRun) writeFileSync(OUT_SQL, sql);

console.log(`photos found:    ${files.length}`);
console.log(`matched to dish: ${matched.length}`);
console.log(`converted:       ${written}${dryRun ? " (dry run — nothing written)" : ` -> ${OUT_DIR}`}`);
if (!dryRun) console.log(`sql written:     ${OUT_SQL}`);

const fuzzy = matched.filter((m) => m.how === "fuzzy");
if (fuzzy.length) {
  console.log(`\nMatched loosely — check these are right:`);
  for (const m of fuzzy) console.log(`  ${m.file}  ->  ${m.dish.name}  (${Math.round(m.score * 100)}%)`);
}
if (unmatched.length) {
  console.log(`\nNot imported (${unmatched.length}) — rename to the dish name and re-run:`);
  for (const u of unmatched) console.log(`  ${u.file}  —  ${u.reason}`);
}

const withPhoto = new Set(matched.map((m) => m.dish.handle));
const missing = menu.filter((d) => !withPhoto.has(d.handle));
console.log(`\ndishes still without a photo from this run: ${missing.length} of ${menu.length}`);
