// The serializable world-state and its report shape. Everything here is plain
// JSON-safe data (no functions, no class instances) so a run round-trips through
// localStorage. `endDay` is a pure reducer over this state.

import type { QuestTier } from "./economy";

export const SCHEMA_VERSION = 1;

export type Certainty = "verified" | "claimed" | "rumor";

/** One value the guild believes about a hero. The number is the guild's ESTIMATE
 *  (rendered with §5 certainty); it is not the ground truth the resolver reads. */
export interface HeroCV {
  label: string; // STR / DEX / STA / PER
  value: number; // 0–100, the shown estimate
  certainty: Certainty;
}

export interface Hero {
  id: string;
  name: string;
  archetype: string;
  cvs: HeroCV[];
  /** Ground-truth 0..1 contribution to quest success. Never shown — the CVs are
   *  the guild's (uncertain) picture of it. Correcting CVs against reality is
   *  Slice 3; in Slice 1 the CVs are honest-but-static scaffolding. */
  quality: number;
}

/** One fixed party of 3 (parties-as-a-system is Slice 4). */
export interface Party {
  name: string;
  heroIds: string[];
  /** null = at the hall and available; otherwise out on a quest, back on `returnsOnDay`.
   *  `cut` and `reward` are snapshotted at accept time so the payout is stable even if
   *  the board posting is refreshed while the party is away. */
  out: { questId: QuestTier; cut: number; reward: number; returnsOnDay: number } | null;
}

export interface Quest {
  id: QuestTier; // stable identity — a failed quest returns under the same id
  giver: string;
  title: string;
  reward: number; // current pool (base + any one failure bump)
  onBoard: boolean; // false while the party is out on it

  // The priced decision.
  cut: number; // 20..40
  cutRevisedToday: boolean; // resets each morning; gates the "once per day" revision

  // Lifecycle.
  daysOnBoard: number; // untaken days; ≥ expiryDays → giver withdraws
  failCount: number; // persists across a failed-quest return; resets on success/withdraw
  payBump: number; // gold already added to reward from a failure (one max)

  // Hidden acceptance model (never rendered).
  askMaxCut: number; // run-fixed threshold: bites if cut ≤ askMaxCut + daily noise

  // Learned knowledge (observation brackets), in cut-points. Derived ONLY from
  // observed accept/decline — the appetite chip reads these, never askMaxCut.
  learnedMaxAccepted: number | null; // highest cut we've SEEN them accept at
  learnedMinDeclined: number | null; // lowest cut we've SEEN them decline at
}

export interface Loan {
  active: boolean; // currently owed
  taken: boolean; // one loan per run — once true, never disbursed again
}

export type RunStatus = "playing" | "revoked";

export interface WorldState {
  schemaVersion: number;
  day: number; // the current day awaiting its End Day (starts at 1)
  gold: number;
  rngState: number; // serializable RNG cursor (advances every End Day)
  runSeed: number; // the original seed, for display/debug

  heroes: Hero[];
  party: Party;
  quests: Quest[]; // [road, ruins]

  loan: Loan;
  insolventStreak: number; // consecutive insolvent end-days; 5 → revoked
  status: RunStatus;

  lastReport: DayReport | null; // the most recent End Day's report mail
}

// ---- End-day report -------------------------------------------------------

export interface LedgerLine {
  label: string;
  amount: number; // signed gold (+in / −out)
}

export type MailLine =
  | { kind: "accepted"; quest: QuestTier; questTitle: string; share: number; cut: number }
  | { kind: "outcome"; quest: QuestTier; questTitle: string; success: boolean; take: number; text: string }
  | { kind: "no-takers"; quest: QuestTier; questTitle: string; text: string }
  | { kind: "expired"; quest: QuestTier; questTitle: string; text: string }
  | { kind: "reveal"; quest: QuestTier; questTitle: string; text: string }
  | { kind: "loan"; text: string }
  | { kind: "repaid"; text: string }
  | { kind: "revoked"; text: string };

export interface DayReport {
  day: number; // the day that just ended
  goldBefore: number;
  goldAfter: number;
  netPerDay: number; // signed; ≥ 0 → treasury growing
  runwayDaysAfter: number | null; // null when net ≥ 0 (growing) — guards ÷0
  ledger: LedgerLine[];
  mail: MailLine[];
}
