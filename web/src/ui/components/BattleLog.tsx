// Battle / event log. Port of BattleLog.kt — newest first, color-coded by
// keyword, fading with age.

import type { GameState } from "../../game/types";
import { logColor } from "../theme";

interface Props {
  state: GameState;
}

export function BattleLog({ state }: Props) {
  return (
    <div className="battlelog">
      <div className="battlelog-title">📜 Battle Log</div>
      {state.battleLog.map((line, i) => (
        <div
          key={`${i}-${line}`}
          className="battlelog-line"
          style={{ color: logColor(line), opacity: Math.max(0.4, 1 - i * 0.1) }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
