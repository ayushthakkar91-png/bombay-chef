// READ-ONLY schema probe: select(...).limit(0/1) only. No writes, no rpc, no DDL.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SCRATCH = "C:/Users/ayush/AppData/Local/Temp/claude/c--Users-ayush-Desktop-bom/5d0ed2bc-5f9f-4b43-90de-67f1e5e8b750/scratchpad";

// ---- env ----
const env = {};
for (const line of fs.readFileSync("C:/Users/ayush/Desktop/bom/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("missing env"); process.exit(1); }
console.log("project:", new URL(url).hostname, " service key length:", key.length);
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- build (table, column) universe ----
const { refs } = JSON.parse(fs.readFileSync(`${SCRATCH}/refs.json`, "utf8"));
const supp = JSON.parse(fs.readFileSync(`${SCRATCH}/supplement.json`, "utf8"));
const all = [...refs];
for (const s of supp) {
  for (const c of s.cols) all.push({ table: s.table, column: c, file: s.file, line: s.line, kind: s.kind, via: "" });
  for (const [relRaw, cols] of Object.entries(s.rels ?? {})) {
    const rel = relRaw.split("!")[0];
    all.push({ table: s.table, column: `->${relRaw}`, file: s.file, line: s.line, kind: "relation", via: "" });
    for (const c of cols) all.push({ table: rel, column: c, file: s.file, line: s.line, kind: "select", via: `nested-in:${s.table}` });
  }
}
const isIdent = (c) => /^[a-z_][a-z0-9_]*$/.test(c);
const colRefs = all.filter((r) => isIdent(r.column));
const relRefs = all.filter((r) => r.column.startsWith("->"));
const tables = [...new Set(all.map((r) => r.table))].sort();
const pairs = new Map(); // "t.c" -> uses[]
for (const r of colRefs) { const k = `${r.table}.${r.column}`; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(r); }
const relPairs = new Map();
for (const r of relRefs) { const k = `${r.table}.${r.column}`; if (!relPairs.has(k)) relPairs.set(k, []); relPairs.get(k).push(r); }
console.log(`tables: ${tables.length}  unique (table,column): ${pairs.size}  unique relations: ${relPairs.size}`);

// ---- pool ----
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const j = i++; out[j] = await fn(items[j]); } }));
  return out;
}

// ---- Step A: tables ----
const tableInfo = {};
await pool(tables, 6, async (t) => {
  const { data, error } = await sb.from(t).select("*").limit(1);
  tableInfo[t] = error ? { exists: false, error: `${error.code ?? ""} ${error.message}` } : { exists: true, rows: data.length, columns: data[0] ? Object.keys(data[0]).sort() : null };
});
const missingTables = tables.filter((t) => !tableInfo[t].exists);
const emptyTables = tables.filter((t) => tableInfo[t].exists && tableInfo[t].rows === 0);
console.log("missing tables:", missingTables.length ? missingTables.join(", ") : "none");
console.log("empty tables (no sample row; per-column probe only):", emptyTables.join(", ") || "none");

// ---- Step B: every referenced column, probed individually ----
const colResults = await pool([...pairs.keys()].filter((k) => tableInfo[k.split(".")[0]].exists), 8, async (k) => {
  const [t, c] = k.split(".");
  const { error } = await sb.from(t).select(c).limit(0);
  return { k, ok: !error, error: error ? `${error.code ?? ""} ${error.message}` : null };
});
// ---- Step C: relations ----
const relResults = await pool([...relPairs.keys()].filter((k) => tableInfo[k.split(".")[0]].exists), 8, async (k) => {
  const [t, r] = k.split(".");
  const { error } = await sb.from(t).select(`${r.slice(2)}(*)`).limit(0);
  return { k, ok: !error, error: error ? `${error.code ?? ""} ${error.message}` : null };
});

const badCols = colResults.filter((r) => !r.ok);
const badRels = relResults.filter((r) => !r.ok);
console.log(`\ncolumns probed: ${colResults.length}  missing: ${badCols.length}`);
console.log(`relations probed: ${relResults.length}  broken: ${badRels.length}\n`);

const fmt = (uses) => [...new Set(uses.map((u) => `${u.file}:${u.line} [${u.kind}${u.via ? " " + u.via : ""}]`))].join("; ");
for (const t of missingTables) console.log(`MISSING TABLE  ${t}  <- ${fmt(all.filter((r) => r.table === t))}\n   ${tableInfo[t].error}`);
for (const r of badCols) console.log(`MISSING COLUMN ${r.k}  <- ${fmt(pairs.get(r.k))}\n   ${r.error}`);
for (const r of badRels) console.log(`BROKEN RELATION ${r.k}  <- ${fmt(relPairs.get(r.k))}\n   ${r.error}`);

// also report prod columns on sampled tables that the code never names (informational)
fs.writeFileSync(`${SCRATCH}/probe-results.json`, JSON.stringify({ project: new URL(url).hostname, tableInfo, colResults, relResults }, null, 1));
console.log("\nwritten probe-results.json");
