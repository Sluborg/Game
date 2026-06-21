// Top-level router. Tiny hash-based routing keeps this working on GitHub Pages
// (and under the /Game/ and /Game/dev/ bases) with no extra dependency:
//   #/campaign -> the existing day/economy game (App, left untouched)
//   #/test     -> the standalone Combat Test
//   anything else -> the start screen
//
// App.tsx is rendered as-is; the "menu" affordance for Campaign is overlaid here
// so the existing screen stays unchanged.

import { useEffect, useState } from "react";
import { App } from "./App";
import { StartScreen } from "./StartScreen";
import { CombatTest } from "./CombatTest";

type Route = "start" | "campaign" | "test";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h === "campaign") return "campaign";
  if (h === "test") return "test";
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

  if (route === "test") return <CombatTest onExit={() => go("start")} />;

  if (route === "campaign") {
    return (
      <>
        <App />
        <button className="menu-fab" onClick={() => go("start")} title="Back to menu">
          ☰
        </button>
      </>
    );
  }

  return <StartScreen onPlayCampaign={() => go("campaign")} onCombatTest={() => go("test")} />;
}
