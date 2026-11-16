// Read a branch's menu off the old Touch takeaway site.
//
//   node scripts/scrape-touch-menu.mjs battersea > supabase/battersea-live-menu.json
//   node scripts/scrape-touch-menu.mjs balham    > supabase/balham-live-menu.json
//
// The Touch sites (<branch>.bombaybicyclechef.uk) remain the source of truth
// for prices — they are what the shop has actually been charging. The page is
// client-rendered, so the prices are not in the markup as text; each product
// carries a small inline script with its real pricing:
//
//   Product.resolveScriptForm(document.currentScript, 'french_fries', 'base')
//   var bp = {"sku_handles":{"":""},"skus":{"":295},"premiums":{"":null}};
//
// That `skus` map is the money, in pence, keyed by variant ("" for a plain
// dish, e.g. "regular"/"large" where a dish has sizes). Reading it beats
// reading the rendered "£ 8.95", which is formatted, sometimes hidden behind a
// mobile-only element, and rounds.
//
// Output is the same shape as supabase/balham-live-menu.json so both branches
// feed the same SQL generator.

const branch = process.argv[2];
if (!branch) {
  console.error("Usage: node scripts/scrape-touch-menu.mjs <branch-slug>");
  process.exit(2);
}

const url = `https://${branch}.bombaybicyclechef.uk/menu`;
const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (menu-import)" } });
if (!res.ok) {
  console.error(`${url} returned ${res.status}`);
  process.exit(1);
}
const html = await res.text();

/**
 * Plain text out of the page.
 *
 * Some descriptions were pasted into Touch from a word processor and carry
 * their markup with them — `<p><span style="font-family: -apple-system…">`.
 * Left in, that is what the customer reads on the menu.
 */
const decode = (s) =>
  s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

// Category headings, in page order, so each product can be attributed to the
// last heading above it.
const categories = [...html.matchAll(/id="category_([a-z0-9_]+)"[\s\S]{0,400}?class="category__title[^"]*"[^>]*>([^<]*)</g)].map(
  (m) => ({ at: m.index, handle: m[1], title: titleCase(decode(m[2])) }),
);

function titleCase(s) {
  // Headings come through shouting ("VEG STARTERS").
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "and");
}

function categoryAt(index) {
  let found = null;
  for (const c of categories) {
    if (c.at <= index) found = c;
    else break;
  }
  return found?.title ?? "Uncategorised";
}

// One entry per product block.
const blocks = [...html.matchAll(/id="product_([a-z0-9_]+)">/g)];
const items = [];
const seen = new Set();

for (let i = 0; i < blocks.length; i++) {
  const start = blocks[i].index;
  const end = i + 1 < blocks.length ? blocks[i + 1].index : html.length;
  const block = html.slice(start, end);
  const handle = blocks[i][1];

  // The same dish can appear twice (a "popular" rail as well as its section).
  if (seen.has(handle)) continue;

  const name = block.match(/Basket\.createItem\(this,\s*'([^']+)'\)/)?.[1];
  if (!name) continue;

  const description = decode(
    block.match(/class="product__description">\s*([\s\S]*?)\s*<\/div>/)?.[1] ?? "",
  );

  // Base pricing. A dish with sizes has several keys; "" is the plain one.
  const pricing = block.match(/var bp = (\{[\s\S]*?\});/)?.[1];
  if (!pricing) continue;

  let skus;
  try {
    skus = JSON.parse(pricing).skus ?? {};
  } catch {
    continue; // malformed inline script — better skipped than guessed at
  }

  const priced = Object.entries(skus)
    .filter(([, pence]) => Number.isFinite(pence))
    .map(([variant, pence]) => ({ variant: variant || null, pence }));
  if (priced.length === 0) continue;

  seen.add(handle);
  items.push({
    category: categoryAt(start),
    handle,
    name: decode(name),
    description,
    skus: priced,
  });
}

if (items.length === 0) {
  console.error("No products found — the Touch page markup has probably changed.");
  process.exit(1);
}

console.error(
  `${branch}: ${items.length} dishes across ${new Set(items.map((i) => i.category)).size} categories`,
);
console.log(JSON.stringify(items, null, 2));
