// HallScreen — the living canvas (DESIGN "The living guild", slice 1). The Hall
// tab shows the world LIVING: a sim-tick clock driven from the sticky header
// (one Play⇄Pause toggle + a ▶/▶▶/▶▶▶ speed chip — Stefan, PR #39; no bottom
// bar), a party strip that reads as life, the board the HEROES read
// (observation only — no player verbs on it), the Hall Feed in three registers,
// and the slice's one fixed-price investment (the tavern). Sealed quest
// outcomes open as the StoryStage directly over the Hall (one tap from pause to
// drama); the Report tab stays the archive.
//
// The treasury chip shows displayedGold (via useGuild().shownGold) so a mid-day
// return can never leak its outcome through a visible gold jump (Review #1 B1).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Icon,
  InspectChip,
  InspectPopover,
  Panel,
  PauseGlyph,
  PlayGlyph,
  SpeedChip,
  TIME_SPEED_ORDER,
  readPref,
  savePref,
  type InspectData,
  type TimeSpeed,
} from "../kit";
import { useGuild } from "../guild/GuildContext";
import { StoryStage } from "../report/StoryStage";
import {
  QUEST_BY_ID,
  PARTY_BY_ID,
  typeSkulls,
  questSkulls,
  daysLabel,
  dayOf,
  phaseOf,
  lastLedger,
  TAVERN_PRICE,
  DAILY_UPKEEP,
  PASSIVE_INCOME,
  BROKERAGE,
  type Assignment,
  type BeatType,
  type FeedItem,
  type GuildState,
  type Mail,
  type PartyRuntime,
  type QuestDef,
} from "../../game/guild";
import styles from "./HallScreen.module.css";

const PHASE_LABEL: Record<string, string> = {
  dawn: "Dawn",
  midday: "Midday",
  dusk: "Dusk",
  night: "Night",
};

const BEAT_LABEL: Record<BeatType, string> = {
  investigation: "Investigation",
  travel: "Travel",
  social: "Social",
  combat: "Combat",
};

const HALL_SPEED_MS: Record<TimeSpeed, number> = { slow: 900, normal: 450, fast: 220 };
const HALL_SPEED_KEY = "guild.ui.hallSpeed";
/** Persisted first-press flag: the toggle invites with "Play" only before the
 * very first press EVER — a ref regressed to "Play" on every remount (nav
 * away/back), and sim-side derivations lie (several events share tick 0), so
 * this is a UI pref like the speed (R#2 Adversary B1). */
const EVER_PLAYED_KEY = "guild.ui.hallEverPlayed";
/** Feed render cap — today + the last two collapsed days. */
const FEED_RENDER_DAYS = 3;

interface OpenStory {
  log: NonNullable<Mail["log"]>;
  partyName: string;
  questTitle: string;
}

export function HallScreen() {
  const { state, shownGold, stepOnce, readMail, build, dismissProposal } = useGuild();
  // The PINNED driver state machine (Review #1): `playing` LATCHES through a
  // decision-pause (interval gated below, resumes when the decision resolves);
  // tab-hide HARD-disarms (no surprise resume). Speed is a UI-only pref.
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<TimeSpeed>(() => readPref(HALL_SPEED_KEY, TIME_SPEED_ORDER, "normal"));
  const [everPlayed, setEverPlayed] = useState(() => readPref(EVER_PLAYED_KEY, ["yes", "no"], "no") === "yes");
  const [story, setStory] = useState<OpenStory | null>(null);
  // ONE popover for the whole Hall (the HeroCard pattern the kit assumes) —
  // per-card state let two parchment boxes stack (Review #2 Designer B1).
  const [info, setInfo] = useState<InspectData | null>(null);
  const needsYouRef = useRef<HTMLDivElement>(null);

  const day = dayOf(state.tick);
  const phase = phaseOf(state.tick);
  const pendingDecisions = useMemo(
    () => state.feed.filter((f) => f.register === "decision" && !f.done),
    [state.feed],
  );

  // Blocked = latched but gated (decision pending or story open).
  const blocked = playing && (story !== null || pendingDecisions.length > 0);

  // Runway detail is computed EVERY render and patched into the open popover
  // below — a click-time snapshot goes stale while the sim keeps running and
  // visibly contradicts the live header gold (R#2 Adversary B2). Masks while
  // any sealed outcome is pending; shownGold only, never raw gold.
  const ledgerMail = lastLedger(state);
  const sealedPending = state.mail.some((m) => m.kind === "outcome" && !m.read);
  const runwayDetail = sealedPending
    ? "The tally hides until tonight's reports are opened."
    : ledgerMail
      ? `The recurring trend is ${runwayRecurring(ledgerMail) >= 0 ? "+" : ""}${runwayRecurring(ledgerMail)}g a night (one-off works excluded). Treasury ${shownGold}g.`
      : "No ledger yet — the first closes tonight.";

  useEffect(() => {
    if (!playing || story || pendingDecisions.length > 0) return;
    const id = window.setInterval(() => stepOnce(), HALL_SPEED_MS[speed]);
    return () => window.clearInterval(id);
  }, [playing, story, pendingDecisions.length, speed, stepOnce]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const cycleSpeed = () => {
    const next = TIME_SPEED_ORDER[(TIME_SPEED_ORDER.indexOf(speed) + 1) % TIME_SPEED_ORDER.length];
    setSpeed(next);
    savePref(HALL_SPEED_KEY, next);
  };

  // ONE toggle (Stefan, PR #39). Branch order is PINNED (Review #1 Engineer
  // B1): blocked wins over playing — a "Needs you" tap scrolls and STAYS
  // latched (unlatch variants provably misfire: Adversary B1); resolving the
  // decision is what resumes time, and the interval's first fire waits one
  // full speed period, so "⏸ Pause" is tappable for a beat after unblocking.
  const onToggleTap = () => {
    if (blocked) {
      needsYouRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    if (!everPlayed) {
      setEverPlayed(true);
      savePref(EVER_PLAYED_KEY, "yes");
    }
    // Latching with decisions already pending: show the player WHY it won't run.
    if (pendingDecisions.length > 0) {
      needsYouRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const openStory = (mailId: string | undefined) => {
    if (!mailId) return;
    const mail = state.mail.find((m) => m.id === mailId);
    if (!mail?.log) return;
    readMail(mailId);
    setStory({ log: mail.log, partyName: mail.partyName ?? "The party", questTitle: mail.questTitle ?? "the quest" });
  };

  return (
    <div className={styles.screen}>
      {/* The driver lives IN the sticky header (Stefan, PR #39): toggle +
          speed chip take the left half, Day·Phase + gold the right; the
          runway rides a thin full-width line below. The h1 goes visually
          hidden — screen readers keep the landmark, the pixels go to play. */}
      <header className={styles.topbar}>
        <h1 className={styles.srOnly}>The Guild Hall</h1>
        <div className={styles.topRow}>
          <div className={styles.driver}>
            {/* STATE labels, state-matched glyphs (Stefan: action labels "feel
                reversed"): running = "▶ Playing", stopped = "⏸ Paused", the
                very first visit invites with "▶ Play". Color carries the state
                too — playing is lit gold, paused is dim (Review #1 PX). */}
            <button
              type="button"
              className={styles.playBtn}
              onClick={onToggleTap}
              aria-pressed={playing && !blocked}
              data-on={playing && !blocked}
              data-blocked={blocked}
            >
              {blocked ? (
                "Needs you"
              ) : playing ? (
                <>
                  <PlayGlyph /> Playing
                </>
              ) : !everPlayed ? (
                // Before the first press EVER (persisted pref — survives
                // remounts and reloads: R#2 Adversary B1) the toggle invites;
                // after that, stopped is a STATE: "Paused".
                <>
                  <PlayGlyph /> Play
                </>
              ) : (
                <>
                  <PauseGlyph /> Paused
                </>
              )}
            </button>
            <SpeedChip speed={speed} onCycle={cycleSpeed} context="Hall speed" />
          </div>
          <div className={styles.status}>
            <span className={styles.day}>
              Day {day} · {PHASE_LABEL[phase]}
            </span>
            <span className={styles.gold} aria-label={`Treasury ${shownGold} gold`}>
              <Icon name="gold" size={16} /> {shownGold}g
            </span>
          </div>
        </div>
        <Runway state={state} setInfo={setInfo} active={info?.id === "runway"} detail={runwayDetail} />
      </header>

      {/* The first-day coach paragraph is GONE (Stefan: "remove the start text
          that heroes act on their own. we will add tutorial later."). Designer
          flagged the cold start as a risk — accepted, player-directed; the
          first-visit "▶ Play" toggle label is the remaining affordance. */}

      <section className={styles.parties} aria-label="Your parties">
        {state.parties.map((p) => (
          <PartyRow key={p.id} runtime={p} tick={state.tick} />
        ))}
      </section>

      <QuestsCard state={state} info={info} setInfo={setInfo} />
      <BuildingsCard state={state} shownGold={shownGold} onBuild={build} info={info} setInfo={setInfo} />

      <Feed
        state={state}
        pending={pendingDecisions}
        needsYouRef={needsYouRef}
        onOpen={openStory}
        onBuild={build}
        onDismiss={dismissProposal}
        shownGold={shownGold}
      />

      {/* The runway popover gets LIVE content (recomputed each render); every
          other explainer is static text, safe as a snapshot. */}
      <InspectPopover
        data={info?.id === "runway" ? { ...info, effect: runwayDetail } : info}
        onClose={() => setInfo(null)}
      />

      {story && (
        <StoryStage
          log={story.log}
          partyName={story.partyName}
          questTitle={story.questTitle}
          onClose={() => setStory(null)}
        />
      )}
    </div>
  );
}

/** Recurring nightly trend from a ledger mail (one-off works excluded). */
function runwayRecurring(mail: Mail): number {
  return mail.ledger?.reduce((s, e) => s + (e.oneOff ? 0 : e.amount), 0) ?? 0;
}

function Runway({
  state,
  setInfo,
  active,
  detail,
}: {
  state: GuildState;
  setInfo: React.Dispatch<React.SetStateAction<InspectData | null>>;
  active: boolean;
  detail: string;
}) {
  // Runway comes from the last nightly ledger; while any sealed return is
  // unopened its tally stays hidden (the sim stores it raw — Codex R#34).
  // The line is NARRATED (Stefan: "the gold per day is a bit confusing at the
  // top") — the actual per-night number lives behind a tap, and while sealed
  // reports are pending the popover masks too (never leak through the detail).
  const ledger = lastLedger(state);
  const pending = state.mail.some((m) => m.kind === "outcome" && !m.read);
  const runway = pending ? "Open your reports for the tally." : (ledger?.runwayNote ?? "The books open fresh.");
  return (
    <InspectChip
      className={styles.runwayBtn}
      active={active}
      onClick={(e) => {
        const anchor = e.currentTarget;
        setInfo((cur) => (cur?.id === "runway" ? null : { id: "runway", anchor, title: "The books", effect: detail }));
      }}
    >
      <span className={styles.runway}>{runway}</span>
    </InspectChip>
  );
}

function partyStatus(runtime: PartyRuntime, tick: number): { icon: Parameters<typeof Icon>[0]["name"]; text: string } {
  const a = runtime.assignment;
  if (a) {
    if (a.tier === "standing") return { icon: "watch", text: `On a shift — ${a.questTitle}` };
    const dayNow = dayOf(tick);
    const dayX = dayNow - dayOf(a.dispatchedTick) + 1;
    return { icon: "depart", text: `Out — ${a.questTitle} · day ${Math.min(dayX, a.durationDays)} of ${a.durationDays}` };
  }
  if (runtime.activity) {
    return runtime.activity.kind === "rest"
      ? { icon: "rest", text: "Resting" }
      : { icon: "train", text: "Training" };
  }
  // A lone hero gets the single meeple, not the party cluster (Stefan).
  const solo = (PARTY_BY_ID[runtime.id]?.memberIds.length ?? 1) === 1;
  return { icon: solo ? "hero" : "party", text: "In the hall" };
}

function PartyRow({ runtime, tick }: { runtime: PartyRuntime; tick: number }) {
  const status = partyStatus(runtime, tick);
  return (
    <div className={styles.partyRow}>
      {/* key on the status text replays the pulse whenever the state changes */}
      <span key={status.text} className={styles.partyStatus}>
        <Icon name={status.icon} size={16} />
        <strong>{PARTY_BY_ID[runtime.id]?.name ?? runtime.id}</strong>
        <span className={styles.partyText}>{status.text}</span>
      </span>
    </div>
  );
}

const TYPE_ICON: Record<BeatType, "typeInvestigation" | "typeTravel" | "typeSocial" | "typeCombat"> = {
  investigation: "typeInvestigation",
  travel: "typeTravel",
  social: "typeSocial",
  combat: "typeCombat",
};

/** A row of skull glyphs (Kenney sprite, mask-tinted — never the emoji). */
function Skulls({ n, label }: { n: number; label: string }) {
  return (
    <span className={styles.skulls} role="img" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        <Icon key={i} name="skull" size={14} />
      ))}
    </span>
  );
}

/** The shared tap-open detail body for a quest row: one line per challenge
 * type (icon + name + skulls). Reads ONLY the quest def + public assignment
 * fields — never the sealed log (info asymmetry). */
function QuestDetail({ quest, footer }: { quest: QuestDef; footer: string }) {
  const skulls = typeSkulls(quest);
  const cut = Math.round((quest.reward * BROKERAGE) / 100);
  return (
    <div className={styles.questDetail}>
      {(Object.keys(skulls) as BeatType[]).map((k) => (
        <span key={k} className={styles.typeRow}>
          <Icon name={TYPE_ICON[k]} size={15} />
          <span className={styles.typeName}>{BEAT_LABEL[k]}</span>
          <Skulls n={skulls[k]!} label={`danger ${skulls[k]} of 5`} />
        </span>
      ))}
      <span className={styles.detailLine}>
        From {quest.giver} · your {BROKERAGE}% ≈ {cut}g
      </span>
      <span className={styles.detailLine}>{footer}</span>
    </div>
  );
}

function QuestsCard({
  state,
  info,
  setInfo,
}: {
  state: GuildState;
  info: InspectData | null;
  setInfo: React.Dispatch<React.SetStateAction<InspectData | null>>;
}) {
  // One expanded row at a time, keyed by stable id (posting.id / party.id) — a
  // row that vanishes mid-Advance just stops matching, harmlessly.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const active = state.parties.filter(
    (p): p is PartyRuntime & { assignment: Assignment } => !!p.assignment && p.assignment.tier !== "standing",
  );
  const today = dayOf(state.tick);

  return (
    <Panel as="section" className={styles.card} aria-label="Quests">
      <InspectChip
        className={styles.cardHeadBtn}
        active={info?.id === "quests"}
        onClick={(e) => {
          const anchor = e.currentTarget;
          setInfo((cur) =>
            cur?.id === "quests"
              ? null
              : {
                  id: "quests",
                  anchor,
                  title: "Quests",
                  effect: `Heroes read the board and choose for themselves — you never assign anyone. The guild takes a flat ${BROKERAGE}% brokerage on completed quests. Tap a quest for its details.`,
                },
          );
        }}
      >
        <h2 className={styles.cardHead}>
          <Icon name="letter" size={16} /> Quests
        </h2>
        <span className={styles.infoGlyph} aria-hidden>ⓘ</span>
      </InspectChip>

      {state.board.length === 0 && active.length === 0 && (
        <p className={styles.cardNote}>Nothing posted — fresh letters arrive most mornings.</p>
      )}

      <ul className={styles.postings}>
        {state.board.map((p) => {
          const quest = QUEST_BY_ID[p.questId];
          return (
            <li key={p.id}>
              <button type="button" className={styles.questRow} onClick={() => toggle(p.id)} aria-expanded={expandedId === p.id}>
                <span className={styles.postingTitle}>{p.title}</span>
                <span className={styles.postingMeta}>
                  {quest.reward}g · {daysLabel(quest.minDuration, quest.maxDuration)} ·{" "}
                  <Skulls n={questSkulls(quest)} label={`danger ${questSkulls(quest)} of 5`} />
                  {p.daysLeft <= 1 && " · last day"}
                </span>
              </button>
              {expandedId === p.id && (
                <QuestDetail
                  quest={quest}
                  footer={
                    p.daysLeft <= 1
                      ? "Open — withdrawn tonight if nobody takes it."
                      : `Open — withdrawn in ${p.daysLeft} days if nobody takes it.`
                  }
                />
              )}
            </li>
          );
        })}
        {active.map((p) => {
          const a = p.assignment;
          const quest = QUEST_BY_ID[a.questId];
          const dayX = Math.min(today - dayOf(a.dispatchedTick) + 1, a.durationDays);
          return (
            <li key={p.id}>
              <button
                type="button"
                className={styles.questRow}
                data-active="true"
                onClick={() => toggle(p.id)}
                aria-expanded={expandedId === p.id}
              >
                <span className={styles.postingTitle}>
                  <Icon name="depart" size={14} /> {a.questTitle}
                </span>
                <span className={styles.postingMeta}>
                  {PARTY_BY_ID[p.id]?.name} are on it · day {dayX} of {a.durationDays} ·{" "}
                  <Skulls n={questSkulls(quest)} label={`danger ${questSkulls(quest)} of 5`} />
                </span>
              </button>
              {expandedId === p.id && (
                <QuestDetail quest={quest} footer={`Active — due back ~day ${dayOf(a.returnTick)}.`} />
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function BuildingsCard({
  state,
  shownGold,
  onBuild,
  info,
  setInfo,
}: {
  state: GuildState;
  shownGold: number;
  onBuild: () => void;
  info: InspectData | null;
  setInfo: React.Dispatch<React.SetStateAction<InspectData | null>>;
}) {
  const built = state.buildings.tavern;
  const idleBurn = DAILY_UPKEEP - PASSIVE_INCOME;
  const left = shownGold - TAVERN_PRICE;
  // "Ready" = something is buildable AND affordable at DISPLAYED gold (never raw
  // gold — a sealed payout must not announce itself through the chip).
  const ready = !built && shownGold >= TAVERN_PRICE;

  return (
    <Panel as="section" className={styles.card} aria-label="Buildings">
      <InspectChip
        className={styles.cardHeadBtn}
        active={info?.id === "buildings"}
        onClick={(e) => {
          const anchor = e.currentTarget;
          setInfo((cur) =>
            cur?.id === "buildings"
              ? null
              : {
                  id: "buildings",
                  anchor,
                  title: "Buildings",
                  effect:
                    "The steward names one honest price for each work — paid once, and the hall is yours. A built hall captures the coin heroes would otherwise spend in the village; the takings post to the ledger each night.",
                },
          );
        }}
      >
        <h2 className={styles.cardHead}>
          <Icon name="tavern" size={16} /> Buildings
          {ready && <span className={styles.readyChip}>Ready</span>}
        </h2>
        <span className={styles.infoGlyph} aria-hidden>ⓘ</span>
      </InspectChip>

      <ul className={styles.buildings}>
        <li className={styles.building}>
          <span className={styles.investName}>Guild Hall</span>
          <span className={styles.investNote}>Your seat. Steady rents bring in {PASSIVE_INCOME}g a day.</span>
        </li>
        <li className={styles.building}>
          {built ? (
            <>
              <span className={styles.investName}>Tavern — open</span>
              <span className={styles.investNote}>
                A place for heroes to drink, play games and enjoy themselves. Their coin lands in your till.
              </span>
            </>
          ) : (
            <div className={styles.invest}>
              <div className={styles.investText}>
                <span className={styles.investName}>Tavern — {TAVERN_PRICE}g</span>
                <span className={styles.investNote}>
                  A place for heroes to drink, play games and enjoy themselves. Hero coin lands in your till.{" "}
                  {left >= 0
                    ? `Leaves ${left}g ≈ ${Math.max(1, Math.floor(left / idleBurn))} days' upkeep.`
                    : `You're ${-left}g short.`}
                </span>
              </div>
              {/* Gated on shownGold, not raw gold — must not leak a sealed payout */}
              <button type="button" className={styles.buildBtn} onClick={onBuild} disabled={shownGold < TAVERN_PRICE}>
                Build
              </button>
            </div>
          )}
        </li>
      </ul>
    </Panel>
  );
}

function Feed({
  state,
  pending,
  needsYouRef,
  onOpen,
  onBuild,
  onDismiss,
  shownGold,
}: {
  state: GuildState;
  pending: FeedItem[];
  needsYouRef: React.RefObject<HTMLDivElement>;
  onOpen: (mailId: string | undefined) => void;
  onBuild: () => void;
  onDismiss: () => void;
  shownGold: number;
}) {
  const today = dayOf(state.tick);
  // Group by day, newest day first; feed is already newest-first within a day.
  const byDay = useMemo(() => {
    const map = new Map<number, FeedItem[]>();
    for (const f of state.feed) {
      const list = map.get(f.day) ?? [];
      list.push(f);
      map.set(f.day, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [state.feed]);

  // Render cap: today + the last two collapsed days (Stefan: "all the old
  // days are piling up"). The cap slices the GROUPED output, never state.feed
  // itself — the pinned "Needs you" strip above filters the FULL feed, so an
  // undone decision can never be hidden by this (Review #1 Adversary).
  const shownDays = byDay.slice(0, FEED_RENDER_DAYS);
  const capped = byDay.length > FEED_RENDER_DAYS;

  return (
    <section className={styles.feed} aria-label="Hall feed">
      {pending.length > 0 && (
        <div className={styles.needsYou} ref={needsYouRef}>
          <h2 className={styles.needsHead}>Needs you</h2>
          {pending.map((f) => (
            <DecisionRow key={f.id} item={f} onOpen={onOpen} onBuild={onBuild} onDismiss={onDismiss} shownGold={shownGold} />
          ))}
        </div>
      )}

      {shownDays.map(([d, items]) => (
        <FeedDay key={d} day={d} items={items} today={d === today} onOpen={onOpen} onBuild={onBuild} onDismiss={onDismiss} shownGold={shownGold} />
      ))}

      {/* Honest for BOTH cases: render-capped days still exist off-screen,
          sim-trimmed ones are gone for good — "folded away" covers each
          without claiming the ledgers keep narrative lines (R#2 Adversary N1). */}
      {(capped || state.feedTrimmed) && <p className={styles.faded}>(older days have folded away)</p>}
    </section>
  );
}

function FeedDay({
  day,
  items,
  today,
  onOpen,
  onBuild,
  onDismiss,
  shownGold,
}: {
  day: number;
  items: FeedItem[];
  today: boolean;
  onOpen: (mailId: string | undefined) => void;
  onBuild: () => void;
  onDismiss: () => void;
  shownGold: number;
}) {
  // The CURRENT day renders expanded and its lines stream in (Review #1 B15);
  // completed days collapse to a digest row. UNDONE decisions render only in
  // the pinned "Needs you" section — showing them here too would double-nag;
  // they rejoin their day as a record once resolved.
  const [open, setOpen] = useState(false);
  const expanded = today || open;
  const shown = items.filter((f) => f.register !== "decision" || f.done);
  return (
    <div className={styles.feedDay}>
      {today ? (
        <h3 className={styles.feedDayHead}>Day {day}</h3>
      ) : (
        <button type="button" className={styles.feedDayToggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          Day {day} — {shown.length} moment{shown.length === 1 ? "" : "s"} <span aria-hidden>{open ? "▾" : "▸"}</span>
        </button>
      )}
      {expanded && shown.length > 0 && (
        <ul className={styles.feedList}>
          {shown.map((f, i) => (
            <li
              key={f.id}
              className={styles.feedItem}
              data-register={f.register}
              // Stream-in: newest lines stagger so a batch reads as life, not a log dump.
              style={today ? { animationDelay: `${Math.min(i, 5) * 120}ms` } : undefined}
            >
              {f.register === "decision" ? (
                <DecisionRow item={f} onOpen={onOpen} onBuild={onBuild} onDismiss={onDismiss} shownGold={shownGold} />
              ) : (
                <span className={styles.feedLine}>
                  <Icon name={f.icon} size={16} />
                  <span>{f.text}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DecisionRow({
  item,
  onOpen,
  onBuild,
  onDismiss,
  shownGold,
}: {
  item: FeedItem;
  onOpen: (mailId: string | undefined) => void;
  onBuild: () => void;
  onDismiss: () => void;
  shownGold: number;
}) {
  return (
    <div className={styles.decision} data-done={!!item.done}>
      <span className={styles.feedLine}>
        <Icon name={item.icon} size={16} />
        <span>{item.text}</span>
      </span>
      {!item.done && item.action === "open-report" && (
        <button type="button" className={styles.decisionBtn} onClick={() => onOpen(item.mailId)}>
          Open the report ›
        </button>
      )}
      {!item.done && item.action === "tavern" && (
        <span className={styles.decisionBtns}>
          <button type="button" className={styles.decisionBtn} onClick={onBuild} disabled={shownGold < TAVERN_PRICE}>
            Build — {TAVERN_PRICE}g
          </button>
          <button type="button" className={styles.decisionBtnGhost} onClick={onDismiss}>
            Not yet
          </button>
        </span>
      )}
      {item.done && <span className={styles.decisionDone}>{item.action === "tavern" ? "answered" : "opened"}</span>}
    </div>
  );
}
