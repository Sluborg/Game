// Asset Report — the /guild screen. Self-contained, phone-first single column.
// Mirrors the existing app's structure but lives entirely under ui/guild/.

import { useState } from "react";
import { useGuild } from "./useGuild";
import { Roster } from "./Roster";
import { DispatchForm } from "./DispatchForm";
import { TurnReport } from "./TurnReport";
import { HERO_CLASS_DEFS } from "../../game/heroes";
import { activeDispatches, currentNode, nodeById, remainingTurns } from "../../game/guild/selectors";
import "./guild.css";

/** Navigate back to the main game (clears the hash route). */
function goHome() {
  window.location.hash = "";
}

export function GuildApp() {
  const guild = useGuild();
  const [reveal, setReveal] = useState(false);
  const { state } = guild;
  const active = activeDispatches(state);

  return (
    <div className="guild">
      <header className="guild-topbar">
        <div className="guild-brand">
          <span className="guild-title">⚖️ ASSET REPORT</span>
          <span className="guild-tagline">Quests, Heroes, and also, Accounting…</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <button className="guild-link" onClick={goHome}>
            ← Kingdom
          </button>
          <button className="btn btn-reset" onClick={guild.reset} title="Wipe the guild ledger">
            ⟳ Reset
          </button>
        </div>
      </header>

      <main className="guild-content">
        <div className="guild-ledger">
          <div>
            <div className="guild-ledger-turn">Turn {state.turn}</div>
            <div className="guild-ledger-gold">🪙 {state.gold}</div>
          </div>
          <button className="btn btn-end-turn" onClick={guild.endTurn}>
            End Turn ▸
          </button>
        </div>

        <TurnReport state={state} reveal={reveal} onToggleReveal={setReveal} />

        <section className="guild-roster">
          <div className="guild-section-title">On Assignment</div>
          {active.length === 0 ? (
            <div className="guild-empty">No heroes in the field.</div>
          ) : (
            active.map((d) => {
              const hero = state.heroes.find((h) => h.id === d.heroId);
              const at = nodeById(state, currentNode(d));
              const dest = nodeById(state, d.destNodeId);
              return (
                <div className="dispatch-row" key={d.id}>
                  <span>
                    {hero ? HERO_CLASS_DEFS[hero.stats.heroClass].icon : "?"} {hero?.name ?? "?"}
                    {d.agentId ? " 🕵️" : ""}
                  </span>
                  <span>
                    {at?.name ?? currentNode(d)} → {dest?.name ?? d.destNodeId} · ~{remainingTurns(state, d)}t
                  </span>
                </div>
              );
            })
          )}
        </section>

        <DispatchForm state={state} onDispatch={guild.dispatch} />

        <Roster state={state} />
      </main>
    </div>
  );
}
