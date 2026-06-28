// Turn Report screen — the PresentedReports filed this turn, rendered as
// paperwork. A hidden/debug "Reveal truth" toggle shows the ground-truth
// CombatOutcome next to each report (and flags any discrepancy).

import { latestReportTurn, reportsForTurn, type ReportRow } from "../../game/guild/selectors";
import type { GuildState } from "../../game/guild/state";

const TIER_LABEL: Record<number, string> = {
  0: "tier 0 · no witness",
  1: "tier 1 · hearsay",
  2: "tier 2 · eyewitness",
  3: "tier 3 · embedded",
  4: "tier 4 · compromised",
};

function TruthPanel({ row }: { row: ReportRow }) {
  const t = row.event.truth;
  const p = row.event.presented;
  const mismatch =
    p != null &&
    (p.claimedDefeated !== t.threatDefeated ||
      p.claimedGold !== t.goldEarned ||
      p.silent);
  return (
    <div className="truth">
      <div>
        <span className="truth-stamp">GROUND TRUTH</span>
        {mismatch && <span className="truth-mismatch"> · report is inaccurate</span>}
      </div>
      <div>
        Outcome: {t.threatDefeated ? "victory" : "defeat"} · {t.goldEarned}g · {t.monstersKilled} slain
      </div>
      {t.events.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

function ReportCard({ row, reveal }: { row: ReportRow; reveal: boolean }) {
  const p = row.event.presented;
  const where = row.event.nodeId;
  const kind = row.event.kind === "quest" ? "Quest" : "Road";

  if (!p) {
    // Should not happen in the live game (reporter always runs), but be safe.
    return (
      <div className="report">
        <div className="report-headline">
          {row.event.truth.threatDefeated ? "Engagement won." : "Engagement lost."}
        </div>
      </div>
    );
  }

  return (
    <div className={`report ${p.silent ? "report-silent" : ""}`}>
      <div className="report-head">
        <span className="report-headline">{p.headline}</span>
        {reveal && <span className="report-tier">{TIER_LABEL[p.tier]}</span>}
      </div>
      <div className="report-who">
        {kind} · {where} · {row.hero?.name ?? "unknown"}
        {row.dispatch.agentId ? " · agent embedded" : " · no agent"}
      </div>
      {p.lines.length > 0 && (
        <ul className="report-lines">
          {p.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {!p.silent && (
        <div className="report-claim">
          Reported: {p.claimedDefeated ? "victory" : "no win"}
          {p.claimedDefeated ? ` · ${p.claimedGold}g · ${p.claimedKills} slain` : ""}
        </div>
      )}
      {reveal && <TruthPanel row={row} />}
    </div>
  );
}

export function TurnReport({
  state,
  reveal,
  onToggleReveal,
}: {
  state: GuildState;
  reveal: boolean;
  onToggleReveal: (v: boolean) => void;
}) {
  // Show the most recent turn that actually produced filings, so news doesn't
  // vanish if the player ends a quiet turn after an arrival.
  const shownTurn = latestReportTurn(state);
  const rows = shownTurn > 0 ? reportsForTurn(state, shownTurn) : [];
  const stale = shownTurn > 0 && shownTurn < state.turn;
  return (
    <section className="guild-roster">
      <div className="guild-section-title">
        {shownTurn > 0 ? `Turn ${shownTurn} Report` : `Turn ${state.turn} Report`}
        {stale && <span className="guild-hint"> · latest filings</span>}
      </div>
      <label className="reveal-toggle">
        <input type="checkbox" checked={reveal} onChange={(e) => onToggleReveal(e.target.checked)} />
        Reveal truth (dev)
      </label>
      {rows.length === 0 ? (
        <div className="guild-empty">Dispatch a hero, then end the turn to receive reports.</div>
      ) : (
        rows.map((row, i) => <ReportCard key={i} row={row} reveal={reveal} />)
      )}
    </section>
  );
}
