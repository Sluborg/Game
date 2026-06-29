// Dispatch screen — pick a hero, a quest destination (via the World Map or this
// dropdown), and optionally an agent. Controlled by GuildApp so the map and the
// dropdown stay in sync on the same `destId`.

import { useMemo } from "react";
import { HERO_CLASS_DEFS } from "../../game/heroes";
import { monsterDef } from "../../game/monsters";
import { isAgentAvailable, isHeroAvailable, type GuildState } from "../../game/guild/state";
import { nodeById, questDestinations } from "../../game/guild/selectors";
import type { NodeId } from "../../game/guild/types";

export function DispatchForm({
  state,
  heroId,
  destId,
  agentId,
  onHero,
  onDest,
  onAgent,
  onDispatch,
}: {
  state: GuildState;
  heroId: string;
  destId: string;
  agentId: string;
  onHero: (id: string) => void;
  onDest: (id: NodeId | "") => void;
  onAgent: (id: string) => void;
  onDispatch: (heroId: string, destNodeId: NodeId, agentId: string | null) => void;
}) {
  const idleHeroes = state.heroes.filter((h) => isHeroAvailable(state, h.id));
  const freeAgents = state.agents.filter((a) => a.alive && isAgentAvailable(state, a.id));
  const quests = useMemo(() => questDestinations(state), [state]);

  const canDispatch = Boolean(heroId && destId);
  const destNode = destId ? nodeById(state, destId) : undefined;

  const submit = () => {
    if (!canDispatch) return;
    onDispatch(heroId, destId, agentId || null);
  };

  return (
    <section className="guild-form">
      <div className="guild-section-title">Dispatch</div>
      {idleHeroes.length === 0 ? (
        <div className="guild-empty">No idle heroes — end the turn to bring some home.</div>
      ) : (
        <>
          <label>Hero</label>
          <select className="guild-select" value={heroId} onChange={(e) => onHero(e.target.value)}>
            <option value="">— choose a hero —</option>
            {idleHeroes.map((h) => (
              <option key={h.id} value={h.id}>
                {HERO_CLASS_DEFS[h.stats.heroClass].icon} {h.name} (L{h.stats.level}, trust {h.trust})
              </option>
            ))}
          </select>

          <label>
            Quest destination {destNode ? `— ${destNode.name}` : "(or tap a glowing site on the map)"}
          </label>
          <select className="guild-select" value={destId} onChange={(e) => onDest(e.target.value)}>
            <option value="">— choose a destination —</option>
            {quests.map(({ node, etaTurns }) => (
              <option key={node.id} value={node.id}>
                {node.name} · {node.questMonster ? monsterDef(node.questMonster).displayName : "?"} · ~
                {etaTurns} turns
              </option>
            ))}
          </select>

          <label>Field agent (optional)</label>
          <select className="guild-select" value={agentId} onChange={(e) => onAgent(e.target.value)}>
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
