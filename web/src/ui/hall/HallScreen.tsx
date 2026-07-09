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
  dayOf,
  phaseOf,
  lastLedger,
  TAVERN_PRICE,
  DAILY_UPKEEP,
  PASSIVE_INCOME,
  type BeatType,
  type FeedItem,
  type GuildState,
  type Mail,
  type PartyRuntime,
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
          <strong>▷ Advance</strong>: the day plays out and stops when something needs you.
        </p>
      )}

      <section className={styles.parties} aria-label="Your parties">
        {state.parties.map((p) => (
          <PartyRow key={p.id} runtime={p} tick={state.tick} />
        ))}
      </section>

      <BoardCard state={state} />
      <InvestCard
        state={state}
        shownGold={shownGold}
        onBuild={build}
      />

      <Feed
        state={state}
        pending={pendingDecisions}
        onOpen={openStory}
        onBuild={build}
        onDismiss={dismissProposal}
        shownGold={shownGold}
      />

      <div className={styles.controls}>
        <button type="button" className={styles.advance} onClick={advance}>
          <span className={styles.advanceMain}>▷ Advance</span>
          <span className={styles.advanceSub}>to the next event</span>
        </button>
        <button
          type="button"
          className={styles.autoBtn}
          data-on={auto > 0}
          onClick={() => setAuto((a) => (a === 0 ? 1 : a === 1 ? 3 : 0))}
          aria-label={auto === 0 ? "Auto advance off" : `Auto advance ${auto}x`}
        >
          {auto === 0 ? "Auto" : `Auto ${auto}×`}
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
  return { icon: "party", text: "In the hall" };
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

function BoardCard({ state }: { state: GuildState }) {
  return (
    <Panel as="section" className={styles.card} aria-label="The quest board">
      <h2 className={styles.cardHead}>
        <Icon name="letter" size={16} /> The board
      </h2>
      {state.board.length === 0 && <p className={styles.cardNote}>Bare — fresh letters arrive most mornings.</p>}
      <ul className={styles.postings}>
        {state.board.map((p) => {
          const quest = QUEST_BY_ID[p.tier];
          const dots = challengeDots(quest);
          const primary = (Object.keys(dots) as BeatType[]).reduce((a, b) => (dots[b] > dots[a] ? b : a));
          return (
            <li key={p.id} className={styles.posting}>
              <span className={styles.postingTitle}>{p.title}</span>
              <span className={styles.postingMeta}>
                {quest.dailyRate}g/day · {quest.minDuration}–{quest.maxDuration} days · {BEAT_LABEL[primary]}-heavy ·{" "}
                {p.daysLeft} day{p.daysLeft === 1 ? "" : "s"} till withdrawn
              </span>
            </li>
          );
        })}
      </ul>
      <p className={styles.cardNote}>Heroes read the board and choose for themselves — you take a flat 10% brokerage.</p>
    </Panel>
  );
}

function InvestCard({
  state,
  shownGold,
  onBuild,
}: {
  state: GuildState;
  shownGold: number;
  onBuild: () => void;
}) {
  const built = state.buildings.tavern;
  const idleBurn = DAILY_UPKEEP - PASSIVE_INCOME;
  const left = shownGold - TAVERN_PRICE;
  return (
    <Panel as="section" className={styles.card} aria-label="Investments">
      <h2 className={styles.cardHead}>
        <Icon name="tavern" size={16} /> Investments
      </h2>
      {built ? (
        <p className={styles.cardNote}>
          <strong>The tavern is open.</strong> Hero coin spent resting lands in your till — takings post to the ledger
          each night.
        </p>
      ) : (
        <div className={styles.invest}>
          <div className={styles.investText}>
            <span className={styles.investName}>Tavern — {TAVERN_PRICE}g, fixed price</span>
            <span className={styles.investNote}>
              Captures what heroes drink away in the village.{" "}
              {left >= 0
                ? `Leaves ${left}g ≈ ${Math.max(1, Math.floor(left / idleBurn))} days' upkeep.`
                : `You're ${-left}g short.`}
            </span>
          </div>
          {/* Gated on shownGold, not raw gold — the button must not leak a sealed payout */}
          <button type="button" className={styles.buildBtn} onClick={onBuild} disabled={shownGold < TAVERN_PRICE}>
            Build
          </button>
        </div>
      )}
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
