// The appetite chip — the player-facing readout of a party's split tolerance.
//
// CRITICAL (Review #1 blocker): this is derived ONLY from observation brackets
// the guild has actually seen (learnedMaxAccepted / learnedMinDeclined). It must
// never read the hidden `askMaxCut`. That is what keeps "blind play is
// base-optimal" true — you buy the edge by observing, not by inspecting.
//
// It is also CUT-RELATIVE: the answer is "will they take THIS posting, at the
// cut I've set right now?" so it recomputes as the −10/−5/+5/+10 buttons move.
// Wording avoids "risky" (that reads as quest danger next to the Ruins) and any
// bare "?" (§4/§5 already own two unknown-markers).

import type { Quest } from "./types";

export type Appetite = "unknown" | "eager" | "might-pass" | "wont-bite";

export const APPETITE_LABEL: Record<Appetite, string> = {
  unknown: "unknown",
  eager: "eager",
  "might-pass": "might pass",
  "wont-bite": "won't bite",
};

/** Given a quest's learned brackets and a candidate cut, how the party's take
 *  appetite reads. Acceptance is monotonic in cut (higher cut = smaller share =
 *  harder), so a seen accept at cut A means accept at any cut ≤ A, and a seen
 *  decline at cut D means decline at any cut ≥ D. */
export function appetiteAt(q: Quest, cut: number): Appetite {
  const { learnedMaxAccepted: acc, learnedMinDeclined: dec } = q;
  if (acc === null && dec === null) return "unknown";
  if (acc !== null && cut <= acc) return "eager"; // we've seen them take a cut this big
  if (dec !== null && cut >= dec) return "wont-bite"; // we've seen them refuse a cut this small
  return "might-pass"; // inside the unresolved band
}
