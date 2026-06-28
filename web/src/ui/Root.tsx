// Top-level router. Tiny hash-based routing keeps this working on GitHub Pages
// (and under the /Game/ and /Game/dev/ bases) with no extra dependency:
//   #/campaign -> the existing day/economy game (App, left untouched)
//   #/test     -> the Combat Test feature
//   #/guild    -> the Asset Report guild sim (self-contained)
//   anything else -> the start screen
//
// App.tsx is rendered as-is; the "menu" affordance for Campaign is overlaid here
// so the existing screen stays unchanged.

import { useEffect, useState } from "react";
import { App } from "./App";
import { StartScreen } from "./StartScreen";
import { CombatTestScreen } from "./combat/CombatTestScreen";
import { GuildApp } from "./guild/GuildApp";

type Route = "start" | "campaign" | "test" | "guild";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h === "campaign") return "campaign";
  if (h === "test") return "test";
  if (h === "guild") return "guild";
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

  if (route === "guild") return <GuildApp />;

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

  return (
    <StartScreen
      onPlayCampaign={() => go("campaign")}
      onCombatTest={() => go("test")}
      onAssetReport={() => go("guild")}
    />
  );
}
