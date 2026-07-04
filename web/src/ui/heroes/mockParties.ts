// Mock party data for the Parties-primary Heroes view. Parties are the primary
// unit in this game (§6 — heroes form their OWN parties out of relationships;
// you observe and influence, never command), so the roster leads with parties
// and drops the still-unaffiliated heroes into a section below.
//
// UI scaffolding only — no party-formation / quest / location sim exists yet
// (Slice 4+). Everything here is illustrative placeholder data that REUSES the
// five heroes in mockHeroes.ts by id and stays consistent with their existing
// bonds (Ysolt+Doran already ref "The Iron Vigil"; Brok+Pell are drinking
// buddies; Brok↔Ysolt are rivals, so they lead different parties).
//
// The party VALUES are the guild-master's ESTIMATE, not ground truth — the
// screen frames them that way (§4 report fidelity, §5 certainty). In particular
// the avg rating is built ONLY from members' trusted (non-rumor) stats, so the
// UI never launders a "?" stat into a confident number.

import { HEROES, type Hero } from "./mockHeroes";
import { bandFor, type Valence } from "./relationships";

/** Display soft-cap for the UI-lean attributes (str/dex/sta/per). The sim has no
 * documented hard ceiling; this is a TUNABLE display constant used only to turn
 * a mean attribute into a 0–5 star readout for the card. Not a mechanic. */
const ATTR_DISPLAY_MAX = 18;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export interface Party {
  id: string;
  name: string;
  /** Every member (the boss included); `bossId` flags which one leads (§6). */
  memberIds: string[];
  bossId: string;
  /** Where the party is + what it's doing — an OBSERVED report line (§4). */
  location: string;
  activity: string;
  /** What the party INTENDS next turn — their own choice, not your order (§5). */
  plan: string;
  /** 0–100 guild ESTIMATES. fame = §5 CV / §7 public track record; cohesion =
   * §6 party-gets-along modifier; morale = §8 retention (the roster clock). */
  fame: number;
  cohesion: number;
  morale: number;
}

export const PARTIES: Party[] = [
  {
    id: "iron-vigil",
    name: "The Iron Vigil",
    memberIds: ["ysolt", "doran"],
    bossId: "ysolt",
    location: "the Sunken Ruins",
    activity: "clearing the lower vault",
    plan: "press toward the sealed vault door",
    fame: 62, // Ysolt is a battle-verified public-record Champion (§5/§7)
    cohesion: 70, // illustrative — a party that gets along (§6); their Ysolt↔Doran respect fits
    morale: 64, // Doran very loyal (+66), Ysolt loyal-while-flattered (+20)
  },
  {
    id: "free-blades",
    name: "The Free Blades",
    memberIds: ["brok", "pell"],
    bossId: "brok",
    location: "the Guild Hall",
    activity: "drinking between contracts",
    plan: "take the courier-escort bounty",
    fame: 30, // a jobbing sellsword pair, little public record
    cohesion: 66, // illustrative — Brok↔Pell get on (drinking buddies) so the party gels (§6)
    morale: 42, // Brok content (+45) but Pell is here for the coin (+8) — at risk
  },
];

/** Per-§5 certainty weighting: verified counts fully, a claimed (advertised,
 * possibly-inflated) stat counts for LESS, and a rumor stat — shown as "?" and
 * genuinely unknown — is excluded outright. Tunable illustrative defaults. */
const CERTAINTY_WEIGHT: Record<Hero["attributes"][number]["certainty"], number> = {
  verified: 1,
  claimed: 0.5,
  rumor: 0,
};

/** A member's rating = a certainty-WEIGHTED mean of their attributes, mapped to
 * 0–5 and clamped. §5 is the keystone: a claimed stat is the advertised number
 * the player shouldn't fully trust, so it's discounted, not folded in at parity
 * with a battle-verified one; rumor stats are dropped entirely. `null` when the
 * member has no verified/claimed stat yet (render "—", never a laundered guess).
 * Real CV correction (speed scaled by report fidelity) is a later slice. */
export function heroRating(hero: Hero): number | null {
  let weighted = 0;
  let weight = 0;
  for (const a of hero.attributes) {
    const w = CERTAINTY_WEIGHT[a.certainty];
    if (w === 0) continue;
    weighted += a.value * w;
    weight += w;
  }
  if (weight === 0) return null;
  const mean = weighted / weight;
  return round1(Math.max(0, Math.min(5, (mean / ATTR_DISPLAY_MAX) * 5)));
}

/** A member's morale cue, from their existing to-the-guild bond (§8 retention).
 * Surfaced PER MEMBER so a single at-risk hero isn't hidden by the party average. */
export function heroMood(hero: Hero): { valence: Valence; label: string } {
  const guild = hero.bonds.find((b) => b.scope === "guild");
  const valence: Valence = guild ? bandFor(guild.score).valence : "neutral";
  const label = valence === "positive" ? "content" : valence === "negative" ? "unhappy" : "unsettled";
  return { valence, label };
}

export interface PartyView {
  party: Party;
  boss: Hero;
  /** Members ordered boss-first, then rating desc, id as a stable tiebreak. */
  members: Hero[];
  ratings: Map<string, number | null>;
  /** Party avg of the members' (non-null) ratings; null if none are trusted. */
  avgRating: number | null;
}

const byId = (id: string): Hero | undefined => HEROES.find((h) => h.id === id);

function buildView(party: Party): PartyView | null {
  // Resolve + drop any id that doesn't map to a real hero (a bad data edit must
  // not throw or render a broken row).
  const members = party.memberIds.map(byId).filter((h): h is Hero => Boolean(h));
  if (members.length === 0) return null;
  const boss = byId(party.bossId) ?? members[0];
  const ratings = new Map(members.map((h) => [h.id, heroRating(h)] as const));

  const ordered = [...members].sort((a, b) => {
    if (a.id === boss.id) return -1; // boss pinned first (§6)
    if (b.id === boss.id) return 1;
    const ra = ratings.get(a.id) ?? -1;
    const rb = ratings.get(b.id) ?? -1;
    if (rb !== ra) return rb - ra; // then rating desc
    return a.id.localeCompare(b.id); // stable tiebreak
  });

  const rated = members.map((h) => ratings.get(h.id)).filter((r): r is number => r != null);
  const avgRating = rated.length ? round1(rated.reduce((s, r) => s + r, 0) / rated.length) : null;
  return { party, boss, members: ordered, ratings, avgRating };
}

/** Precomputed at module load (like mockHeroes' layer resolution) so member/rating
 * order is stable across renders and the Hero references stay identity-stable. */
export const PARTY_VIEWS: PartyView[] = PARTIES.map(buildView).filter((v): v is PartyView => v !== null);

/** Everyone who belongs to a party (boss ∪ members, across all parties), so SOLO
 * is the EXACT complement — a boss can't leak into Solo and no hero appears twice. */
const AFFILIATED = new Set(PARTIES.flatMap((p) => [p.bossId, ...p.memberIds]));
export const SOLO: Hero[] = HEROES.filter((h) => !AFFILIATED.has(h.id));
