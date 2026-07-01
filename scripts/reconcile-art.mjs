// reconcile-art.mjs — the needs ↔ done gate.
//
// Compares this game's DECLARED art needs (art-needs.json at the repo root —
// "NEEDED") against ArtLibrary's live manifest (asset-index.json, collection ==
// "AssetReport" — "DONE"). Prints a per-slug table and exits non-zero on drift so
// it can gate CI.
//
//   npm run reconcile                    (from the repo root)
//   node scripts/reconcile-art.mjs
//
// Dependency-free Node ESM (global fetch, Node 18+). The art SOURCE (repo / ref /
// collection) is read straight from web/src/art/config.ts so this gate validates
// the SAME manifest the game consumes — including when a release build pins
// ART_REF to a commit SHA. The slug vocabulary (KNOWN_*_SLUGS) and derivation
// mirror web/src/art/{enums,slug}.ts; the parity test web/src/art/art-needs.test.ts
// imports this module and asserts they never drift from the TS source.
// ArtLibrary is read-only from here — we only fetch.

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// --- Art source config, read from web/src/art/config.ts ----------------------
// A release build may pin ART_REF to a commit SHA (see config.ts / web/docs/ART.md).
// Parsing repo/ref/collection from config.ts (rather than hardcoding them) keeps
// this gate pointed at whatever manifest the game actually ships. `ART_REF` in the
// environment overrides, and everything falls back to the current defaults if
// config.ts can't be read or parsed.
function readArtConfig() {
  const defaults = { repo: "Sluborg/ArtLibrary", ref: "main", collection: "AssetReport" };
  let cfg = "";
  try {
    cfg = readFileSync(resolve(HERE, "..", "web", "src", "art", "config.ts"), "utf8");
  } catch {
    cfg = "";
  }
  const pick = (name, fallback) => {
    const m = cfg.match(new RegExp(`export const ${name}\\s*=\\s*["'\`]([^"'\`]+)["'\`]`));
    return m ? m[1] : fallback;
  };
  const repo = pick("ART_REPO", defaults.repo);
  const ref = process.env.ART_REF || pick("ART_REF", defaults.ref);
  const collection = pick("ART_COLLECTION", defaults.collection);
  const rawBase = `https://raw.githubusercontent.com/${repo}/${ref}`;
  return {
    repo,
    ref,
    collection,
    manifestUrl: `${rawBase}/asset-index.json`,
    buildingsMdUrl: `${rawBase}/Games/AssetReport/Buildings.md`,
  };
}

// --- Mirror of web/src/art/enums.ts (keep in sync; guarded by the parity test) ---
// The string values ARE the slugs. A prefix is stripped only when the remainder is
// one of these known slugs — identical to web/src/art/slug.ts.
export const KNOWN_NODE_SLUGS = [
  "home-keep", "grand-citadel", "settlement", "lumber-camp", "quarry", "farmland",
  "iron-mine", "gold-mine", "academy", "forge", "barracks", "archer-tower", "wall",
  "temple", "market",
];
export const KNOWN_RESOURCE_SLUGS = [
  "wood", "stone", "food", "iron", "gold", "knowledge", "faith", "approval",
];
const NODE_SET = new Set(KNOWN_NODE_SLUGS);
const RESOURCE_SET = new Set(KNOWN_RESOURCE_SLUGS);

/** Derive the stable slug for a manifest entry. Mirrors web/src/art/slug.ts. */
export function deriveSlug(originalFilename) {
  const stem = String(originalFilename).replace(/\.[^.]+$/, "");
  if (stem.startsWith("node-")) {
    const rest = stem.slice("node-".length);
    if (NODE_SET.has(rest)) return rest;
  }
  if (stem.startsWith("icon-resource-")) {
    const rest = stem.slice("icon-resource-".length);
    if (RESOURCE_SET.has(rest)) return rest;
  }
  return stem;
}

// --- Load NEEDED (art-needs.json) --------------------------------------------
function loadNeeds() {
  const path = resolve(HERE, "..", "art-needs.json");
  const doc = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(doc.needs)) throw new Error("art-needs.json: missing needs[]");
  return doc.needs;
}

// --- Fetch DONE (ArtLibrary manifest, AssetReport collection w/ raw_url) ------
async function fetchDoneSlugs(cfg) {
  const res = await fetch(cfg.manifestUrl);
  if (!res.ok) throw new Error(`fetch manifest failed (HTTP ${res.status}) — ${cfg.manifestUrl}`);
  const manifest = await res.json();
  // A missing/renamed assets[] is a broken manifest, not "everything is drift".
  if (!Array.isArray(manifest.assets)) {
    throw new Error("asset-index.json: missing or malformed assets[] (manifest shape changed?)");
  }
  const done = new Map(); // slug -> { rawUrl, filename }
  for (const a of manifest.assets) {
    if (a.collection !== cfg.collection) continue;
    if (!a.raw_url) continue; // DONE requires downloadable bytes
    if (!a.original_filename) continue; // can't derive a slug without a filename
    const slug = deriveSlug(a.original_filename);
    if (done.has(slug)) {
      console.warn(`⚠ duplicate DONE slug "${slug}" (${a.original_filename}) — keeping first, ignoring this one.`);
      continue;
    }
    done.set(slug, { rawUrl: a.raw_url, filename: a.original_filename });
  }
  return done;
}

// --- Optional, non-fatal: roster drift vs Buildings.md -----------------------
async function warnRosterDrift(needSlugs, cfg) {
  try {
    const res = await fetch(cfg.buildingsMdUrl);
    if (!res.ok) return; // silent — asset-index.json is the authoritative DONE source
    const md = await res.text();
    // Roster rows look like: | `home-keep` | Home Keep | `PLAYER_BASE` | needed |
    const roster = new Set();
    for (const m of md.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gim)) roster.add(m[1]);
    if (roster.size === 0) {
      console.warn("⚠ roster check: parsed 0 rows from Buildings.md — its table format may have changed (non-fatal).");
      return;
    }
    const missingFromNeeds = [...roster].filter((s) => !needSlugs.has(s));
    if (missingFromNeeds.length) {
      console.warn(
        `\n⚠ roster drift (non-fatal): in ArtLibrary Buildings.md but not in art-needs.json: ${missingFromNeeds.join(", ")}`,
      );
    }
  } catch {
    // Network/parse issues are non-fatal — never affect the exit code.
  }
}

// --- Report -------------------------------------------------------------------
function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

async function main() {
  const cfg = readArtConfig();
  const needs = loadNeeds();
  const needBySlug = new Map(needs.map((n) => [n.slug, n]));
  const needSlugs = new Set(needBySlug.keys());

  const done = await fetchDoneSlugs(cfg);

  const allSlugs = [...new Set([...needSlugs, ...done.keys()])].sort();

  console.log(`\nArt reconcile — NEEDED (art-needs.json) vs DONE (${cfg.repo}@${cfg.ref}, collection ${cfg.collection})\n`);
  console.log(`${pad("SLUG", 20)}${pad("KIND", 10)}${pad("NEEDED?", 9)}${pad("DONE?", 7)}STATUS`);
  console.log("-".repeat(64));

  const counts = { ok: 0, "missing-art": 0, "orphan-art": 0 };
  for (const slug of allSlugs) {
    const isNeeded = needSlugs.has(slug);
    const isDone = done.has(slug);
    let status;
    if (isNeeded && isDone) status = "ok";
    else if (isNeeded && !isDone) status = "missing-art";
    else status = "orphan-art";
    counts[status]++;
    const kind = needBySlug.get(slug)?.kind ?? "-";
    console.log(
      `${pad(slug, 20)}${pad(kind, 10)}${pad(isNeeded ? "yes" : "no", 9)}${pad(isDone ? "yes" : "no", 7)}${status}`,
    );
  }

  console.log("-".repeat(64));
  console.log(
    `Total ${allSlugs.length} · ok ${counts.ok} · missing-art ${counts["missing-art"]} · orphan-art ${counts["orphan-art"]}`,
  );

  await warnRosterDrift(needSlugs, cfg);

  const drift = counts["missing-art"] + counts["orphan-art"];
  if (drift > 0) {
    console.log(`\n✗ drift: ${drift} slug(s) out of sync. (missing-art = declare-then-produce; orphan-art = produced but undeclared.)`);
    process.exit(1);
  }
  console.log("\n✓ in sync: every needed slug has produced art and vice versa.");
}

// Only run when executed directly (node scripts/reconcile-art.mjs). Importing this
// module (e.g. from the parity test) must be side-effect-free — no fetch, no exit.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`reconcile-art: ${err.message}`);
    process.exit(2);
  });
}
