// StoryStage — the animated story that replaces watchable combat in Slice 1 (§4).
// A SINGLE fixed-viewport panel that swaps ONE beat at a time on tap (NOT a
// horizontally-scrolling strip — "left-to-right" is only the per-beat slide-in).
// Progress dots + a play/auto toggle; challenge/roll grade is tinted distinctly;
// forced branches and trait cut-ins are called out. The final card reveals the
// outcome + the guild's take — the payoff the sealed envelope withheld.

import { useEffect, useState } from "react";
import type { AdventureLog, Beat, BeatType } from "../../game/guild";
import styles from "./StoryStage.module.css";

const TYPE_LABEL: Record<BeatType, string> = {
  investigation: "Investigation",
  travel: "Travel",
  social: "Social",
  combat: "Combat",
};

const GRADE_LABEL: Record<Beat["grade"], string> = {
  crit: "Triumph",
  good: "Good",
  ok: "Scraped by",
  poor: "Rough",
  fail: "Failed",
};

export function StoryStage({
  log,
  partyName,
  questTitle,
  onClose,
}: {
  log: AdventureLog;
  partyName: string;
  questTitle: string;
  onClose: () => void;
}) {
  // index in [0, beats.length]; the last index shows the outcome card.
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const atEnd = index >= log.beats.length;

  useEffect(() => {
    if (!auto || atEnd) return;
    const t = window.setTimeout(() => setIndex((i) => Math.min(i + 1, log.beats.length)), 1700);
    return () => window.clearTimeout(t);
  }, [auto, index, atEnd, log.beats.length]);

  const advance = () => setIndex((i) => Math.min(i + 1, log.beats.length));

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${questTitle} — the story`}>
      <header className={styles.head}>
        <div>
          <div className={styles.party}>{partyName}</div>
          <div className={styles.quest}>{questTitle}</div>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close story">✕</button>
      </header>

      <div className={styles.stage} onClick={atEnd ? undefined : advance}>
        {!atEnd ? (
          <>
            <BeatCard key={index} beat={log.beats[index]} />
            {index === 0 && <span className={styles.tapHint} aria-hidden>tap to continue</span>}
          </>
        ) : (
          <div className={styles.outcome} data-outcome={log.outcome}>
            <div className={styles.outcomeTag}>{log.outcome === "success" ? "Quest complete" : "Quest failed"}</div>
            <div className={styles.outcomeReward}>
              {log.outcome === "success" ? `Reward pool ${log.reward}g` : "No reward — they came back empty-handed."}
            </div>
            <div className={styles.outcomeCut}>
              {log.outcome === "success"
                ? `Your ${log.cutPct}% brokerage: +${log.guildCut}g — the heroes pocket the rest.`
                : `Your brokerage: +0g`}
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.dots} aria-hidden>
          {log.beats.map((_, i) => (
            <span key={i} className={styles.dot} data-on={i <= Math.min(index, log.beats.length - 1)} data-current={i === index} />
          ))}
          <span className={styles.dot} data-on={atEnd} data-current={atEnd} data-final />
        </div>
        <div className={styles.btns}>
          <button type="button" className={styles.toggle} onClick={() => setAuto((a) => !a)} disabled={atEnd}>
            {auto ? "Pause" : "Play"}
          </button>
          {!atEnd ? (
            <button type="button" className={styles.next} onClick={advance}>
              {index === log.beats.length - 1 ? "See outcome ›" : "Next ›"}
            </button>
          ) : (
            <button type="button" className={styles.next} onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

function BeatCard({ beat }: { beat: Beat }) {
  return (
    <article className={styles.beat}>
      {beat.branch && (
        <div className={styles.branch} data-branch={beat.branch}>
          {beat.branch === "recovery" ? "Forced path — it went wrong" : "Bonus — an opening"}
        </div>
      )}
      <div className={styles.beatTop}>
        <span className={styles.beatType} data-type={beat.type}>{TYPE_LABEL[beat.type]}</span>
        <span className={styles.beatLoc}>{beat.location}</span>
      </div>
      <p className={styles.beatText}>{beat.text}</p>
      {beat.traitBlurb && <p className={styles.trait}>{beat.traitBlurb}</p>}
      <div className={styles.roll} data-grade={beat.grade}>
        <span className={styles.rollLabel}>Check</span>
        <span className={styles.rollGrade}>{GRADE_LABEL[beat.grade]}</span>
      </div>
    </article>
  );
}
