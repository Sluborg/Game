// Milestone chips. Port of MilestonePanel.kt — a horizontal row of chips, gold
// when complete, muted otherwise.

import { evaluateMilestones } from "../../game/milestones";
import type { GameState } from "../../game/types";

interface Props {
  state: GameState;
}

export function Milestones({ state }: Props) {
  const milestones = evaluateMilestones(state);
  return (
    <div className="milestones">
      {milestones.map((m) => (
        <div
          key={m.id}
          className={`chip ${m.isCompleted ? "chip-done" : ""}`}
          title={m.description}
        >
          {m.isCompleted ? `✓ ${m.title}` : `${m.title} · ${m.goldReward}g`}
        </div>
      ))}
    </div>
  );
}
