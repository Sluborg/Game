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

import { useEffect, useMemo, useState } from "react";
import { Icon, Panel } from "../kit";
import { useGuild } from "../guild/GuildContext";
import { StoryStage } from "../report/StoryStage";
import {
  QUEST_BY_ID,
  PARTY_BY_ID,
  challengeDots,
  questDifficulty,
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

type AutoSpeed = 0 | 1 | 3;

interface OpenStory {
  log: NonNullable<Mail["log"]>;
  partyName: string;
  questTitle: string;
}

export function HallScreen() {
  const { state, shownGold, advance, stepOnce, readMail, build, dismissProposal } = useGuild();
  const [auto, setAuto] = useState<AutoSpeed>(0);
  const [story, setStory] = useState<OpenStory | null>(null);

  const day = dayOf(state.tick);
  const phase = phaseOf(state.tick);
  const pendingDecisions = useMemo(
    () => state.feed.filter((f) => f.register === "decision" && !f.done),
    [state.feed],
  );

  // Auto stalls (without turning off) while anything needs the player — the
  // button says so, closing the "lit but frozen" confusion (Review #2 PX).
  const autoPaused = auto > 0 && (story !== null || pendingDecisions.length > 0);

  // Auto mode: a UI interval stepping single sim events. The SIM never touches
  // the wall clock — this pacing is pure presentation. Auto pauses itself on any
  // open decision, while a story is open, and when the tab is hidden.
  useEffect(() => {
    if (auto === 0 || story || pendingDecisions.length > 0) return;
    const id = window.setInterval(() => stepOnce(), auto === 1 ? 900 : 300);
    return () => window.clearInterval(id);
  }, [auto, story, pendingDecisions.length, stepOnce]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") setAuto(0);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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
          Your heroes live their own lives — rest, train, take quests, come home. Tap{" "}
          <strong>▷ Advance</strong> to skip ahead, or <strong>Auto</strong> to watch it play. Either
          way it stops when something needs you.
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
        onOpen={openStory}
        onBuild={build}
        onDismiss={dismissProposal}
        shownGold={shownGold}
      />

      <div className={styles.controls}>
        {/* No DOM `disabled` flip under the player's finger (haptics mitigation —
            the sim already makes a blocked press a strict no-op); aria-disabled +
            the dimmed data-attr carry the state instead. */}
        <button
          type="button"
          className={styles.advance}
          onClick={advance}
          aria-disabled={pendingDecisions.length > 0}
          data-blocked={pendingDecisions.length > 0}
        >
          <span className={styles.advanceMain}>▷ Advance</span>
          <span className={styles.advanceSub}>
            {pendingDecisions.length > 0 ? "answer what needs you first" : "skips ahead until something needs you"}
          </span>
        </button>
        <button
          type="button"
          className={styles.autoBtn}
          data-on={auto > 0}
          onClick={() => setAuto((a) => (a === 0 ? 1 : a === 1 ? 3 : 0))}
          aria-label={auto === 0 ? "Auto: watch it play, hands-free" : autoPaused ? "Auto paused — needs you" : `Auto: watching at ${auto}x`}
        >
          <span className={styles.autoMain}>{auto === 0 ? "Auto" : autoPaused ? "Paused" : `Auto ${auto}×`}</span>
          <span className={styles.autoSub}>
            {auto === 0 ? "watch it play" : autoPaused ? "needs you" : "watching"}
          </span>
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

function Stars({ quest }: { quest: QuestDef }) {
  const n = questDifficulty(quest);
  return (
    <span className={styles.stars} role="img" aria-label={`difficulty ${n} of 5`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

/** The shared tap-open detail body for a quest row. Reads ONLY the quest def +
 * public assignment fields — never the sealed log (info asymmetry). For an
 * ACTIVE quest the rolled duration is public (the departure feed said it), so
 * the estimate can be exact; "≈" still hedges the bonus-find upside. */
function QuestDetail({ quest, footer, exactDays }: { quest: QuestDef; footer: string; exactDays?: number }) {
  const dots = challengeDots(quest);
  const lo = Math.round((quest.dailyRate * (exactDays ?? quest.minDuration) * BROKERAGE) / 100);
  const hi = Math.round((quest.dailyRate * (exactDays ?? quest.maxDuration) * BROKERAGE) / 100);
  return (
    <div className={styles.questDetail}>
      <span className={styles.detailLine}>
        {(Object.keys(dots) as BeatType[])
          .filter((k) => dots[k] > 0)
          .map((k) => `${BEAT_LABEL[k]} ${"•".repeat(dots[k])}`)
          .join("  ·  ")}
      </span>
      <span className={styles.detailLine}>
        From {quest.giver} · your {BROKERAGE}% ≈ {lo === hi ? `${lo}g` : `${lo}–${hi}g`}
      </span>
      <span className={styles.detailLine}>{footer}</span>
    </div>
  );
}

function QuestsCard({ state }: { state: GuildState }) {
  const [showInfo, setShowInfo] = useState(false);
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
      <button type="button" className={styles.cardHeadBtn} onClick={() => setShowInfo((v) => !v)} aria-expanded={showInfo}>
        <h2 className={styles.cardHead}>
          <Icon name="letter" size={16} /> Quests
        </h2>
        <span className={styles.infoGlyph} aria-hidden>ⓘ</span>
      </button>
      {showInfo && (
        <p className={styles.cardNote}>
          Heroes read the board and choose for themselves — you never assign anyone. The guild takes a
          flat {BROKERAGE}% brokerage on completed quests. Tap a quest for its details.
        </p>
      )}

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
                  {quest.dailyRate}g/day · {quest.minDuration}–{quest.maxDuration} days · <Stars quest={quest} />
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
                  {PARTY_BY_ID[p.id]?.name} are on it · day {dayX} of {a.durationDays} · <Stars quest={quest} />
                </span>
              </button>
              {expandedId === p.id && (
                <QuestDetail quest={quest} exactDays={a.durationDays} footer={`Active — due back ~day ${dayOf(a.returnTick)}.`} />
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
  const [showInfo, setShowInfo] = useState(false);
  const built = state.buildings.tavern;
  const idleBurn = DAILY_UPKEEP - PASSIVE_INCOME;
  const left = shownGold - TAVERN_PRICE;
  // "Ready" = something is buildable AND affordable at DISPLAYED gold (never raw
  // gold — a sealed payout must not announce itself through the chip).
  const ready = !built && shownGold >= TAVERN_PRICE;

  return (
    <Panel as="section" className={styles.card} aria-label="Buildings">
      <button type="button" className={styles.cardHeadBtn} onClick={() => setShowInfo((v) => !v)} aria-expanded={showInfo}>
        <h2 className={styles.cardHead}>
          <Icon name="tavern" size={16} /> Buildings
          {ready && <span className={styles.readyChip}>Ready</span>}
        </h2>
        <span className={styles.infoGlyph} aria-hidden>ⓘ</span>
      </button>
      {showInfo && (
        <p className={styles.cardNote}>
          Buildings have fixed prices — no haggling, no rate-tuning. A built facility captures the coin
          heroes would otherwise spend in the village; takings post to the ledger each night.
        </p>
      )}

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
  onOpen,
  onBuild,
  onDismiss,
  shownGold,
}: {
  state: GuildState;
  pending: FeedItem[];
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
        <div className={styles.needsYou}>
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
