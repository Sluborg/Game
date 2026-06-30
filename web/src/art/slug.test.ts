import { describe, expect, it } from "vitest";
import { deriveSlug } from "./slug";

describe("deriveSlug", () => {
  it("strips the node- prefix for building art", () => {
    expect(deriveSlug("node-home-keep.png")).toBe("home-keep");
    expect(deriveSlug("node-archer-tower.png")).toBe("archer-tower");
  });

  it("strips the icon-resource- prefix for resource icons", () => {
    expect(deriveSlug("icon-resource-wood.png")).toBe("wood");
    expect(deriveSlug("icon-resource-gold.png")).toBe("gold");
  });

  it("keeps the filename stem for unprefixed visuals", () => {
    expect(deriveSlug("title-screen.jpg")).toBe("title-screen");
    expect(deriveSlug("map-overworld-v2.png")).toBe("map-overworld-v2");
    expect(deriveSlug("map-overworld.png")).toBe("map-overworld");
    expect(deriveSlug("node-design-sheet.png")).toBe("design-sheet");
  });

  it("does not strip non-matching prefixes", () => {
    expect(deriveSlug("badge-lumber.png")).toBe("badge-lumber");
    expect(deriveSlug("ui-stamp-approved.png")).toBe("ui-stamp-approved");
  });
});
