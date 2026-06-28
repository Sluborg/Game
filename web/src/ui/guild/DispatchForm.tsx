// Dispatch screen — pick a hero, a quest destination, and optionally an agent.

import { useMemo, useState } from "react";
import { HERO_CLASS_DEFS } from "../../game/heroes";
import { monsterDef } from "../../game/monsters";
import { isAgentAvailable, isHeroAvailable, type GuildState } from "../../game/guild/state";
import { questDestinations } from "../../game/guild/selectors";
import type { NodeId } from "../../game/guild/types";

export function DispatchForm({
  state,
  onDispatch,
}: {
  state: GuildState;
  onDispatch: (heroId: string, destNodeId: NodeId, agentId: string | null) => void;
}) {
  const idleHeroes = state.heroes.filter((h) => isHeroAvailable(state, h.id));
  const freeAgents = state.agents.filter((a) => a.alive && isAgentAvailable(state, a.id));
  const quests = useMemo(() => questDestinations(state), [state]);

  const [heroId, setHeroId] = useState("");
  const [destId, setDestId] = useState("");
  const [agentId, setAgentId] = useState("");

  const canDispatch = heroId && destId;

  const submit = () => {
    if (!canDispatch) return;
    onDispatch(heroId, destId, agentId || null);
    setHeroId("");
    setDestId("");
    setAgentId("");
  };

  return (
    <section className="guild-form">
      <div className="guild-section-title">Dispatch</div>
      {idleHeroes.length === 0 ? (
        <div className="guild-empty">No idle heroes — end the turn to bring some home.</div>
      ) : (
        <>
          <label>Hero</label>
          <select className="guild-select" value={heroId} onChange={(e) => setHeroId(e.target.value)}>
            <option value="">— choose a hero —</option>
            {idleHeroes.map((h) => (
              <option key={h.id} value={h.id}>
                {HERO_CLASS_DEFS[h.stats.heroClass].icon} {h.name} (L{h.stats.level}, trust {h.trust})
              </option>
            ))}
          </select>

          <label>Quest destination</label>
          <select className="guild-select" value={destId} onChange={(e) => setDestId(e.target.value)}>
            <option value="">— choose a destination —</option>
            {quests.map(({ node, etaTurns }) => (
              <option key={node.id} value={node.id}>
                {node.name} · {node.questMonster ? monsterDef(node.questMonster).displayName : "?"} · ~
                {etaTurns} turns
              </option>
            ))}
          </select>

          <label>Field agent (optional)</label>
          <select className="guild-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">— no agent (hearsay only) —</option>
            {freeAgents.map((a) => (
              <option key={a.id} value={a.id}>
                🕵️ {a.name} (quality {a.quality})
              </option>
            ))}
          </select>

          <button className="btn btn-dispatch" disabled={!canDispatch} onClick={submit}>
            Send on assignment
          </button>
        </>
      )}
    </section>
  );
}
