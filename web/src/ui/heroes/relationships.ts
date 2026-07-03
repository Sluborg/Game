// Relationship scoring → named feeling bands. A bond is a −100..100 score; this
// maps it to a CK-style feeling word (DESIGN.md §5 "relation chips, not a web").
// Cutoffs are exact and monotonic so an edge score (+80, +30, 0, −80) lands in
// exactly one band; scores are clamped to [-100, 100]. The band names are an
// illustrative default and easy to retune. No uncertainty modelling here — the
// bond-fidelity system isn't specified in the design; these are shown as known.

export type Valence = "positive" | "neutral" | "negative";

export interface Band {
  /** The named feeling. */
  feeling: string;
  valence: Valence;
}

const clamp = (n: number): number => Math.max(-100, Math.min(100, n));

/** Descending thresholds; the first whose bound `score` meets or exceeds wins. */
const BANDS: { min: number; feeling: string }[] = [
  { min: 80, feeling: "Adoration" },
  { min: 55, feeling: "Fondness" },
  { min: 30, feeling: "Friendly" },
  { min: 10, feeling: "Cordial" },
  { min: -9, feeling: "Indifferent" },
  { min: -29, feeling: "Cool" },
  { min: -54, feeling: "Wary" },
  { min: -79, feeling: "Resentment" },
  { min: -100, feeling: "Loathing" },
];

export function bandFor(rawScore: number): Band {
  const score = clamp(rawScore);
  const feeling = (BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]).feeling;
  const valence: Valence = score >= 10 ? "positive" : score <= -10 ? "negative" : "neutral";
  return { feeling, valence };
}

/** "+62" / "-72" / "0" — a signed, dim secondary readout beside the feeling. */
export function signedScore(rawScore: number): string {
  const s = clamp(rawScore);
  return s > 0 ? `+${s}` : String(s);
}
