// Top-level router. Tiny hash-based routing keeps this working on GitHub Pages
// (and under the /Game/ and /Game/dev/ bases) with no extra dependency:
//   #/test   -> the Combat Test feature
//   #/node   -> the Map (built on ArtCatalog)
//   #/heroes -> the Heroes roster
//   anything else -> the start screen
//
// The three feature screens share a persistent bottom NavBar (Map / Heroes /
// Combat Test), which replaces each screen's old "← Menu" back-to-start button
// so navigation no longer dead-ends at the start screen. StartScreen stays the
// #/ landing.

import { useEffect, useState } from "react";
import { StartScreen } from "./StartScreen";
import { CombatTestScreen } from "./combat/CombatTestScreen";
import { NodeTestScreen } from "./node/NodeTestScreen";
import { HeroesScreen } from "./heroes/HeroesScreen";
import { GuildScreen } from "./guild/GuildScreen";
import { NavBar, type NavKey } from "./kit";

type Route = "start" | "test" | "node" | "heroes" | "guild";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (h === "test") return "test";
  if (h === "node") return "node";
  if (h === "heroes") return "heroes";
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

  if (route === "start") {
    return (
      <StartScreen
        onGuild={() => go("guild")}
        onCombatTest={() => go("test")}
        onNodeTest={() => go("node")}
      />
    );
  }

  const screen =
    route === "test" ? (
      <CombatTestScreen />
    ) : route === "node" ? (
      <NodeTestScreen />
    ) : route === "guild" ? (
      <GuildScreen />
    ) : (
      <HeroesScreen />
    );

  return (
    <>
      {screen}
      <NavBar active={route as NavKey} onNavigate={(key) => go(key)} />
    </>
  );
}
