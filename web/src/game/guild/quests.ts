// Quest definitions (§10) — hand-authored beat graphs for the Slice-1 vocabulary.
// A quest is a short sequence of beats; each beat is a graded skill-vs-difficulty
// roll (resolver.ts) against one of the 4 real attributes. The challenge-dot
// signature shown on the board is DERIVED from these beats, so the dots never lie
// about what the quest tests. Road ≈ 2 beats; Ruins ≈ 3–4 + 1 optional bonus.

import type { AttrKey, BeatType, Grade, QuestTier } from "./types";

export interface BeatDef {
  id: string;
  type: BeatType;
  location: string;
  attr: AttrKey;
  difficulty: number;
  /** Failing a critical beat forces a hard recovery branch; failing THAT fails
   * the quest (§10 forced paths). Non-critical fails just penalize momentum. */
  critical?: boolean;
  /** A strong (crit/good) result here appends the optional bonus beat. */
  unlocksBonus?: boolean;
  /** Narration per grade — the story text the report animates. */
  narration: Record<Grade, string>;
}

export interface QuestDef {
  id: string;
  tier: QuestTier;
  title: string;
  giver: string;
  /** The quest's FLAT total reward (Stefan: "only total reward" — extra days
   * cost time, never add gold). The § 12 per-day number sheet is superseded. */
  reward: number;
  minDuration: number;
  maxDuration: number;
  /** Party gates: a tier the party can't bid is filtered before the ask check. */
  requiresParty?: boolean; // true → a lone-hero party can't take it (the Ruins)
  beats: BeatDef[];
  /** The optional beat unlocked by a strong mid-quest result. */
  bonusBeat?: BeatDef;
}

const n = (crit: string, good: string, ok: string, poor: string, fail: string): Record<Grade, string> => ({
  crit,
  good,
  ok,
  poor,
  fail,
});

export const ROAD_JOB: QuestDef = {
  id: "road",
  tier: "road",
  title: "Courier Escort",
  giver: "a nervous merchant",
  reward: 350,
  minDuration: 1,
  maxDuration: 2,
  beats: [
    {
      id: "road-travel",
      type: "travel",
      location: "Old Trade Road",
      attr: "sta",
      difficulty: 9,
      narration: n(
        "They make the waystation by dusk, hours ahead of the wagons.",
        "The road is long but the party keeps a good pace.",
        "Muddy ruts slow the cart, but they press on.",
        "A wheel cracks; they lose half a day patching it.",
        "Lost in the fog, the escort wanders off the road entirely.",
      ),
    },
    {
      id: "road-ambush",
      type: "combat",
      location: "Willow Ford",
      attr: "str",
      difficulty: 11,
      critical: true,
      // A strong showing at the ford earns the merchant's gratitude (the bonus beat).
      unlocksBonus: true,
      narration: n(
        "Bandits spring the ford — and are broken before the merchant even ducks.",
        "A scuffle at the ford; the escort drives the bandits off.",
        "The bandits are seen off, though the cart takes a few arrows.",
        "The escort is bloodied holding the ford, but the goods survive.",
        "The ambush overwhelms them — the merchant's cart is looted.",
      ),
    },
  ],
  bonusBeat: {
    id: "road-tip",
    type: "social",
    location: "Waystation",
    attr: "per",
    difficulty: 8,
    narration: n(
      "A grateful ally slips them a rumor worth real coin.",
      "The merchant tips well and name-drops them to a friend.",
      "A round of thanks, a small bonus purse.",
      "Barely a nod of thanks.",
      "The merchant stiffs them on the way out.",
    ),
  },
};

export const RUINS: QuestDef = {
  id: "ruins",
  tier: "ruins",
  title: "The Sunken Ruins",
  giver: "a hooded antiquarian",
  reward: 700,
  minDuration: 1,
  maxDuration: 3,
  requiresParty: true,
  beats: [
    {
      id: "ruins-descent",
      type: "travel",
      location: "Flooded stair",
      attr: "dex",
      difficulty: 12,
      narration: n(
        "They rope down the flooded stair without a splash.",
        "The descent is slick but they manage it clean.",
        "Waist-deep and cold, they wade to the lower vault.",
        "Someone slips; they lose a torch and some nerve.",
        "The stair collapses under them — a hard, wet fall.",
      ),
    },
    {
      id: "ruins-sigils",
      type: "investigation",
      location: "Sigil hall",
      attr: "per",
      difficulty: 15,
      unlocksBonus: true,
      narration: n(
        "They read the sigils perfectly — and spot a hidden reliquary.",
        "The ward-sigils are decoded; the safe path opens.",
        "They puzzle out enough of the sigils to avoid the worst.",
        "Half-read, the sigils spring a lesser ward.",
        "The sigils baffle them; a ward detonates.",
      ),
    },
    {
      id: "ruins-guardian",
      type: "combat",
      location: "Drowned reliquary",
      attr: "str",
      difficulty: 18,
      critical: true,
      narration: n(
        "The stone guardian is shattered in a single furious exchange.",
        "A hard fight, but the guardian goes down.",
        "They bring the guardian down, battered and gasping.",
        "The guardian nearly routs them before it falls.",
        "The guardian is too much — they flee empty-handed.",
      ),
    },
  ],
  bonusBeat: {
    id: "ruins-reliquary",
    type: "investigation",
    location: "Hidden reliquary",
    attr: "per",
    difficulty: 12,
    narration: n(
      "The reliquary yields a relic worth a small fortune.",
      "A tidy cache of coin and old silver.",
      "A few valuables, prised loose.",
      "Mostly rot; a single coin.",
      "The reliquary is trapped and empty.",
    ),
  },
};

// Standing jobs — always-available, non-exclusive survival-floor work. A single
// easy beat; low, near-guaranteed pay. Any idle party (incl. a lone hero) can take
// one when it didn't win a scarce quest.
export const STANDING_JOBS: QuestDef[] = [
  {
    id: "guard-hall",
    tier: "standing",
    title: "Guard the Guild Hall",
    giver: "the guild steward",
    reward: 25, // tiny survival-floor pay; guild take = 3g (rounded 10%)
    minDuration: 1,
    maxDuration: 1,
    beats: [
      {
        id: "guard-watch",
        type: "social",
        location: "Guild Hall",
        attr: "per",
        difficulty: 6,
        narration: n(
          "A quiet, watchful night — not so much as a mouse.",
          "An uneventful watch; the hall is secure.",
          "A dull shift, dutifully kept.",
          "They doze once, but nothing comes of it.",
          "A drunk wanders in; mild embarrassment, no harm.",
        ),
      },
    ],
  },
  {
    id: "city-watch",
    tier: "standing",
    title: "Help the City Watch",
    giver: "the watch sergeant",
    reward: 25,
    minDuration: 1,
    maxDuration: 1,
    beats: [
      {
        id: "watch-patrol",
        type: "travel",
        location: "Village lanes",
        attr: "sta",
        difficulty: 6,
        narration: n(
          "They walk the lanes till dawn; the sergeant is impressed.",
          "A steady patrol; the lanes stay quiet.",
          "A plodding round of the Village.",
          "Footsore and grumbling, they finish the patrol.",
          "They cut the patrol short; the sergeant notices.",
        ),
      },
    ],
  },
];

export const POSTABLE_QUESTS: QuestDef[] = [ROAD_JOB, RUINS];
export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  [...POSTABLE_QUESTS, ...STANDING_JOBS].map((q) => [q.id, q]),
);

/** Per-challenge-type skull rating, derived from the quest's beats (incl. the
 * bonus beat — the dots-never-lie precedent: the story must never show a type
 * the detail didn't advertise). Absent types are omitted. Skulls = MAX beat
 * difficulty of the type: ≤8→1, ≤12→2, ≤16→3, ≤20→4, else 5. */
export function typeSkulls(quest: QuestDef): Partial<Record<BeatType, number>> {
  const out: Partial<Record<BeatType, number>> = {};
  const all = [...quest.beats, ...(quest.bonusBeat ? [quest.bonusBeat] : [])];
  for (const b of all) {
    const skulls = b.difficulty <= 8 ? 1 : b.difficulty <= 12 ? 2 : b.difficulty <= 16 ? 3 : b.difficulty <= 20 ? 4 : 5;
    out[b.type] = Math.max(out[b.type] ?? 0, skulls);
  }
  return out;
}

/** Overall danger: the MAX over the type skulls (Stefan: "approx max" — the
 * killer beat is what actually fails a run). standing 1💀 · road 2💀 · ruins 4💀. */
export function questSkulls(quest: QuestDef): number {
  return Math.max(1, ...Object.values(typeSkulls(quest)));
}

/** Duration display: the KNOWN minimum plus fuzz, never a span (Stefan: "I
 * don't want a known span"). extra = max−min: 0 → "N day(s)", 1–2 → "N+ days",
 * ≥3 → "N++ days" (his examples: 1–3 → "1+", 3–7 → "3++"). */
export function daysLabel(min: number, max: number): string {
  const extra = max - min;
  if (extra <= 0) return `${min} day${min === 1 ? "" : "s"}`;
  return `${min}${extra <= 2 ? "+" : "++"} days`;
}
