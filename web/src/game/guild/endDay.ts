// The end-day tick (§12 tick order) — the pure heart of the loop. Given a state
// for "day D", returns the state for "day D+1" with all payouts, acceptance rolls,
// standing-job fallback, economy, and mail resolved. Deterministic: same input →
// same output (the purity test runs it twice and deep-equals). Assignment ORDER is
// pinned (Review #1 BLOCKER 2): returns → scarce awards → standing fallback, only
// idle parties bid, one job per party per day, out-parties excluded.

import { bestFit, learn, offsetKey, partyAccepts, partyEligible } from "./board";
import { QUEST_BY_ID, ROAD_JOB, RUINS, STANDING_JOBS, type QuestDef } from "./quests";
import { resolveQuest } from "./resolver";
import { PARTY_BY_ID } from "./roster";
import { deriveSeed, rngFor, rollInt } from "./seed";
import { DAILY_UPKEEP, PASSIVE_INCOME, draft } from "./state";
import type { Assignment, GuildState, LedgerEntry, Mail, Posting } from "./types";

const SCARCE_TIERS: QuestDef["tier"][] = ["ruins", "road"]; // award order

function dispatch(state: GuildState, partyId: string, quest: QuestDef, cutPct: number, newDay: number): Assignment {
  const duration = rollInt(rngFor(state.rngSeed, "dur", newDay, quest.id, partyId), quest.minDuration, quest.maxDuration);
  const seed = deriveSeed(state.rngSeed, "quest", newDay, quest.id, partyId);
  const log = resolveQuest({ quest, partyId, cutPct, durationDays: duration, seed });
  return {
    questId: quest.id,
    tier: quest.tier,
    questTitle: quest.title,
    seed,
    dispatchedDay: newDay,
    returnDay: newDay + duration,
    durationDays: duration,
    log,
  };
}

function partyName(id: string): string {
  return PARTY_BY_ID[id]?.name ?? id;
}

export function endDay(state: GuildState): GuildState {
  const next = draft(state);
  const newDay = next.day + 1;
  const ledger: LedgerEntry[] = [];
  const nightMail: Mail[] = [];
  const id = (prefix: string) => `${prefix}-${++next.seq}`;

  // ── STEP 2 — outcomes & payouts for parties returning today ──────────────────
  for (const party of next.parties) {
    const a = party.assignment;
    if (!a || a.returnDay !== newDay) continue;
    next.gold += a.log.guildCut;
    if (a.tier !== "standing") {
      // The outcome is a SEALED story — its cut must NOT be spelled out in the
      // ledger before the envelope is opened (§4 reveal). Link the ledger line to
      // the outcome mail so the Report masks the amount until that mail is read.
      const mailId = id("mail");
      ledger.push({ label: `${a.questTitle} — ${partyName(party.id)}`, amount: a.log.guildCut, sealedMailId: mailId });
      nightMail.push({
        id: mailId,
        day: newDay,
        kind: "outcome",
        teaser: `${partyName(party.id)} are back from ${a.questTitle}.`,
        log: a.log,
        partyName: partyName(party.id),
        questTitle: a.questTitle,
        read: false,
      });
      // A failed scarce quest simply leaves the roster free; the board refill below
      // guarantees a fresh letter of the tier next morning (failCount carry is a
      // later slice — §12).
    } else {
      // Standing job: quiet income, folded into the ledger only.
      ledger.push({ label: `${a.questTitle} — ${partyName(party.id)}`, amount: a.log.guildCut });
    }
    party.assignment = null;
  }

  // ── STEP 3 — acceptance rolls (only idle parties bid) ────────────────────────
  const idle = new Set(next.parties.filter((p) => !p.assignment).map((p) => p.id));

  // 3a. Scarce quests first, awarded to the best-fit bidder. Learning is recorded
  // for every idle ELIGIBLE party (the player observes accept/decline in the report).
  const scarce = next.board
    .filter((p) => p.tier === "road" || p.tier === "ruins")
    .sort((a, b) => SCARCE_TIERS.indexOf(a.tier) - SCARCE_TIERS.indexOf(b.tier));
  const taken = new Set<string>();

  for (const posting of scarce) {
    const eligibleIdle = [...idle].filter((pid) => partyEligible(pid, posting.tier));
    // If no eligible party is even AVAILABLE (all are out on multi-day quests), the
    // posting simply waits — it must not age toward "no takers", which would blame
    // the player's pricing for what was really a busy roster (Adversary R#2).
    if (eligibleIdle.length === 0) continue;
    const candidates: string[] = [];
    for (const pid of eligibleIdle) {
      const accepts = partyAccepts(next, pid, posting.tier, posting.cutPct, newDay);
      next.knowledge[offsetKey(pid, posting.tier)] = learn(next.knowledge[offsetKey(pid, posting.tier)], posting.cutPct, accepts);
      if (accepts) candidates.push(pid);
    }
    const winner = bestFit(candidates);
    if (winner) {
      idle.delete(winner);
      taken.add(posting.id);
      const quest = QUEST_BY_ID[posting.tier];
      next.parties.find((p) => p.id === winner)!.assignment = dispatch(next, winner, quest, posting.cutPct, newDay);
      const alsoWanted = candidates.filter((c) => c !== winner).map(partyName);
      nightMail.push({
        id: id("mail"),
        day: newDay,
        kind: "acceptance",
        teaser:
          `${partyName(winner)} took ${posting.title} at a ${posting.cutPct}% cut` +
          (alsoWanted.length ? ` (${alsoWanted.join(", ")} wanted it too).` : "."),
        read: false,
      });
    } else {
      // No taker: the posting ages toward withdrawal (§12 ~3-day expiry).
      posting.daysLeft -= 1;
      if (posting.daysLeft <= 0) {
        taken.add(posting.id); // remove it
        nightMail.push({
          id: id("mail"),
          day: newDay,
          kind: "notice",
          teaser: `${posting.giver} withdrew ${posting.title} — no takers at ${posting.cutPct}%.`,
          read: false,
        });
      }
    }
  }
  next.board = next.board.filter((p) => !taken.has(p.id));

  // 3b. Standing-job fallback — any still-idle party takes guard/watch work.
  let standIdx = 0;
  for (const pid of idle) {
    const job = STANDING_JOBS[standIdx % STANDING_JOBS.length];
    standIdx++;
    next.parties.find((p) => p.id === pid)!.assignment = dispatch(next, pid, job, 30, newDay);
  }

  // ── Board refill — keep exactly one road + one ruins posting available ───────
  for (const quest of [ROAD_JOB, RUINS]) {
    if (!next.board.some((p) => p.tier === quest.tier)) {
      next.board.push(makePosting(quest, ++next.seq, newDay));
    }
  }

  // ── STEP 4 — passive, upkeep (loan defined but unwired this slice) ───────────
  next.gold += PASSIVE_INCOME;
  ledger.push({ label: "Guild Hall passive", amount: PASSIVE_INCOME });
  next.gold -= DAILY_UPKEEP;
  ledger.push({ label: "Daily upkeep", amount: -DAILY_UPKEEP });

  // ── STEP 5 — ledger mail + runway ────────────────────────────────────────────
  const net = ledger.reduce((s, e) => s + e.amount, 0);
  const runwayNote =
    net >= 0
      ? `Treasury growing +${net}g/day.`
      : next.gold <= 0
        ? `Treasury is in the red (${next.gold}g).`
        : `Gold lasts ~${Math.max(1, Math.floor(next.gold / -net))} days at this burn.`;
  // The teaser stays neutral; net/treasury/runway are carried as data and revealed
  // by the Report only once the night's sealed returns are opened (Codex R#34).
  nightMail.push({
    id: id("mail"),
    day: newDay,
    kind: "ledger",
    teaser: `Day ${newDay} ledger`,
    ledger,
    runwayNote,
    net,
    endGold: next.gold,
    read: false,
  });

  next.day = newDay;
  next.firstDay = false;
  next.mail = [...nightMail, ...next.mail];
  return next;
}

function makePosting(quest: QuestDef, seq: number, day: number): Posting {
  return {
    id: `${quest.id}-${seq}`,
    tier: quest.tier,
    title: quest.title,
    giver: quest.giver,
    cutPct: 30,
    daysLeft: 3,
    // Revisable on its FIRST full day (day == the new current day). Using `day`
    // here would read as "already revised today" and lock the fresh letter at 30%
    // for its first acceptance roll — gutting the priced decision (Adversary R#2).
    lastRevisedDay: day - 1,
    failCount: 0,
  };
}
