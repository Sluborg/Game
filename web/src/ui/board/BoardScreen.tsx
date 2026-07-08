// BoardScreen — the Guild tab: the board where the priced decision lives. Each
// posted quest is a card (reward + challenge-dot signature + cut stepper + a
// collapsed "who's interested" line). A pinned treasury chip shows gold + runway;
// parties out on quests show a per-day progress chip so a mid-quest day is never
// blank; the End Day button runs the tick behind a short night beat and lands the
// player in the Report. Information hierarchy is declared for 430px (Review #1 R11):
// reward + cut stepper are primary; dots are a compact tap-to-inspect row; per-party
// appetite is collapsed behind one line.

import { useState } from "react";
import { Panel } from "../kit";
import { useGuild } from "../guild/GuildContext";
import {
  QUEST_BY_ID,
  PARTY_DATA,
  PARTY_BY_ID,
  challengeDots,
  appetiteFor,
  partyEligible,
  canRevise,
  type GuildState,
  type Posting,
  type BeatType,
} from "../../game/guild";
import styles from "./BoardScreen.module.css";

const DOT_META: { key: BeatType; label: string }[] = [
  { key: "investigation", label: "Investigation" },
  { key: "travel", label: "Travel" },
  { key: "social", label: "Social" },
  { key: "combat", label: "Combat" },
];

export function BoardScreen() {
  const { state, revise, end, unread } = useGuild();
  const [night, setNight] = useState(false);

  const runNight = () => {
    setNight(true);
    // A short night beat, then run the pure tick and land in the Report.
    window.setTimeout(() => {
      end();
      setNight(false);
      window.location.hash = "/report";
    }, 750);
  };

  const outParties = state.parties.filter((p) => p.assignment);

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <div className={styles.dayblock}>
          <h1 className={styles.title}>Guild Board</h1>
          <span className={styles.day}>Day {state.day}</span>
        </div>
        <Treasury state={state} />
      </header>

      {state.firstDay && (
        <p className={styles.coach}>
          Set your cut on each quest, then <strong>End Day</strong> and watch who bites. Reading who takes
          what — and at what cut — is the whole game.
        </p>
      )}

      {outParties.length > 0 && (
        <section className={styles.outStrip} aria-label="Parties out on quests">
          {outParties.map((p) => {
            const a = p.assignment!;
            const dayOf = state.day - a.dispatchedDay + 1;
            return (
              <span key={p.id} className={styles.outChip}>
                <strong>{PARTY_BY_ID[p.id]?.name}</strong> · {a.questTitle} · day {dayOf} of {a.durationDays}
              </span>
            );
          })}
        </section>
      )}

      <section className={styles.board} aria-label="Quest board">
        {state.board
          .slice()
          .sort((a, b) => a.tier.localeCompare(b.tier))
          .map((posting) => (
            <QuestCard key={posting.id} posting={posting} state={state} onRevise={revise} />
          ))}
      </section>

      <div className={styles.endBar}>
        <button type="button" className={styles.endBtn} onClick={runNight} disabled={night}>
          {night ? "Night falls…" : "End Day"}
        </button>
        {unread > 0 && <span className={styles.unread}>{unread} unread in Report</span>}
      </div>

      {night && <div className={styles.nightVeil} aria-hidden />}
    </div>
  );
}

function Treasury({ state }: { state: GuildState }) {
  // Runway mirrors the last ledger's note when present; otherwise a neutral read.
  const lastLedger = state.mail.find((m) => m.kind === "ledger");
  return (
    <div className={styles.treasury} aria-label={`Treasury ${state.gold} gold`}>
      <span className={styles.gold}>{state.gold}g</span>
      <span className={styles.runway}>{lastLedger?.runwayNote ?? "A fresh ledger opens."}</span>
    </div>
  );
}

function QuestCard({
  posting,
  state,
  onRevise,
}: {
  posting: Posting;
  state: GuildState;
  onRevise: (id: string, cut: number) => void;
}) {
  const [showDots, setShowDots] = useState(false);
  const [showWho, setShowWho] = useState(false);
  const quest = QUEST_BY_ID[posting.tier];
  const dots = challengeDots(quest);
  const perDay = Math.round((quest.dailyRate * posting.cutPct) / 100);
  const revisable = canRevise(posting, state.day);

  // Idle, eligible parties and their projected appetite at the current cut.
  const interested = PARTY_DATA.filter((p) => {
    const rt = state.parties.find((x) => x.id === p.id);
    return rt && !rt.assignment && partyEligible(p.id, posting.tier);
  }).map((p) => ({
    name: p.name,
    appetite: appetiteFor(state.knowledge[`${p.id}:${posting.tier}`], posting.cutPct),
  }));

  const step = (delta: number) => onRevise(posting.id, posting.cutPct + delta);

  return (
    <Panel as="article" className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.qtitle}>{posting.title}</h2>
        <span className={styles.giver}>from {posting.giver}</span>
      </div>

      {/* PRIMARY: reward + the cut stepper */}
      <div className={styles.reward}>
        <span className={styles.rewardMain}>{quest.dailyRate}g/day</span>
        <span className={styles.rewardSub}>
          {quest.minDuration}–{quest.maxDuration} days · you keep ~{perDay}g/day at {posting.cutPct}%
        </span>
      </div>

      <div className={styles.cut}>
        <div className={styles.stepper}>
          <button type="button" onClick={() => step(-10)} disabled={!revisable || posting.cutPct <= 20} aria-label="Cut −10">−10</button>
          <button type="button" onClick={() => step(-5)} disabled={!revisable || posting.cutPct <= 20} aria-label="Cut −5">−5</button>
          <span className={styles.cutVal}>{posting.cutPct}%</span>
          <button type="button" onClick={() => step(5)} disabled={!revisable || posting.cutPct >= 40} aria-label="Cut +5">+5</button>
          <button type="button" onClick={() => step(10)} disabled={!revisable || posting.cutPct >= 40} aria-label="Cut +10">+10</button>
        </div>
        <span className={styles.cutNote}>{revisable ? "your cut of the reward" : "cut set for today"}</span>
      </div>

      {/* SECONDARY: challenge dots (tap for names) */}
      <button type="button" className={styles.dotRow} onClick={() => setShowDots((v) => !v)} aria-expanded={showDots} aria-label="Challenge signature — tap for detail">
        {DOT_META.map(({ key }) => (
          <span key={key} className={styles.dotGroup} data-type={key}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={styles.dot} data-on={i < dots[key]} />
            ))}
          </span>
        ))}
        <span className={styles.dotHint} aria-hidden>{showDots ? "▾" : "challenge ›"}</span>
      </button>
      {showDots && (
        <ul className={styles.dotLegend}>
          {DOT_META.map(({ key, label }) => (
            <li key={key}><span className={styles.dotGroup} data-type={key}>{Array.from({ length: 3 }, (_, i) => <span key={i} className={styles.dot} data-on={i < dots[key]} />)}</span>{label}</li>
          ))}
        </ul>
      )}

      {/* SECONDARY: interested parties, collapsed to one line */}
      {interested.length > 0 && (
        <>
          <button type="button" className={styles.whoLine} onClick={() => setShowWho((v) => !v)} aria-expanded={showWho}>
            Who's interested? <span aria-hidden>{showWho ? "▾" : "›"}</span>
          </button>
          {showWho && (
            <ul className={styles.who}>
              {interested.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <span className={styles.appetite} data-appetite={p.appetite}>{p.appetite}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
