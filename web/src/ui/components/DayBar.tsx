// Day counter + gold total + the "End Day" button. Replaces the idle GoldBar
// and CastleTapButton.

import { goldPerDayTotal } from "../../game/economy";
import type { GameState } from "../../game/types";
import { formatGold } from "../format";

interface Props {
  state: GameState;
  onEndDay: () => void;
}

export function DayBar({ state, onEndDay }: Props) {
  const income = goldPerDayTotal(state.buildings);
  return (
    <div className="daybar">
      <div className="daybar-info">
        <div className="daybar-day">📅 Day {state.day}</div>
        <div className="daybar-gold">💰 {formatGold(state.gold)}</div>
        <div className="daybar-income">+{income}g / day</div>
      </div>
      <button className="btn btn-end-day" onClick={onEndDay}>
        End Day ▶
      </button>
    </div>
  );
}
