// Turn a scraped Touch menu into SQL that adds a branch WITHOUT touching the
// branches already running.
//
//   node scripts/scrape-touch-menu.mjs battersea > supabase/battersea-live-menu.json
//   node scripts/gen-branch-menu-sql.mjs battersea > supabase/battersea_menu.sql
//
// The catalogue (menu_items) was rebuilt from BALHAM, so its names and prices
// are Balham's. A second branch is expressed as overrides on top:
//
//   location_menu_items(location, item, is_available, price_pence_override)
//
// An ABSENT row means "available, at the catalogue price" — so doing nothing
// would silently sell every Balham dish at Balham's prices from Battersea.
// Every dish therefore gets an explicit row, including the ones the new branch
// does not sell.
//
// Dishes are matched between branches by their Touch handle, not their name:
// the same dish is "Pilau Rice (D)" at one and "Basmati Pilau Rice (D)" at the
// other, and matching on that would have created duplicates.

import { readFileSync } from "node:fs";

const branch = process.argv[2];
if (!branch) {
  console.error("Usage: node scripts/gen-branch-menu-sql.mjs <branch-slug>");
  process.exit(2);
}

const incoming = JSON.parse(readFileSync(`supabase/${branch}-live-menu.json`, "utf8"));
const catalogue = JSON.parse(readFileSync("supabase/balham-live-menu.json", "utf8"));
const byHandle = new Map(catalogue.map((i) => [i.handle, i]));

const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

/**
 * The price to charge for a dish.
 *
 * A dish with sizes is listed at its SMALLEST price, the same way the
 * catalogue does it — the sizes themselves are modifiers, which are shared by
 * every branch and so cannot differ per branch. Where a branch offers a size
 * the catalogue has no modifier for, the extra size is dropped rather than
 * added globally: offering "Large" at a branch that does not serve it is worse
 * than not offering it at one that does.
 */
const priceOf = (item) => Math.min(...item.skus.map((s) => s.pence));

/** Dishes this branch sells that the catalogue has never heard of. */
const novel = incoming.filter((i) => !byHandle.has(i.handle));

/**
 * Catalogue dishes this branch does NOT sell.
 *
 * Matched by handle like everything else — but then filtered by NAME, because
 * the rows are hidden by name and a name can outlive a handle. "Palak Daal" is
 * `palak_daal_1` at Balham and `palak_daal` at Battersea: by handle they are
 * two dishes, by name they are one row in the catalogue. Without this it
 * appeared in both the sells list and the hidden list, and the hide ran last,
 * so the branch silently stopped selling a dish it sells.
 */
const soldNames = new Set(incoming.map((i) => i.name));
const absent = catalogue.filter((i) => !incoming.some((x) => x.handle === i.handle) && !soldNames.has(i.name));

/**
 * Touch's section names → the category ids already in the database.
 *
 * The ids came from Balham's rebuild and do not match the headings Touch
 * prints ("LAMB MAIN DISHES" is `lamb-main-dishes`, but Battersea's page calls
 * the same section "Lamb Mains"). Deriving an id from the heading would create
 * a second, near-identical section and split the menu in two.
 */
const CATEGORY_ALIASES = {
  "veg starters": "veg-starters",
  "non veg starters": "non-veg-starters",
  "vegetable mains": "vegetarian-main-dishes",
  "prawn delicacies": "seafood-dishes",
  "chicken mains": "chicken-main-dishes",
  "lamb mains": "lamb-main-dishes",
  biryani: "biryanis",
  biryanis: "biryanis",
  "vegetable sides": "vegetarian-side-dishes",
  "rice & bread": "rice",
  bread: "bread",
  "vegan dishes": "vegan-dishes",
  "drinks & accompaniments": "accompaniments",
  "indo-chinese": "indo-chinese",
  "wines&beer": "drinks-wines-beer",
  desserts: "desserts",
};

const catId = (title) => {
  const known = CATEGORY_ALIASES[title.toLowerCase().trim()];
  if (known) return known;
  // Unknown section: make an id, and the generated SQL creates it. Worth
  // noticing, because it usually means Touch renamed something.
  console.error(`  ! unmapped section "${title}" — creating a new category for it`);
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const newCategories = [...new Set(novel.map((i) => i.category))];

const out = [];
const say = (s = "") => out.push(s);

say(`-- ============================================================================`);
say(`-- ADD ${branch.toUpperCase()} TO ONLINE ORDERING  —  ADDITIVE, nothing is deleted`);
say(`-- ============================================================================`);
say(`-- Source: https://${branch}.bombaybicyclechef.uk/menu  (scraped ${new Date().toISOString().slice(0, 10)})`);
say(`--`);
say(`-- ${incoming.length} dishes sold at ${branch}. Of those, ${incoming.length - novel.length} already exist in`);
say(`-- the catalogue (which was built from Balham) and ${novel.length} are new.`);
say(`-- ${absent.length} catalogue dishes are NOT sold here and are switched off for`);
say(`-- this branch only — Balham keeps all of them.`);
say(`--`);
say(`-- Prices differ between branches, so every dish gets an explicit override`);
say(`-- rather than inheriting Balham's price.`);
say(`--`);
say(`-- Runs as one transaction: if any statement fails, nothing changes.`);
say(`-- Safe to run twice.`);
say(`-- ============================================================================`);
say();
say("begin;");
say();

say("-- 1. The branch must exist and be open for business -------------------------");
say(`do $$ begin`);
say(`  if not exists (select 1 from locations where slug = ${q(branch)}) then`);
say(`    raise exception 'No location with slug ${branch} — add it in admin > Locations first.';`);
say(`  end if;`);
say(`end $$;`);
say();

if (newCategories.length) {
  say("-- 2. Categories this branch introduces --------------------------------------");
  say("insert into menu_categories (id, title, sort_order) values");
  say(
    newCategories
      .map((t, n) => `  (${q(catId(t))}, ${q(t)}, ${900 + n * 10})`)
      .join(",\n") + "\non conflict (id) do nothing;",
  );
  say();
}

if (novel.length) {
  say(`-- 3. Dishes only ${branch} sells -------------------------------------------`);
  say("-- Added to the shared catalogue, then switched OFF everywhere else, so they");
  say("-- do not appear on another branch's menu.");
  say("insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order, dietary) values");
  say(
    novel
      .map((i, n) => {
        const pence = priceOf(i);
        return `  (${q(catId(i.category))}, ${q(i.name)}, ${q("£" + (pence / 100).toFixed(2))}, ${pence}, ${q(i.description || null)}, null, ${2000 + n * 10}, '{}'::text[])`;
      })
      .join(",\n") + "\non conflict do nothing;",
  );
  say();
  say("-- Hide the new dishes at every OTHER branch.");
  say(`insert into location_menu_items (location_id, item_id, is_available)`);
  say(`select l.id, m.id, false`);
  say(`  from locations l`);
  say(`  join menu_items m on m.name in (`);
  say(novel.map((i) => `    ${q(i.name)}`).join(",\n"));
  say(`  )`);
  say(` where l.slug <> ${q(branch)}`);
  say(`on conflict (location_id, item_id) do update set is_available = excluded.is_available;`);
  say();
}

say(`-- 4. What ${branch} sells, and for how much ----------------------------------`);
say("insert into location_menu_items (location_id, item_id, is_available, price_pence_override)");
say("select l.id, m.id, true, v.pence");
say("  from locations l");
say(`  cross join (values`);
say(
  incoming
    .map((i) => {
      const name = byHandle.get(i.handle)?.name ?? i.name;
      return `    (${q(name)}, ${priceOf(i)})`;
    })
    .join(",\n"),
);
say("  ) as v(name, pence)");
say("  join menu_items m on m.name = v.name");
say(` where l.slug = ${q(branch)}`);
say("on conflict (location_id, item_id) do update");
say("  set is_available = true, price_pence_override = excluded.price_pence_override;");
say();

if (absent.length) {
  say(`-- 5. Catalogue dishes ${branch} does NOT sell -------------------------------`);
  say("-- Switched off here only. Other branches are untouched.");
  say("insert into location_menu_items (location_id, item_id, is_available)");
  say("select l.id, m.id, false");
  say("  from locations l");
  say("  join menu_items m on m.name in (");
  say(absent.map((i) => `    ${q(i.name)}`).join(",\n"));
  say("  )");
  say(` where l.slug = ${q(branch)}`);
  say("on conflict (location_id, item_id) do update set is_available = false;");
  say();
}

say("commit;");
say();
say("-- Check it landed:");
say("--   select count(*) filter (where is_available) as sells,");
say("--          count(*) filter (where not is_available) as hidden");
say("--     from location_menu_items li");
say("--     join locations l on l.id = li.location_id");
say(`--    where l.slug = ${q(branch)};`);

console.error(
  `${branch}: ${incoming.length} sold (${novel.length} new to the catalogue), ${absent.length} hidden`,
);
console.log(out.join("\n"));
