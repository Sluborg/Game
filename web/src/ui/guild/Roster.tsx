// Roster screen — heroes (with trust + HP) and field agents (with quality).

import { HERO_CLASS_DEFS } from "../../game/heroes";
import { isAgentAvailable, isHeroAvailable, type GuildState } from "../../game/guild/state";

function pct(n: number, of: number): string {
  return `${Math.max(0, Math.min(100, Math.round((n / of) * 100)))}%`;
}

export function Roster({ state }: { state: GuildState }) {
  return (
    <section className="guild-roster">
      <div className="guild-section-title">Heroes</div>
      {state.heroes.map((h) => {
        const def = HERO_CLASS_DEFS[h.stats.heroClass];
        const busy = !isHeroAvailable(state, h.id);
        return (
          <div className="roster-card" key={h.id}>
            <span className="roster-emoji">{def.icon}</span>
            <div className="roster-main">
              <div className="roster-name">
                {h.name} <span className="roster-sub">· {def.displayName} L{h.stats.level}</span>
                {busy && <span className="roster-sub roster-busy"> · on assignment</span>}
              </div>
              <div className="meter-label">
                HP {h.stats.hp}/{h.stats.maxHp}
              </div>
              <div className="meter">
                <div className="meter-fill meter-hp" style={{ width: pct(h.stats.hp, h.stats.maxHp) }} />
              </div>
              <div className="meter-label">Trust {h.trust}</div>
              <div className="meter">
                <div className="meter-fill meter-trust" style={{ width: pct(h.trust, 100) }} />
              </div>
            </div>
          </div>
        );
      })}

      <div className="guild-section-title">Field Agents</div>
      {state.agents.map((a) => {
        const busy = a.alive && !isAgentAvailable(state, a.id);
        return (
          <div className="roster-card" key={a.id}>
            <span className="roster-emoji">{a.alive ? "🕵️" : "⚰️"}</span>
            <div className="roster-main">
              <div className={`roster-name ${a.alive ? "" : "roster-dead"}`}>
                {a.name}
                {a.alive && busy && <span className="roster-sub roster-busy"> · embedded</span>}
                {!a.alive && <span className="roster-sub roster-dead"> · lost</span>}
              </div>
              <div className="meter-label">Quality {a.quality}</div>
              <div className="meter">
                <div className="meter-fill meter-quality" style={{ width: pct(a.quality, 100) }} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
