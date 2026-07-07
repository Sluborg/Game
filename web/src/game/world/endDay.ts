// The discrete "end day" tick — a PURE reducer over WorldState implementing
// §12's exact order:
//   cut revisions apply → outcomes & payouts for the party that was out →
//   acceptance rolls for board postings → passive trickle → upkeep →
//   loan interest → forced auto-repay → loan disbursement → insolvency check
// then the next morning's board refresh (fresh/returning letters, expiry).
//
// All randomness is drawn from the serialized RNG cursor in a FIXED order so a
// save→reload→endDay is identical to an unbroken endDay. Quest take/return uses a
// single object per tier: when the party returns, the quest is resolved and put
// back on the board in the same tick, so the freed party can re-take it that
// night (back-to-back workdays — the §6/§12 road floor depends on this) without a
// phantom duplicate letter.

import { ACCEPT, ECONOMY, QUESTS } from "./economy";
import { partyQuality } from "./heroes";
import { makeCursor, nextFloat, nextInt } from "./rng";
import { rollSuccess, successChance } from "./resolve";
import type { DayReport, LedgerLine, MailLine, Quest, WorldState } from "./types";

function clone(s: WorldState): WorldState {
  return JSON.parse(JSON.stringify(s)) as WorldState;
}

/** Reset a quest object to a brand-new giver's letter of its tier. */
function toFreshLetter(q: Quest): void {
  const base = QUESTS[q.id];
  q.giver = base.giver;
  q.title = base.title;
  q.reward = base.reward;
  q.onBoard = true;
  q.cut = ECONOMY.cutBase;
  q.cutRevisedToday = false;
  q.daysOnBoard = 0;
  q.failCount = 0;
  q.payBump = 0;
  // learned brackets persist — knowledge about this party's appetite is not lost
  // when a giver changes; the tier is the same and the party is the same.
}

export function endDay(prev: WorldState): WorldState {
  const s = clone(prev);
  const report: DayReport = {
    day: s.day,
    goldBefore: s.gold,
    goldAfter: s.gold,
    netPerDay: 0,
    runwayDaysAfter: null,
    ledger: [],
    mail: [],
  };
  s.lastReport = report;

  // A revoked run is terminal — End Day is a no-op (the UI offers New run).
  if (s.status !== "playing") return s;

  const cur = makeCursor(s.rngState);
  const ledger: LedgerLine[] = report.ledger;
  const mail: MailLine[] = report.mail;
  const quality = partyQuality(s.heroes);
  const byId = (id: string) => s.quests.find((q) => q.id === id)!;

  // Operating net (drives the runway line) excludes financing (loan in/out).
  let operatingNet = 0;
  const gain = (label: string, amount: number, operating = true) => {
    s.gold += amount;
    ledger.push({ label, amount });
    if (operating) operatingNet += amount;
  };

  // 1. Cut revisions already live in each quest.cut (set during the day). No-op.

  // 2. Outcomes & payouts for the party that was out.
  if (s.party.out && s.party.out.returnsOnDay === s.day) {
    const out = s.party.out;
    const q = byId(out.questId);
    const base = QUESTS[q.id];
    const success = rollSuccess(q.id, quality, cur);
    if (success) {
      const take = Math.round((out.reward * out.cut) / 100);
      gain(`${q.title} — your cut (${out.cut}%)`, take);
      mail.push({
        kind: "outcome",
        quest: q.id,
        questTitle: q.title,
        success: true,
        take,
        text: `${s.party.name} delivered. Your ${out.cut}% cut of ${out.reward}g came to ${take}g.`,
      });
      toFreshLetter(q); // giver satisfied → a fresh letter of the tier returns to the board
    } else {
      q.failCount += 1;
      const withdrawn = q.failCount >= ECONOMY.failWithdrawAt;
      let text = `${s.party.name} came back empty-handed from ${q.title}. No cut.`;
      if (!withdrawn && q.failCount === 1 && q.payBump === 0) {
        // One bounded pay bump: the giver sweetens a harder job (difficulty rises with pay).
        q.payBump = base.failPayBump;
        text += ` The giver raised the reward to ${base.reward + base.failPayBump}g — and the danger with it.`;
      }
      mail.push({ kind: "outcome", quest: q.id, questTitle: q.title, success: false, take: 0, text });
      if (withdrawn) {
        mail.push({
          kind: "expired",
          quest: q.id,
          questTitle: q.title,
          text: `After a second failure, ${base.giver} withdrew the job. A fresh ${q.id} letter will come.`,
        });
        toFreshLetter(q); // giver gone → a new giver's fresh letter
      } else {
        // Same quest returns: failCount + payBump persist; only the board clock resets.
        q.reward = base.reward + q.payBump;
        q.onBoard = true;
        q.cut = ECONOMY.cutBase;
        q.cutRevisedToday = false;
        q.daysOnBoard = 0;
      }
    }
    s.party.out = null; // the party is home and available for tonight's acceptance rolls
  }

  // 3. Acceptance rolls for board postings (only if the party is free).
  if (!s.party.out) {
    const candidates = s.quests.filter((q) => q.onBoard);
    const evals = candidates.map((q) => {
      const noise = nextInt(cur, -ACCEPT.dailyNoiseMax, ACCEPT.dailyNoiseMax);
      const accepts = q.cut <= q.askMaxCut + noise;
      const ev = ((q.reward * q.cut) / 100) * successChance(q.id, quality);
      return { q, accepts, ev };
    });
    const accepting = evals.filter((e) => e.accepts);

    // Observation brackets: record what we SAW (accept or refuse), never the ask.
    for (const e of evals) {
      if (e.accepts) {
        e.q.learnedMaxAccepted = Math.max(e.q.learnedMaxAccepted ?? -Infinity, e.q.cut);
      } else {
        e.q.learnedMinDeclined = Math.min(e.q.learnedMinDeclined ?? Infinity, e.q.cut);
      }
    }

    if (accepting.length > 0) {
      // Take the better expected share; prefer Ruins on a tie (§12 stub for slice 4).
      accepting.sort((a, b) => b.ev - a.ev || (a.q.id === "ruins" ? -1 : 1));
      const chosen = accepting[0].q;
      chosen.onBoard = false;
      s.party.out = { questId: chosen.id, cut: chosen.cut, reward: chosen.reward, returnsOnDay: s.day + 1 };
      mail.push({
        kind: "accepted",
        quest: chosen.id,
        questTitle: chosen.title,
        share: 100 - chosen.cut,
        cut: chosen.cut,
      });
    } else if (candidates.length > 0) {
      // Fully idle — the split looks thin on every posting. Never a silent day.
      for (const e of evals) {
        mail.push({
          kind: "no-takers",
          quest: e.q.id,
          questTitle: e.q.title,
          text: `No takers for ${e.q.title} — the ${e.q.cut}% cut looks thin to them.`,
        });
      }
      // Occasionally volunteer the other side of the bracket (coarse free knowledge).
      for (const e of evals) {
        if (e.q.learnedMaxAccepted === null && nextFloat(cur) < 0.3) {
          mail.push({
            kind: "reveal",
            quest: e.q.id,
            questTitle: e.q.title,
            text: `Word is ${s.party.name} would take ${e.q.title} for a thinner cut.`,
          });
        }
      }
    }
  }

  // 4–5. Passive trickle, then daily upkeep.
  gain("Guild Hall passive income", ECONOMY.passiveIncome);
  gain("Daily upkeep", -ECONOMY.dailyUpkeep);

  // 6. Loan interest (flat, non-compounding).
  if (s.loan.active) gain("Loan interest (5%/day)", -ECONOMY.loanInterestPerDay);

  // 7. Forced auto-repay — the moment you can pay 600g and still keep 200g.
  if (s.loan.active && s.gold - ECONOMY.loanPrincipal >= ECONOMY.repayKeepBuffer) {
    gain("Loan repaid", -ECONOMY.loanPrincipal, false); // financing, not operating
    s.loan.active = false;
    mail.push({ kind: "repaid", text: `You cleared the ${ECONOMY.loanPrincipal}g loan and kept a working buffer.` });
  }

  // 8. Loan disbursement — a fresh loan clears THIS day's insolvency (one per run).
  if (s.gold < 0 && !s.loan.taken) {
    gain("Emergency loan", ECONOMY.loanPrincipal, false); // financing, not operating
    s.loan.active = true;
    s.loan.taken = true;
    mail.push({
      kind: "loan",
      text: `A creditor covered your shortfall with a ${ECONOMY.loanPrincipal}g loan at 5%/day. One rescue — spend it well.`,
    });
  }

  // 9. Insolvency check (after interest, after any fresh loan).
  if (s.gold < 0) {
    s.insolventStreak += 1;
    if (s.insolventStreak >= ECONOMY.insolvencyLimit) {
      s.status = "revoked";
      mail.push({
        kind: "revoked",
        text: `Insolvent ${s.insolventStreak} days running. The council revoked your charter. The guild is finished.`,
      });
    }
  } else {
    s.insolventStreak = 0;
  }

  // ---- Report figures ----
  report.goldAfter = s.gold;
  report.netPerDay = operatingNet;
  report.runwayDaysAfter =
    operatingNet >= 0 ? null : Math.max(0, Math.floor(Math.max(0, s.gold) / -operatingNet));

  // ---- Next morning: board refresh (revision unlocks; expiry withdraws) ----
  if (s.status === "playing") {
    for (const q of s.quests) {
      q.cutRevisedToday = false; // a new day — the once/day revision is available again
      if (!q.onBoard) continue; // taken (party out on it) — not on the board to age
      q.daysOnBoard += 1;
      if (q.daysOnBoard >= ECONOMY.expiryDays) {
        mail.push({
          kind: "expired",
          quest: q.id,
          questTitle: q.title,
          text: `${q.giver} withdrew ${q.title} after ${q.daysOnBoard} days unposted-for. A fresh letter will come.`,
        });
        toFreshLetter(q);
      }
    }
    s.day += 1;
  }

  s.rngState = cur.s; // persist the advanced cursor → reload-determinism
  return s;
}
