// `npm run sim:wire` — writes docs/resolution-wire.md (repo root) from the pure
// renderer. Node-only (node:fs), so tsconfig excludes *.cli.ts from the Pages
// build; vite-node runs it.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderWire } from "./report";

const out = fileURLToPath(new URL("../../../../../docs/resolution-wire.md", import.meta.url));
writeFileSync(out, renderWire(), "utf8");
console.log(`wrote ${out}`);
