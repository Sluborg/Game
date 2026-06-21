// Turns engine events into human log lines. Format mirrors the brief:
// "attacker > target, dmg (before>after hp)", with KILL/DOWN on a lethal blow.

import type { CombatEvent } from "../../game/battle";

export type LogTone = "normal" | "crit" | "kill" | "death" | "miss" | "victory" | "defeat";

export interface LogLine {
  text: string;
  tone: LogTone;
}

export type NameOf = (id: string) => string;

/** Returns a log line for events worth showing, or null to skip (swing/knockout). */
export function formatEvent(event: CombatEvent, nameOf: NameOf): LogLine | null {
  switch (event.kind) {
    case "hit": {
      const atk = nameOf(event.sourceId);
      const tgt = nameOf(event.targetId);
      const crit = event.crit ? "CRIT " : "";
      const after = event.lethal
        ? event.targetId === "hero"
          ? "DOWN"
          : "KILL"
        : `${event.hpAfter}`;
      return {
        text: `${atk} → ${tgt}, ${crit}${event.amount} dmg (${event.hpBefore}→${after})`,
        tone: event.lethal ? (event.targetId === "hero" ? "death" : "kill") : event.crit ? "crit" : "normal",
      };
    }
    case "miss":
      return { text: `${nameOf(event.sourceId)} ⤬ ${nameOf(event.targetId)}, miss`, tone: "miss" };
    case "end":
      return event.result === "victory"
        ? { text: "▶ Victory — the field is cleared.", tone: "victory" }
        : { text: "▶ Defeat — the hero has fallen.", tone: "defeat" };
    default:
      return null;
  }
}
