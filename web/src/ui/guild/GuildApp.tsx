// Asset Report — the /guild screen. Self-contained, phone-first single column.
// Mirrors the existing app's structure but lives entirely under ui/guild/.

import { useState } from "react";
import { useGuild } from "./useGuild";
import { Roster } from "./Roster";
import { DispatchForm } from "./DispatchForm";
import { TurnReport } from "./TurnReport";
import { WorldMap } from "./WorldMap";
import { HERO_CLASS_DEFS } from "../../game/heroes";
import { activeDispatches, currentNode, nodeById, remainingTurns } from "../../game/guild/selectors";
import type { NodeId } from "../../game/guild/types";
import "./guild.css";

/** Navigate back to the start menu (clears the hash route). */
function goHome() {
  window.location.hash = "";
}

export function GuildApp() {
  const guild = useGuild();
  const [reveal, setReveal] = useState(false);
  // Dispatch selection lifted here so the World Map and the form share the dest.
  const [heroId, setHeroId] = useState("");
  const [destId, setDestId] = useState<NodeId | "">("");
  const [agentId, setAgentId] = useState("");
  const { state } = guild;
  const active = activeDispatches(state);

  const onDispatch = (h: string, dest: NodeId, a: string | null) => {
    guild.dispatch(h, dest, a);
    setHeroId("");
    setDestId("");
    setAgentId("");
  };

  return (
    <div className="guild">
      <header className="guild-topbar">
        <div className="guild-brand">
          <span className="guild-title">⚖️ ASSET REPORT</span>
          <span className="guild-tagline">Quests, Heroes, and also, Accounting…</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <button className="guild-link" onClick={goHome}>
            ← Menu
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

        <WorldMap state={state} selectedDest={destId} onPickDestination={setDestId} />

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

        <DispatchForm
          state={state}
          heroId={heroId}
          destId={destId}
          agentId={agentId}
          onHero={setHeroId}
          onDest={setDestId}
          onAgent={setAgentId}
          onDispatch={onDispatch}
        />

        <Roster state={state} />
      </main>
    </div>
  );
}
