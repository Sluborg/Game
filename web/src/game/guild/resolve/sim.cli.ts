// `npm run sim:resolution` — writes docs/resolution-sim.md (repo root) from the
// pure renderer. Node-only (node:fs), so tsconfig excludes *.cli.ts from the
// Pages build; vite-node runs it.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderSim } from "./sim";

const out = fileURLToPath(new URL("../../../../../docs/resolution-sim.md", import.meta.url));
writeFileSync(out, renderSim(), "utf8");
console.log(`wrote ${out}`);
