// sealed — which ledger amounts the Report must still mask (§4: a returning
// quest's cut stays hidden until its sealed story is opened). Pure, so the rule
// is unit-tested apart from the screen.

import type { LedgerEntry, Mail } from "../../game/guild";

export interface SealedView {
  /** Ids of outcome envelopes that are present AND still unopened. */
  unreadOutcomeIds: Set<string>;
  /** Earliest day with a still-sealed outcome (Infinity when none). */
  sealedSinceDay: number;
}

/** Both masking inputs from one pass, so they can't drift apart. */
export function sealedView(mail: readonly Mail[]): SealedView {
  const unreadOutcomeIds = new Set<string>();
  let sealedSinceDay = Infinity;
  for (const m of mail) {
    if (m.kind === "outcome" && !m.read) {
      unreadOutcomeIds.add(m.id);
      sealedSinceDay = Math.min(sealedSinceDay, m.day);
    }
  }
  return { unreadOutcomeIds, sealedSinceDay };
}

/** A ledger line is masked while its linked outcome is still sealed, or (for
 * Tavern takings) while its night is pending. A linked outcome that is MISSING
 * was read: the nightly trim (clock.ts) drops read mail first and never an unread
 * outcome — so an archived-away report no longer leaves a dead "see report ›"
 * (Codex P2 on PR #45). */
export function isLedgerLineMasked(e: LedgerEntry, unreadOutcomeIds: ReadonlySet<string>, pending: boolean): boolean {
  return (e.sealedMailId !== undefined && unreadOutcomeIds.has(e.sealedMailId)) || (pending && e.label === "Tavern takings");
}
