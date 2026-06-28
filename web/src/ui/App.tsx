// Root screen. Port of KingdomScreen.kt, restructured for the turn-based day
// loop. Single scrollable column; no grid-battle overlay (combat is a stub).

import { useGame } from "./useGame";
import { DayBar } from "./components/DayBar";
import { Milestones } from "./components/Milestones";
import { ThreatBanner } from "./components/ThreatBanner";
import { BattleLog } from "./components/BattleLog";
import { Heroes } from "./components/Heroes";
import { Buildings } from "./components/Buildings";

export function App() {
  const game = useGame();
  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-title">👑 Majesty — Day by Day</span>
        <span style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() => {
              window.location.hash = "#/guild";
            }}
            title="Open the Asset Report guild sim"
          >
            ⚖️ Asset Report
          </button>
          <button className="btn btn-reset" onClick={game.reset} title="Start over">
            ⟳ Reset
          </button>
        </span>
      </header>

      <main className="content">
        <DayBar state={game.state} onEndDay={game.endDay} />
        <Milestones state={game.state} />
        <ThreatBanner state={game.state} />
        <BattleLog state={game.state} />
        <Heroes state={game.state} />
        <Buildings
          state={game.state}
          onBuild={game.build}
          onUpgrade={game.upgrade}
          onRecruit={game.recruit}
        />
      </main>
    </div>
  );
}
