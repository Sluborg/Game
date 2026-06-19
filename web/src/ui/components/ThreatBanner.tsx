// Active monster threats. Port of MonsterThreatBanner.kt — shown only when at
// least one threat is alive, with a per-group HP bar.

import { monsterDef } from "../../game/monsters";
import type { GameState } from "../../game/types";

interface Props {
  state: GameState;
}

export function ThreatBanner({ state }: Props) {
  if (state.monsterGroups.length === 0) return null;
  return (
    <div className="threat">
      <div className="threat-title">⚠️ Monsters Attacking!</div>
      {state.monsterGroups.map((g) => {
        const def = monsterDef(g.type);
        const pct = Math.max(0, Math.min(1, g.hp / g.maxHp));
        return (
          <div key={g.id} className="threat-row">
            <span>
              {def.icon} {def.displayName} x{g.count}
            </span>
            <div className="bar bar-threat">
              <div className="bar-fill" style={{ width: `${pct * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
