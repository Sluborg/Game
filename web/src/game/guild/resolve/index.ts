// Barrel for the resolution engine. NOT re-exported from guild/index.ts on
// purpose: the live v1 sim must not see it until the wire slice.
export * from "./check";
export * from "./growth";
export * from "./birth";
// sim.ts (the doc renderer) is deliberately NOT re-exported; sim.cli.ts and the
// test import it directly so app code never pulls it in.
