// The Report's ledger masking (§4) — including the Codex P2 on PR #45: a READ
// outcome trimmed by the mail cap must not leave its ledger line masked forever.

import { describe, expect, it } from "vitest";
import { isLedgerLineMasked, sealedView } from "./sealed";
import type { LedgerEntry, Mail } from "../../game/guild";

const outcome = (id: string, day: number, read: boolean): Mail => ({ id, day, kind: "outcome", teaser: "back", read });
const cut: LedgerEntry = { label: "Brokerage — The Iron Vigil", amount: 12, sealedMailId: "out-1" };
const takings: LedgerEntry = { label: "Tavern takings", amount: 5 };

describe("sealedView", () => {
  it("collects only present, unread outcomes and the earliest sealed day", () => {
    const v = sealedView([outcome("a", 3, false), outcome("b", 2, true), outcome("c", 5, false), { id: "l", day: 1, kind: "ledger", teaser: "", read: false }]);
    expect([...v.unreadOutcomeIds].sort()).toEqual(["a", "c"]);
    expect(v.sealedSinceDay).toBe(3);
  });

  it("no sealed outcomes → Infinity (nothing pending)", () => {
    expect(sealedView([outcome("a", 1, true)]).sealedSinceDay).toBe(Infinity);
  });
});

describe("isLedgerLineMasked", () => {
  it("masks a quest cut while its outcome is present and unread", () => {
    const { unreadOutcomeIds } = sealedView([outcome("out-1", 1, false)]);
    expect(isLedgerLineMasked(cut, unreadOutcomeIds, true)).toBe(true);
  });

  it("shows the cut once the outcome is read", () => {
    const { unreadOutcomeIds } = sealedView([outcome("out-1", 1, true)]);
    expect(isLedgerLineMasked(cut, unreadOutcomeIds, false)).toBe(false);
  });

  it("shows the cut when the (read) outcome was trimmed away — no dead 'see report ›'", () => {
    const { unreadOutcomeIds } = sealedView([]);
    expect(isLedgerLineMasked(cut, unreadOutcomeIds, false)).toBe(false);
  });

  it("Tavern takings hide only while the night is pending", () => {
    const none = new Set<string>();
    expect(isLedgerLineMasked(takings, none, true)).toBe(true);
    expect(isLedgerLineMasked(takings, none, false)).toBe(false);
  });
});
