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

import { useEffect, useMemo, useRef, useState } from "react";
import { GRADE_ZONES, type AdventureLog, type Beat, type BeatType, type Grade } from "../../game/guild";
import { Icon, PauseGlyph, PlayGlyph, SpeedChip } from "../kit";
import {
  GRADE_LABEL,
  effectNote,
  gradeAt,
  FILL_BASE_MS,
  FILL_DELAY_MS,
  HOLD_MS,
  readStorySpeed,
  saveStorySpeed,
  SPEED_ORDER,
  ZONE_ORDER,
  type StorySpeed,
} from "./storyText";
import styles from "./StoryStage.module.css";

const TYPE_LABEL: Record<BeatType, string> = {
  investigation: "Investigation",
  travel: "Travel",
  social: "Social",
  combat: "Combat",
};

/* Grade marks above the meter (Stefan: dashed lines at the limits, with
 * symbols per level). Broken hearts carry the bad end, award rosettes the
 * good — NEVER skulls, which already mean quest DIFFICULTY (Stefan). Sprite
 * size shrinks with count so three rosettes fit the ~34px crit zone at 375px
 * (Review #1 Adversary). */
const ZONE_MARK: Record<Grade, { icon: "heartBroken" | "award"; n: number }> = {
  fail: { icon: "heartBroken", n: 2 },
  poor: { icon: "heartBroken", n: 1 },
  ok: { icon: "award", n: 1 },
  good: { icon: "award", n: 2 },
  crit: { icon: "award", n: 3 },
};
const MARK_SIZE: Record<number, number> = { 1: 12, 2: 11, 3: 9 };

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
        <div className={styles.headBtns}>
          {/* Skip lives in the corner, AWAY from the meter — skipping must be
              deliberate, never a mis-tap that eats the reveal (Review #1 PX).
              It lands on the full outcome card, not past it. */}
          {!atEnd && (
            <button
              type="button"
              className={styles.skip}
              onClick={() => setIndex(log.beats.length)}
            >
              Skip to result »
            </button>
          )}
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close story">✕</button>
        </div>
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
            {/* Result is the star; the guild's cut lives in the nightly ledger
                (Stefan: no brokerage math at the payoff moment). */}
            <div className={styles.outcomeNote}>
              {log.outcome === "success" ? "Settled in tonight's ledger." : "Nothing to settle."}
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
          {/* Same control language as the Hall header (Stefan: "reuse
              symbolism, sizes etc.") — but ACTION labels: this is playback of
              a recorded past, not the world clock (Review #1 Designer). */}
          <SpeedChip speed={speed} onCycle={cycleSpeed} context="Report speed" />
          <button type="button" className={styles.toggle} onClick={() => setAuto((a) => !a)} disabled={atEnd}>
            {auto ? (
              <>
                <PauseGlyph /> Pause
              </>
            ) : (
              <>
                <PlayGlyph /> Play
              </>
            )}
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
  const fillRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  // The live grade readout under the rising bar (Stefan: "result should
  // follow progress underneath changing text when passing the thresholds").
  // It reads the RENDERED fill width each frame — never elapsed-time math —
  // so it can't desync from the bar (speed change mid-rise, background tab,
  // snap tap) or flash a grade above the landing (Review #1 Adversary).
  const [liveGrade, setLiveGrade] = useState<Grade>("fail");

  useEffect(() => {
    const t = window.setTimeout(() => setFilling(true), FILL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (landed) return; // the landed block takes over with the true grade
    let raf = 0;
    const tick = () => {
      const fill = fillRef.current;
      const meter = meterRef.current;
      if (fill && meter) {
        const track = meter.getBoundingClientRect().width;
        if (track > 0) setLiveGrade(gradeAt((fill.getBoundingClientRect().width / track) * 100));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [landed]);

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
      {/* Two rows (Stefan): the TYPE chip, then the challenge title prominent. */}
      <div className={styles.beatTop}>
        <span className={styles.beatType} data-type={beat.type}>{TYPE_LABEL[beat.type]}</span>
      </div>
      <h3 className={styles.beatTitle}>{beat.location}</h3>

      {/* Grade marks ride ABOVE the bar, one cell per zone, dashed lines at
          the limits (Stefan): broken hearts on the bad end, rosettes on the
          good. Widths derive from GRADE_ZONES — never restated. */}
      <div className={styles.marks} aria-hidden>
        {ZONE_ORDER.map((g) => (
          <span key={g} className={styles.markCell} style={{ width: `${GRADE_ZONES[g][1] - GRADE_ZONES[g][0]}%` }}>
            {Array.from({ length: ZONE_MARK[g].n }, (_, i) => (
              <Icon key={i} name={ZONE_MARK[g].icon} size={MARK_SIZE[ZONE_MARK[g].n]} className={styles.markIcon} />
            ))}
          </span>
        ))}
      </div>
      <div
        ref={meterRef}
        className={styles.meter}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={landed ? beat.score : 0}
        aria-valuetext={landed ? `${GRADE_LABEL[beat.grade]} — ${beat.score} of 100` : "rolling…"}
      >
        {/* Fill sits UNDER the translucent zone tints so the benchmark levels
            stay visible the whole rise (Stefan); the 2px playhead survives
            every tint so the landing edge can't wash out (Review #1 PX B3). */}
        <div
          ref={fillRef}
          className={styles.fill}
          aria-hidden
          style={{ width: `${width}%`, transition: landed ? "none" : `width ${durationMs}ms linear` }}
          onTransitionEnd={onLanded}
        />
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
      </div>

      {/* The result follows the rise: the live word ticks up through the
          thresholds, then the landed block takes over with the true grade. */}
      {!landed ? (
        <div className={styles.landing} aria-hidden>
          <span className={styles.rollGrade} data-grade={liveGrade} data-live>
            {GRADE_LABEL[liveGrade]}…
          </span>
        </div>
      ) : (
        <div className={styles.landing}>
          <span className={styles.rollGrade} data-grade={beat.grade}>{GRADE_LABEL[beat.grade]}</span>
          {note && <span className={styles.effect}>{note}</span>}
        </div>
      )}

      {landed && (
        <div className={styles.prose}>
          <p className={styles.beatText}>{beat.text}</p>
          {beat.traitBlurb && <TraitLine blurb={beat.traitBlurb} />}
        </div>
      )}
    </article>
  );
}

/** A trait cut-in line. The blurb's shape is "Hero Name does the thing —
 * TraitName" (roster.ts); the trait name renders as a bordered pill (Stefan's
 * ask) so it reads as a TRAIT, not a stray adjective. NOTE: the char page's
 * trait sockets are hex tokens, not pills — unifying trait visuals app-wide
 * is a logged follow-up (R#2 PX). A blurb without the separator renders
 * plain — content from future drops must never crash the stage. */
function TraitLine({ blurb }: { blurb: string }) {
  const cut = blurb.lastIndexOf(" — ");
  if (cut < 0) return <p className={styles.trait}>{blurb}</p>;
  return (
    <p className={styles.trait}>
      {blurb.slice(0, cut)} <span className={styles.traitPill}>{blurb.slice(cut + 3)}</span>
    </p>
  );
}
