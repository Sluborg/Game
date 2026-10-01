// TimeControls — the ONE visual language for "time" controls (Stefan: "the
// speed and play buttons should mimic speed at the top for actual game. reuse
// symbolism, sizes etc."). Presentational only: the Hall drives WORLD time,
// the StoryStage drives PLAYBACK of a recorded past — so labels, prefs, and
// state machines stay with each consumer (Review #1 Designer: the kit must
// never bake in the Hall's "Paused"/"Needs you" vocabulary or a default pref
// key). Glyphs are inline SVGs — U+23F8 "⏸" renders as a tofu box in the
// display font (PR #39), and drawn shapes can't fall back.

import styles from "./TimeControls.module.css";

export function PlayGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path d="M2 1l9 5-9 5z" fill="currentColor" />
    </svg>
  );
}

export function PauseGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" />
    </svg>
  );
}

/** Fast-forward: two nested triangles (the media ⏩ shape, drawn). */
function FFGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 12" width={(size * 16) / 12} height={size} aria-hidden="true">
      <path d="M1 1l7 5-7 5zM8 1l7 5-7 5z" fill="currentColor" />
    </svg>
  );
}

export type TimeSpeed = "slow" | "normal" | "fast";
export const TIME_SPEED_ORDER: TimeSpeed[] = ["slow", "normal", "fast"];

/** "The fast forward icons 2x and 3x, instead of multiples of play" (Stefan):
 * 1× rides a single play triangle, 2×/3× ride the fast-forward glyph and the
 * multiplier text carries the difference. */
const SPEED_FACTOR: Record<TimeSpeed, string> = { slow: "1×", normal: "2×", fast: "3×" };

export function SpeedChip({
  speed,
  onCycle,
  context,
}: {
  speed: TimeSpeed;
  onCycle: () => void;
  /** Which clock this chip drives — "Hall speed" vs "Report speed". The two
   * chips LOOK identical but persist separately (Review #1 Adversary): the
   * aria wording is the disambiguator. */
  context: string;
}) {
  return (
    <button
      type="button"
      className={styles.speedChip}
      onClick={onCycle}
      aria-label={`${context}: ${SPEED_FACTOR[speed]} — tap to change`}
    >
      {speed === "slow" ? <PlayGlyph size={13} /> : <FFGlyph size={13} />}
      <span className={styles.factor}>{SPEED_FACTOR[speed]}</span>
    </button>
  );
}
