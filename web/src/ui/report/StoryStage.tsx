// StoryStage — the animated story (§4). A SINGLE fixed-viewport panel that swaps
// ONE beat at a time. Each beat now resolves on screen as a CHECK METER: a
// 5-zone track (the grades' own score zones) whose fill rises at a constant
// RATE — duration scales with the score, so the stop point stays unknown until
// it lands (Review #1 Designer B1). The card is staged: type/location → the
// rise → the grade tag pops → narration + trait fade in (the per-grade prose
// must not spoil the bar — Designer B2). A tap during the rise SNAPS to the
// result; only a tap after landing advances (PX B2). Speed (Slow/Normal/Fast)
// is one cycling chip, persisted as a UI-only pref. The final card reveals the
// outcome + the guild's brokerage — the payoff the sealed envelope withheld.

import { useEffect, useMemo, useState } from "react";
import { GRADE_ZONES, type AdventureLog, type Beat, type BeatType, type Grade } from "../../game/guild";
import {
  GRADE_LABEL,
  effectNote,
  FILL_BASE_MS,
  FILL_DELAY_MS,
  HOLD_MS,
  readStorySpeed,
  saveStorySpeed,
  SPEED_LABEL,
  SPEED_ORDER,
  type StorySpeed,
} from "./storyText";
import styles from "./StoryStage.module.css";

const TYPE_LABEL: Record<BeatType, string> = {
  investigation: "Investigation",
  travel: "Travel",
  social: "Social",
  combat: "Combat",
};

const ZONE_ORDER: Grade[] = ["fail", "poor", "ok", "good", "crit"];

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
  const [speed, setSpeed] = useState<StorySpeed>(() => readStorySpeed());
  // Has the current beat's meter landed? Resets per beat; a tap during the
  // rise sets it early (snap). Gates narration AND advancing.
  const [landed, setLanded] = useState(false);
  const atEnd = index >= log.beats.length;

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const advance = () => {
    setLanded(false);
    setIndex((i) => Math.min(i + 1, log.beats.length));
  };

  // Auto counts its hold from fill-END (landed), never from card mount — so
  // Auto+Slow can't advance mid-rise (PX B2).
  useEffect(() => {
    if (!auto || atEnd || !(landed || reducedMotion)) return;
    const t = window.setTimeout(advance, HOLD_MS[speed]);
    return () => window.clearTimeout(t);
  }, [auto, landed, atEnd, speed, index, reducedMotion]);

  const cycleSpeed = () => {
    const next = SPEED_ORDER[(SPEED_ORDER.indexOf(speed) + 1) % SPEED_ORDER.length];
    setSpeed(next);
    saveStorySpeed(next);
  };

  const shown = landed || reducedMotion;

  const stageTap = () => {
    if (atEnd) return;
    if (!shown) setLanded(true); // snap the rise to its result
    else advance();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${questTitle} — the story`}>
      <header className={styles.head}>
        <div>
          <div className={styles.party}>{partyName}</div>
          <div className={styles.quest}>{questTitle}</div>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close story">✕</button>
      </header>

      <div className={styles.stage} onClick={atEnd ? undefined : stageTap}>
        {!atEnd ? (
          <>
            <BeatCard
              key={index}
              beat={log.beats[index]}
              hasNext={index < log.beats.length - 1}
              landed={shown}
              onLanded={() => setLanded(true)}
              speed={speed}
            />
            {index === 0 && <span className={styles.tapHint} aria-hidden>{shown ? "tap to continue" : "tap to skip the rise"}</span>}
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
          <button type="button" className={styles.speed} onClick={cycleSpeed} aria-label={`Story speed: ${SPEED_LABEL[speed]} — tap to change`}>
            {SPEED_LABEL[speed]}
          </button>
          <button type="button" className={styles.toggle} onClick={() => setAuto((a) => !a)} disabled={atEnd}>
            {auto ? "Pause" : "Play"}
          </button>
          {!atEnd ? (
            // Same gate as the stage: mid-rise it SNAPS, only a landed press
            // advances — the biggest button must not skip the reveal (R#2 Designer).
            <button type="button" className={styles.next} onClick={() => (shown ? advance() : setLanded(true))}>
              {/* Label follows the handler: mid-rise it SNAPS on every beat —
                  including the last (Codex P3 on PR #37). */}
              {!shown ? "Skip the rise" : index === log.beats.length - 1 ? "See outcome ›" : "Next ›"}
            </button>
          ) : (
            <button type="button" className={styles.next} onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

function BeatCard({
  beat,
  hasNext,
  landed,
  onLanded,
  speed,
}: {
  beat: Beat;
  hasNext: boolean;
  landed: boolean;
  onLanded: () => void;
  speed: StorySpeed;
}) {
  // Constant RATE: a score-90 rise takes ~3× a score-30 rise, so the landing
  // point can't be read off the pace (Review #1 Designer B1).
  const durationMs = Math.max(120, Math.round((beat.score / 100) * FILL_BASE_MS[speed]));
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFilling(true), FILL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Fallback landing: a score-0 beat never changes width, so transitionend
  // never fires — without this, the card soft-locks and Auto stalls (real:
  // ~4.4% of quests contain one, Review #2 Adversary). Timed to when the
  // transition would end; transitionend landing first makes this a no-op.
  useEffect(() => {
    if (landed) return;
    const t = window.setTimeout(onLanded, FILL_DELAY_MS + durationMs + 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed]);

  const note = effectNote(beat, hasNext);
  const width = landed || filling ? beat.score : 0;

  return (
    <article className={styles.beat}>
      {beat.branch && (
        <div className={styles.branch} data-branch={beat.branch}>
          {beat.branch === "recovery" ? "Forced path — one chance to save it" : "Bonus — an opening"}
        </div>
      )}
      <div className={styles.beatTop}>
        <span className={styles.beatType} data-type={beat.type}>{TYPE_LABEL[beat.type]}</span>
        <span className={styles.beatLoc}>{beat.location}</span>
      </div>

      <div
        className={styles.meter}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={landed ? beat.score : 0}
        aria-valuetext={landed ? `${GRADE_LABEL[beat.grade]} — ${beat.score} of 100` : "rolling…"}
      >
        <div className={styles.zones} aria-hidden>
          {ZONE_ORDER.map((g) => (
            <span
              key={g}
              className={styles.zone}
              data-grade={g}
              style={{ width: `${GRADE_ZONES[g][1] - GRADE_ZONES[g][0]}%` }}
            />
          ))}
        </div>
        <div
          className={styles.fill}
          aria-hidden
          style={{ width: `${width}%`, transition: landed ? "none" : `width ${durationMs}ms linear` }}
          onTransitionEnd={onLanded}
        />
      </div>

      {landed && (
        <div className={styles.landing}>
          <span className={styles.rollGrade} data-grade={beat.grade}>{GRADE_LABEL[beat.grade]}</span>
          {note && <span className={styles.effect}>{note}</span>}
        </div>
      )}

      {landed && (
        <div className={styles.prose}>
          <p className={styles.beatText}>{beat.text}</p>
          {beat.traitBlurb && <p className={styles.trait}>{beat.traitBlurb}</p>}
        </div>
      )}
    </article>
  );
}
