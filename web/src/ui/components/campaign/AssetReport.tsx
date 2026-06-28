// The Asset Report — the turn report shown at the start of each turn. Lists every
// agent result, grouped (by action type by default; toggle to area or agent). Styled
// after the kingdom BattleLog. Empty on turn 1.

import { useState } from "react";
import { ACTION_DEFS } from "../../../game/campaign/data";
import { groupReport, type GroupBy } from "../../../game/campaign/engine";
import type { CampaignState } from "../../../game/campaign/types";
import { reportColor } from "./danger";
import { Icon } from "./icons";

interface Props {
  state: CampaignState;
}

const TOGGLES: { key: GroupBy; label: string }[] = [
  { key: "action", label: "Action" },
  { key: "area", label: "Area" },
  { key: "agent", label: "Agent" },
];

export function AssetReport({ state }: Props) {
  const [by, setBy] = useState<GroupBy>("action");
  const report = state.lastReport;
  const groups = groupReport(report, by, state);

  return (
    <div className="report">
      <div className="report-head">
        <span className="report-title">📜 Asset Report — Turn {state.turn}</span>
        <span className="report-toggle">
          {TOGGLES.map((t) => (
            <button
              key={t.key}
              className={`btn btn-toggle${by === t.key ? " active" : ""}`}
              onClick={() => setBy(t.key)}
            >
              {t.label}
            </button>
          ))}
        </span>
      </div>

      {report.length === 0 ? (
        <div className="report-empty">No reports yet. Give your agents orders, then End Turn.</div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="report-group">
            <div className="report-group-title">
              {by === "action" && <Icon name={ACTION_DEFS[group.key as keyof typeof ACTION_DEFS]?.icon ?? "quests"} size={14} />}
              <span>{group.label}</span>
            </div>
            {group.entries.map((entry) => (
              <div key={entry.id} className="report-line" style={{ color: reportColor(entry.kind) }}>
                {entry.text}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
