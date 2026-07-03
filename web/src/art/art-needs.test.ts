import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NodeType, ResourceType } from "./enums";
import { deriveSlug } from "./slug";
// The reconcile script mirrors the enums + slug derivation in plain JS. Importing
// it here is side-effect-free (its main() only runs when invoked directly), so we
// can assert the mirror never drifts from the TypeScript source of truth.
import {
  KNOWN_NODE_SLUGS,
  KNOWN_RESOURCE_SLUGS,
  deriveSlug as reconcileDeriveSlug,
} from "../../../scripts/reconcile-art.mjs";

// art-needs.json is the game's declared art demand list (NEEDED). Its node/resource
// slugs are seeded from the shared enums; this test guarantees they never drift.
// Read via fs (not import) so the JSON can live at web/art-needs.json, outside src/.

// Repo-root art-needs.json (up from web/src/art/ → web/src → web → repo root).
const NEEDS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "art-needs.json");

interface Need {
  slug: string;
  kind: string;
  description: string;
  feature: string;
}

const doc = JSON.parse(readFileSync(NEEDS_PATH, "utf8")) as { version: number; needs: Need[] };

describe("art-needs.json", () => {
  it("is a versioned object with a needs[] array", () => {
    expect(doc.version).toBe(1);
    expect(Array.isArray(doc.needs)).toBe(true);
    expect(doc.needs.length).toBeGreaterThan(0);
  });

  it("has well-formed entries (slug/kind/description/feature)", () => {
    const kinds = new Set(["node", "resource", "ui"]);
    for (const n of doc.needs) {
      expect(typeof n.slug).toBe("string");
      expect(n.slug).toMatch(/^[a-z0-9-]+$/);
      expect(kinds.has(n.kind)).toBe(true);
      expect(n.description.length).toBeGreaterThan(0);
      expect(n.feature.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate slugs", () => {
    const slugs = doc.needs.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  const declared = new Set(doc.needs.map((n) => n.slug));

  it("declares every NodeType as a needed node", () => {
    const nodeSlugs = new Set(doc.needs.filter((n) => n.kind === "node").map((n) => n.slug));
    for (const v of Object.values(NodeType)) {
      expect(declared.has(v)).toBe(true);
      expect(nodeSlugs.has(v)).toBe(true);
    }
  });

  it("declares every ResourceType as a needed resource", () => {
    const resourceSlugs = new Set(doc.needs.filter((n) => n.kind === "resource").map((n) => n.slug));
    for (const v of Object.values(ResourceType)) {
      expect(declared.has(v)).toBe(true);
      expect(resourceSlugs.has(v)).toBe(true);
    }
  });

  it("only declares enum-backed nodes/resources (reverse of the checks above)", () => {
    const nodeVals = new Set<string>(Object.values(NodeType));
    const resourceVals = new Set<string>(Object.values(ResourceType));
    for (const n of doc.needs) {
      if (n.kind === "node") expect(nodeVals.has(n.slug)).toBe(true);
      if (n.kind === "resource") expect(resourceVals.has(n.slug)).toBe(true);
    }
  });

  it("declares the four produced AssetReport reference visuals so they resolve to ok", () => {
    for (const slug of ["title-screen", "map-overworld", "map-overworld-v2", "node-design-sheet"]) {
      expect(declared.has(slug)).toBe(true);
    }
  });
});

describe("reconcile-art.mjs mirror stays faithful to the TypeScript source", () => {
  it("KNOWN_NODE_SLUGS matches NodeType exactly", () => {
    expect([...KNOWN_NODE_SLUGS].sort()).toEqual([...Object.values(NodeType)].sort());
  });

  it("KNOWN_RESOURCE_SLUGS matches ResourceType exactly", () => {
    expect([...KNOWN_RESOURCE_SLUGS].sort()).toEqual([...Object.values(ResourceType)].sort());
  });

  it("its deriveSlug agrees with the game's slug.ts on every representative filename", () => {
    const filenames = [
      "node-home-keep.png", // known node -> stripped
      "node-archer-tower.png",
      "icon-resource-wood.png", // known resource -> stripped
      "icon-resource-gold.png",
      "title-screen.jpg", // plain stem
      "map-overworld-v2.png",
      "node-design-sheet.png", // node- prefix but not a known node -> kept
      "node-guild-office.png", // guild-office is NOT a NodeType -> kept as-is in BOTH
      "icon-resource-mana.png", // not a ResourceType -> kept
      "badge-lumber.png",
    ];
    for (const f of filenames) {
      expect(reconcileDeriveSlug(f)).toBe(deriveSlug(f));
    }
  });
});
