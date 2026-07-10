// HallScreen — the living canvas (DESIGN "The living guild", slice 1). The Hall
// tab shows the world LIVING: a sim-tick clock with a skip-primary driver
// ("▷ Advance" runs to the next decision or nightfall; "Auto" is the optional
// lean-in overlay), a party strip that reads as life, the board the HEROES read
// (observation only — no player verbs on it), the Hall Feed in three registers,
// and the slice's one fixed-price investment (the tavern). Sealed quest
// outcomes open as the StoryStage directly over the Hall (one tap from pause to
// drama); the Report tab stays the archive.
//
// The treasury chip shows displayedGold (via useGuild().shownGold) so a mid-day
// return can never leak its outcome through a visible gold jump (Review #1 B1).

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, InspectChip, InspectPopover, Panel, readPref, savePref, type InspectData } from "../kit";
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

type HallSpeed = "slow" | "normal" | "fast";
const HALL_SPEED_ORDER: HallSpeed[] = ["slow", "normal", "fast"];
const HALL_SPEED_LABEL: Record<HallSpeed, string> = { slow: "Slow", normal: "Normal", fast: "Fast" };
const HALL_SPEED_MS: Record<HallSpeed, number> = { slow: 900, normal: 450, fast: 220 };
const HALL_SPEED_KEY = "guild.ui.hallSpeed";

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
  const [speed, setSpeed] = useState<HallSpeed>(() => readPref(HALL_SPEED_KEY, HALL_SPEED_ORDER, "normal"));
  const [story, setStory] = useState<OpenStory | null>(null);
  const needsYouRef = useRef<HTMLDivElement>(null);

  const day = dayOf(state.tick);
  const phase = phaseOf(state.tick);
  const pendingDecisions = useMemo(
    () => state.feed.filter((f) => f.register === "decision" && !f.done),
    [state.feed],
  );

  // Blocked = latched but gated (decision pending or story open).
  const blocked = playing && (story !== null || pendingDecisions.length > 0);

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
    const next = HALL_SPEED_ORDER[(HALL_SPEED_ORDER.indexOf(speed) + 1) % HALL_SPEED_ORDER.length];
    setSpeed(next);
    savePref(HALL_SPEED_KEY, next);
  };

  const onPlayTap = () => {
    if (blocked) {
      // "Needs you": bring the pinned decisions into view; stay latched.
      needsYouRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPlaying(true);
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
      <header className={styles.topbar}>
        <div className={styles.dayblock}>
          <h1 className={styles.title}>The Guild Hall</h1>
          <span className={styles.day}>
            Day {day} · {PHASE_LABEL[phase]}
          </span>
        </div>
        <Treasury state={state} shownGold={shownGold} />
      </header>

      {state.firstDay && (
        <p className={styles.coach}>
          Your heroes live their own lives — rest, train, take quests, come home. Press{" "}
          <strong>Play</strong>: the days roll by, and it pauses when something needs you.
        </p>
      )}

      <section className={styles.parties} aria-label="Your parties">
        {state.parties.map((p) => (
          <PartyRow key={p.id} runtime={p} tick={state.tick} />
        ))}
      </section>

      <QuestsCard state={state} />
      <BuildingsCard state={state} shownGold={shownGold} onBuild={build} />

      <Feed
        state={state}
        pending={pendingDecisions}
        needsYouRef={needsYouRef}
        onOpen={openStory}
        onBuild={build}
        onDismiss={dismissProposal}
        shownGold={shownGold}
      />

      <div className={styles.controls}>
        {/* Play-primary driver (Stefan): wide Play, explicit Pause, one Speed
            chip. Main text only — no subtitles. Blocked state swaps Play's
            LABEL to "Needs you" (a label, not a subtitle) and tapping it
            scrolls the pinned decisions into view. No DOM `disabled` flips
            under the finger (haptics) — aria-disabled + data-attrs only. */}
        <button
          type="button"
          className={styles.playBtn}
          onClick={onPlayTap}
          aria-pressed={playing}
          data-on={playing && !blocked}
          data-blocked={blocked}
        >
          {blocked ? "Needs you" : playing ? "Playing…" : "▶ Play"}
        </button>
        <button
          type="button"
          className={styles.pauseBtn}
          onClick={() => setPlaying(false)}
          aria-disabled={!playing}
          data-dim={!playing}
        >
          Pause
        </button>
        <button
          type="button"
          className={styles.speedBtn}
          onClick={cycleSpeed}
          aria-label={`Speed: ${HALL_SPEED_LABEL[speed]} — tap to change`}
        >
          {HALL_SPEED_LABEL[speed]}
        </button>
      </div>

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

function Treasury({ state, shownGold }: { state: GuildState; shownGold: number }) {
  // Runway comes from the last nightly ledger; while any sealed return is
  // unopened its tally stays hidden (the sim stores it raw — Codex R#34).
  const ledger = lastLedger(state);
  const pending = state.mail.some((m) => m.kind === "outcome" && !m.read);
  const runway = pending ? "Open your reports for the tally." : (ledger?.runwayNote ?? "The books open fresh.");
  return (
    <div className={styles.treasury} aria-label={`Treasury ${shownGold} gold`}>
      <span className={styles.gold}>
        <Icon name="gold" size={16} /> {shownGold}g
      </span>
      <span className={styles.runway}>{runway}</span>
    </div>
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

function QuestsCard({ state }: { state: GuildState }) {
  const [info, setInfo] = useState<InspectData | null>(null);
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
        onClick={(e) =>
          setInfo((cur) =>
            cur?.id === "quests"
              ? null
              : {
                  id: "quests",
                  anchor: e.currentTarget,
                  title: "Quests",
                  effect: `Heroes read the board and choose for themselves — you never assign anyone. The guild takes a flat ${BROKERAGE}% brokerage on completed quests. Tap a quest for its details.`,
                },
          )
        }
      >
        <h2 className={styles.cardHead}>
          <Icon name="letter" size={16} /> Quests
        </h2>
        <span className={styles.infoGlyph} aria-hidden>ⓘ</span>
      </InspectChip>
      <InspectPopover data={info} onClose={() => setInfo(null)} />

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
}: {
  state: GuildState;
  shownGold: number;
  onBuild: () => void;
}) {
  const [info, setInfo] = useState<InspectData | null>(null);
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
        onClick={(e) =>
          setInfo((cur) =>
            cur?.id === "buildings"
              ? null
              : {
                  id: "buildings",
                  anchor: e.currentTarget,
                  title: "Buildings",
                  effect:
                    "Fixed prices — no haggling, no rate-tuning. A built facility captures the coin heroes would otherwise spend in the village; takings post to the ledger each night.",
                },
          )
        }
      >
        <h2 className={styles.cardHead}>
          <Icon name="tavern" size={16} /> Buildings
          {ready && <span className={styles.readyChip}>Ready</span>}
        </h2>
        <span className={styles.infoGlyph} aria-hidden>ⓘ</span>
      </InspectChip>
      <InspectPopover data={info} onClose={() => setInfo(null)} />

      <ul className={styles.buildings}>
        <li className={styles.building}>
          <span className={styles.investName}>Guild Hall</span>
          <span className={styles.investNote}>Your seat. Brings in +{PASSIVE_INCOME}g/day.</span>
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
                <span className={styles.investName}>Tavern — {TAVERN_PRICE}g, fixed price</span>
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

      {byDay.map(([d, items]) => (
        <FeedDay key={d} day={d} items={items} today={d === today} onOpen={onOpen} onBuild={onBuild} onDismiss={onDismiss} shownGold={shownGold} />
      ))}

      {state.feedTrimmed && <p className={styles.faded}>(older happenings have faded from memory)</p>}
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
