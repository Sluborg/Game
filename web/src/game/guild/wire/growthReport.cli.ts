// `npm run sim:growth` — writes docs/resolution-growth.md (repo root) from the pure
// renderer. Node-only (node:fs), excluded from the Pages build like the other *.cli.ts.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderGrowth } from "./growthReport";

const out = fileURLToPath(new URL("../../../../../docs/resolution-growth.md", import.meta.url));
writeFileSync(out, renderGrowth(), "utf8");
console.log(`wrote ${out}`);
