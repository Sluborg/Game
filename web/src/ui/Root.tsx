// Top-level router. Tiny hash-based routing keeps this working on GitHub Pages
// (and under the /Game/ and /Game/dev/ bases) with no extra dependency:
//   #/test -> the Combat Test feature
//   #/node -> the minimal Node Test (built on ArtCatalog)
//   anything else -> the start screen

import { useEffect, useState } from "react";
import { StartScreen } from "./StartScreen";
import { CombatTestScreen } from "./combat/CombatTestScreen";
import { NodeTestScreen } from "./node/NodeTestScreen";

type Route = "start" | "test" | "node";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h === "test") return "test";
  if (h === "node") return "node";
  return "start";
}

export function Root() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r: Route) => {
    window.location.hash = r === "start" ? "" : `/${r}`;
  };

  if (route === "test") return <CombatTestScreen onExit={() => go("start")} />;

  if (route === "node") return <NodeTestScreen onExit={() => go("start")} />;

  return (
    <StartScreen onCombatTest={() => go("test")} onNodeTest={() => go("node")} />
  );
}
