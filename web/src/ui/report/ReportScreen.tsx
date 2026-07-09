// ReportScreen — the Report tab: the ARCHIVE of reveals, newest night on top.
// Under the pivot the Hall Feed is the living surface and sealed stories open
// there too; this tab keeps every envelope replayable. A returning-quest outcome
// is a SEALED envelope whose teaser withholds the result until opened in the
// StoryStage (so the summary can't spoil the drama, §4). The nightly ledger is
// the one fully-spelled entry (itemized + runway).

import { useMemo, useState } from "react";
import { useGuild } from "../guild/GuildContext";
import { StoryStage } from "./StoryStage";
import { dayOf, type AdventureLog, type Mail } from "../../game/guild";
import styles from "./ReportScreen.module.css";

interface OpenStory {
  log: AdventureLog;
  partyName: string;
  questTitle: string;
}

export function ReportScreen() {
  const { state, readMail } = useGuild();
  const [story, setStory] = useState<OpenStory | null>(null);

  // Group mail by day, newest day first; within a day keep insertion order.
  const byDay = useMemo(() => {
    const map = new Map<number, Mail[]>();
    for (const m of state.mail) {
      const list = map.get(m.day) ?? [];
      list.push(m);
      map.set(m.day, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [state.mail]);

  // Which mail envelopes have been opened — used to keep a sealed quest's ledger
  // cut masked until its story has been watched (don't spoil the reveal, §4).
  const readIds = useMemo(() => new Set(state.mail.filter((m) => m.read).map((m) => m.id)), [state.mail]);

  // The earliest day with a still-sealed outcome. EVERY ledger from that day on
  // must withhold its tally: a later night's endGold would otherwise let the
  // player back-solve the hidden payout (day-4 endGold + visible day-5/6 lines
  // − day-6 endGold = the sealed cut) — the R#34 leak through the side door
  // (Review #2 Adversary). The Tavern-takings amount is masked too: the forced
  // post-return decompress spend sizes the reward (Review #2 Designer).
  const sealedSinceDay = useMemo(() => {
    let min = Infinity;
    for (const m of state.mail) {
      if (m.kind === "outcome" && !m.read) min = Math.min(min, m.day);
    }
    return min;
  }, [state.mail]);

  const openStory = (m: Mail) => {
    if (!m.log) return;
    readMail(m.id);
    setStory({ log: m.log, partyName: m.partyName ?? "The party", questTitle: m.questTitle ?? "the quest" });
  };

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>Report</h1>
        <span className={styles.day}>Day {dayOf(state.tick)}</span>
      </header>

      {byDay.length === 0 && <p className={styles.empty}>No mail yet. Advance the day in the Hall — reports and ledgers land here.</p>}

      {byDay.map(([day, items]) => (
        <section key={day} className={styles.night} aria-label={`Day ${day}`}>
          <h2 className={styles.nightHead}>Day {day}</h2>
          <ul className={styles.list}>
            {items.map((m) => (
              <li key={m.id}>
                <MailRow mail={m} readIds={readIds} sealedSinceDay={sealedSinceDay} onOpen={() => openStory(m)} onRead={() => readMail(m.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {story && (
        <StoryStage log={story.log} partyName={story.partyName} questTitle={story.questTitle} onClose={() => setStory(null)} />
      )}
    </div>
  );
}

function MailRow({
  mail,
  readIds,
  sealedSinceDay,
  onOpen,
  onRead,
}: {
  mail: Mail;
  readIds: Set<string>;
  sealedSinceDay: number;
  onOpen: () => void;
  onRead: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (mail.kind === "outcome") {
    // Sealed: the teaser withholds the outcome until opened in the story.
    return (
      <button type="button" className={styles.envelope} data-sealed={!mail.read} onClick={onOpen}>
        <span className={styles.seal} aria-hidden>{mail.read ? "✉" : "✦"}</span>
        <span className={styles.envText}>
          <span className={styles.envTeaser}>{mail.teaser}</span>
          <span className={styles.envCta}>{mail.read ? "Replay the story ›" : "Open the report ›"}</span>
        </span>
      </button>
    );
  }

  if (mail.kind === "ledger") {
    // While ANY outcome from this ledger's day or earlier is still sealed,
    // withhold the net/treasury/runway tally — this ledger's OR any later
    // night's, else the tally can be back-solved to reveal the hidden payout
    // before its story is opened (Codex R#34; Review #2 Adversary).
    const pending = sealedSinceDay <= mail.day;
    const net = mail.net ?? 0;
    const head = pending
      ? `${mail.teaser} — open your reports to tally the night`
      : `${mail.teaser} — net ${net >= 0 ? "+" : ""}${net}g · ${mail.endGold ?? 0}g treasury`;
    return (
      <div className={styles.ledger}>
        <button type="button" className={styles.ledgerHead} onClick={() => { setOpen((v) => !v); if (!mail.read) onRead(); }} aria-expanded={open}>
          <span>{head}</span>
          <span aria-hidden>{open ? "▾" : "▸"}</span>
        </button>
        {open && mail.ledger && (
          <ul className={styles.ledgerBody}>
            {mail.ledger.map((e, i) => {
              // A returning quest's cut stays masked until its sealed story is
              // opened (§4); while the night is pending, the Tavern-takings
              // amount hides too — the returning party's decompress spend is in
              // it, and its size tracks the sealed reward (Review #2 Designer).
              const masked =
                (e.sealedMailId !== undefined && !readIds.has(e.sealedMailId)) ||
                (pending && e.label === "Tavern takings");
              return (
                <li key={i}>
                  <span>{e.label}</span>
                  {masked ? (
                    <span className={styles.sealed}>see report ›</span>
                  ) : (
                    <span className={styles.amt} data-pos={e.amount >= 0}>{e.amount >= 0 ? "+" : ""}{e.amount}g</span>
                  )}
                </li>
              );
            })}
            <li className={styles.runwayLine}>
              <span>{pending ? "Net & runway hidden until your reports are opened." : mail.runwayNote}</span>
            </li>
          </ul>
        )}
      </div>
    );
  }

  // Any other kind (none today — departures/notices live in the Hall Feed now).
  return (
    <div className={styles.info} data-kind={mail.kind} onPointerDown={() => { if (!mail.read) onRead(); }}>
      {mail.teaser}
    </div>
  );
}
