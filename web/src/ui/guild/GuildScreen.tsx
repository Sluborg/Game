// The Guild board — Slice 1's playable loop (behind #/guild). Set your cut on
// each posting, read the party's take-appetite, End Day, and read the report mail
// (gold delta, runway, why-no-takers) as the §8/§12 cash clock bites. All rules
// live in game/world/; this screen only renders state and dispatches actions.

import { useEffect, useRef, useState } from "react";
import { Button, Panel } from "../kit";
import {
  APPETITE_LABEL,
  ECONOMY,
  appetiteAt,
  type Appetite,
  type DayReport,
  type Hero,
  type MailLine,
  type Quest,
  type QuestTier,
  type WorldState,
} from "../../game/world";
import { useGuildState } from "./useGuildState";
import styles from "./GuildScreen.module.css";

const g = (n: number) => `${n >= 0 ? "" : "−"}${Math.abs(n)}g`;
const takeOf = (q: Quest) => Math.round((q.reward * q.cut) / 100);

export function GuildScreen() {
  const { state, adjustCut, endDay, startNewRun } = useGuildState();
  // Bring the report into view when a new one lands — otherwise the End Day
  // payoff (gold delta headline) is below the fold and reads as "nothing happened".
  const reportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.lastReport && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state.lastReport]);
  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <span className={styles.heading}>The Guild</span>
        <Treasury state={state} />
      </header>

      <div className={styles.body}>
        <PartyStrip state={state} />

        {state.status === "revoked" ? (
          <Panel as="section" className={styles.revoked} aria-live="polite">
            <h2 className={styles.revokedTitle}>Charter revoked</h2>
            <p className={styles.revokedText}>
              Five days insolvent. The council struck your guild from the rolls. There is nothing left to run.
            </p>
            <Button onClick={startNewRun}>Start a new guild</Button>
          </Panel>
        ) : (
          <>
            <section className={styles.board} aria-label="Quest board">
              {state.quests.map((q) => (
                <Posting key={q.id} quest={q} party={state.party} onAdjust={adjustCut} />
              ))}
            </section>

            <div className={styles.endDay}>
              <Button onClick={endDay}>End Day {state.day} ▸</Button>
              <button type="button" className={styles.reset} onClick={startNewRun}>
                New run
              </button>
            </div>
          </>
        )}

        {state.lastReport && (
          <div ref={reportRef}>
            <Report report={state.lastReport} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Treasury chip (pinned) ----------------------------------------------

function Treasury({ state }: { state: WorldState }) {
  const r = state.lastReport;
  const burnLine = !r
    ? "End a day to see your burn"
    : r.runwayDaysAfter === null
      ? `growing ${g(r.netPerDay)}/day`
      : `${g(r.netPerDay)}/day · runway ~${r.runwayDaysAfter}d`;
  return (
    <div className={styles.treasury} aria-label={`Treasury ${state.gold} gold`}>
      <span className={styles.gold}>{state.gold}g</span>
      <span className={styles.burn}>{burnLine}</span>
      {(state.loan.active || state.insolventStreak > 0) && (
        <span className={styles.debt} title="Consecutive insolvent days; 5 revokes the charter">
          {state.loan.active ? "loan owed · " : ""}insolvent {state.insolventStreak}/{ECONOMY.insolvencyLimit}
        </span>
      )}
    </div>
  );
}

// ---- The party (rendered ONCE, not per posting) --------------------------

function PartyStrip({ state }: { state: WorldState }) {
  const heroes = state.party.heroIds
    .map((id) => state.heroes.find((h) => h.id === id))
    .filter((h): h is Hero => Boolean(h));
  const out = state.party.out;
  return (
    <Panel as="section" className={styles.party} aria-label={`Party ${state.party.name}`}>
      <div className={styles.partyHead}>
        <span className={styles.partyName}>{state.party.name}</span>
        <span className={styles.partyWhere}>
          {out ? `On the ${out.questId} job · back day ${out.returnsOnDay}` : "At the hall"}
        </span>
      </div>
      <div className={styles.heroes}>
        {heroes.map((h) => (
          <div key={h.id} className={styles.hero}>
            <div className={styles.heroName}>
              {h.name} <span className={styles.heroArch}>{h.archetype}</span>
            </div>
            <div className={styles.cvs}>
              {h.cvs.map((cv) => (
                <span
                  key={cv.label}
                  className={styles.cv}
                  data-certainty={cv.certainty}
                  title={`${cv.label} ${cv.value} — ${cv.certainty}`}
                >
                  <span className={styles.cvLabel}>{cv.label}</span>
                  <span className={styles.cvValue}>{cv.certainty === "rumor" ? `${cv.value}?` : cv.value}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.legend} aria-hidden>
        <span data-swatch="verified" /> verified
        <span data-swatch="claimed" /> claimed
        <span data-swatch="rumor" /> rumor
      </div>
    </Panel>
  );
}

// ---- A quest posting ------------------------------------------------------

const APPETITE_HINT: Record<Appetite, string> = {
  unknown: "You haven't seen how they price this split yet.",
  eager: "You've seen them take a cut this big — they'll bite.",
  "might-pass": "Right on the edge of what you've seen them accept.",
  "wont-bite": "You've seen them refuse a split this thin.",
};

function Posting({
  quest,
  party,
  onAdjust,
}: {
  quest: Quest;
  party: WorldState["party"];
  onAdjust: (id: QuestTier, delta: number) => void;
}) {
  const onThisJob = party.out?.questId === quest.id;
  const appetite = appetiteAt(quest, quest.cut);
  return (
    <Panel as="article" className={styles.posting} data-tier={quest.id}>
      <div className={styles.postingHead}>
        <div>
          <h3 className={styles.postingTitle}>{quest.title}</h3>
          <p className={styles.giver}>
            {quest.giver} · reward {quest.reward}g
            {quest.failCount > 0 && <span className={styles.failFlag}> · failed once</span>}
          </p>
        </div>
        <span className={styles.tierBadge} data-tier={quest.id}>
          {quest.id === "road" ? "Survival" : "Growth"}
        </span>
      </div>

      {onThisJob ? (
        <p className={styles.onJob}>{party.name} is out on this job — back tomorrow.</p>
      ) : !quest.onBoard ? (
        <p className={styles.onJob}>Off the board.</p>
      ) : (
        <>
          <div className={styles.cutRow}>
            <div className={styles.cutBlock}>
              <span className={styles.cutLabel}>Your cut</span>
              <span className={styles.cutValue}>{quest.cut}%</span>
              <span className={styles.cutTake}>you take {takeOf(quest)}g · heroes get {quest.reward - takeOf(quest)}g</span>
            </div>
            <div className={styles.cutButtons} role="group" aria-label={`Adjust cut for ${quest.title}`}>
              {[-10, -5, 5, 10].map((d) => {
                const next = quest.cut + d;
                const disabled = next < ECONOMY.cutMin || next > ECONOMY.cutMax;
                return (
                  <button
                    key={d}
                    type="button"
                    className={styles.cutBtn}
                    disabled={disabled}
                    onClick={() => onAdjust(quest.id, d)}
                    aria-label={`${d > 0 ? "raise" : "lower"} cut ${Math.abs(d)} points`}
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.appetiteRow}>
            <span className={styles.appetiteLabel}>Their take on this split:</span>
            <span className={styles.appetite} data-appetite={appetite}>
              {APPETITE_LABEL[appetite]}
            </span>
          </div>
          <p className={styles.appetiteHint}>{APPETITE_HINT[appetite]}</p>
          <p className={styles.cutHint}>Applies to tonight — adjustable until you End Day.</p>
        </>
      )}
    </Panel>
  );
}

// ---- The end-day report mail ---------------------------------------------

function Report({ report }: { report: DayReport }) {
  const [open, setOpen] = useState(false);
  const delta = report.goldAfter - report.goldBefore;
  return (
    <Panel as="section" className={styles.report} aria-label={`Day ${report.day} report`}>
      <div className={styles.reportHead}>
        <span className={styles.reportDay}>Day {report.day} · the ledger</span>
        <span className={styles.reportDelta} data-sign={delta >= 0 ? "up" : "down"}>
          {report.goldBefore}g → {report.goldAfter}g ({g(delta)})
        </span>
      </div>
      <p className={styles.reportRunway}>
        {report.runwayDaysAfter === null
          ? `Treasury growing ${g(report.netPerDay)}/day.`
          : `Gold lasts ~${report.runwayDaysAfter} days at this burn (${g(report.netPerDay)}/day).`}
      </p>

      <ul className={styles.mail}>
        {report.mail.map((m, i) => (
          <li key={i} className={styles.mailLine} data-kind={mailKind(m)}>
            {mailText(m)}
          </li>
        ))}
        {report.mail.length === 0 && <li className={styles.mailLine}>A quiet day at the hall.</li>}
      </ul>

      <button type="button" className={styles.ledgerToggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide" : "Show"} itemized ledger ({report.ledger.length})
      </button>
      {open && (
        <ul className={styles.ledger}>
          {report.ledger.map((l, i) => (
            <li key={i} className={styles.ledgerLine}>
              <span>{l.label}</span>
              <span data-sign={l.amount >= 0 ? "up" : "down"}>{g(l.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function mailKind(m: MailLine): string {
  return m.kind === "outcome" ? (m.success ? "good" : "bad") : m.kind === "accepted" || m.kind === "repaid" ? "good" : m.kind === "revoked" || m.kind === "loan" ? "bad" : "info";
}

function mailText(m: MailLine): string {
  switch (m.kind) {
    case "accepted":
      return `Accepted: ${m.questTitle} — the party works for a ${m.share}% share (your ${m.cut}%).`;
    case "outcome":
      return m.text;
    case "no-takers":
      return m.text;
    case "expired":
      return m.text;
    case "reveal":
      return m.text;
    case "loan":
      return m.text;
    case "repaid":
      return m.text;
    case "revoked":
      return m.text;
  }
}
