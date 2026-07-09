// Top-level router. Tiny hash-based routing keeps this working on GitHub Pages
// (and under the /Game/ and /Game/dev/ bases) with no extra dependency:
//   #/guild  -> the Hall (the living canvas: clock, feed, investments)
//   #/report -> the nightly Report (sealed envelopes + the story stage)
//   #/heroes -> the Heroes roster
//   #/node   -> the Map (built on ArtCatalog)
//   #/test   -> the Combat Test dev screen (off the nav; reachable from Start)
//   anything else -> the start screen
//
// The whole app is wrapped in GuildProvider so the Hall/Report/nav share one live
// GuildState (persisted to localStorage). The four gameplay screens share a
// persistent bottom NavBar (Map / Hall / Heroes / Report); Combat Test is a dev
// tool and stays off the nav, reached from Start.

import { useEffect, useState } from "react";
import { StartScreen } from "./StartScreen";
import { CombatTestScreen } from "./combat/CombatTestScreen";
import { NodeTestScreen } from "./node/NodeTestScreen";
import { HeroesScreen } from "./heroes/HeroesScreen";
import { HallScreen } from "./hall/HallScreen";
import { ReportScreen } from "./report/ReportScreen";
import { GuildProvider, useGuild } from "./guild/GuildContext";
import { NavBar, type NavKey } from "./kit";

type Route = "start" | "test" | "node" | "heroes" | "guild" | "report";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h === "test") return "test";
  if (h === "node") return "node";
  if (h === "heroes") return "heroes";
  if (h === "guild") return "guild";
  if (h === "report") return "report";
  return "start";
}

const NAV_KEYS: NavKey[] = ["node", "guild", "heroes", "report"];

export function Root() {
  return (
    <GuildProvider>
      <Shell />
    </GuildProvider>
  );
}

function Shell() {
  const [route, setRoute] = useState<Route>(readRoute);
  const { unread, reset } = useGuild();

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r: Route) => {
    window.location.hash = r === "start" ? "" : `/${r}`;
  };

  if (route === "start") {
    return (
      <StartScreen
        onPlay={() => go("guild")}
        onNodeTest={() => go("node")}
        onCombatTest={() => go("test")}
        onReset={reset}
      />
    );
  }

  const screen =
    route === "test" ? (
      <CombatTestScreen />
    ) : route === "node" ? (
      <NodeTestScreen />
    ) : route === "heroes" ? (
      <HeroesScreen />
    ) : route === "guild" ? (
      <HallScreen />
    ) : (
      <ReportScreen />
    );

  const active = NAV_KEYS.includes(route as NavKey) ? (route as NavKey) : undefined;

  return (
    <>
      {screen}
      <NavBar active={active} unread={unread} onNavigate={(key) => go(key)} />
    </>
  );
}
