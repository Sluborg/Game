// ReportScreen — the Report tab: a Dominions-style nightly summary, newest night
// on top. A returning-quest outcome is a SEALED envelope whose teaser withholds
// the result until you open it in the StoryStage (so the summary can't spoil the
// drama, §4). The end-day ledger is the one fully-spelled entry (itemized + runway).
// Acceptance/notice/coach envelopes are plain info lines.

import { useMemo, useState } from "react";
import { useGuild } from "../guild/GuildContext";
import { StoryStage } from "./StoryStage";
import type { AdventureLog, Mail } from "../../game/guild";
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

  const openStory = (m: Mail) => {
    if (!m.log) return;
    readMail(m.id);
    setStory({ log: m.log, partyName: m.partyName ?? "The party", questTitle: m.questTitle ?? "the quest" });
  };

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>Report</h1>
        <span className={styles.day}>Day {state.day}</span>
      </header>

      {byDay.length === 0 && <p className={styles.empty}>No mail yet. End a day on the Board to see what your parties get up to.</p>}

      {byDay.map(([day, items]) => (
        <section key={day} className={styles.night} aria-label={`Day ${day}`}>
          <h2 className={styles.nightHead}>Day {day}</h2>
          <ul className={styles.list}>
            {items.map((m) => (
              <li key={m.id}>
                <MailRow mail={m} readIds={readIds} onOpen={() => openStory(m)} onRead={() => readMail(m.id)} />
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

function MailRow({ mail, readIds, onOpen, onRead }: { mail: Mail; readIds: Set<string>; onOpen: () => void; onRead: () => void }) {
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
    return (
      <div className={styles.ledger}>
        <button type="button" className={styles.ledgerHead} onClick={() => { setOpen((v) => !v); if (!mail.read) onRead(); }} aria-expanded={open}>
          <span>{mail.teaser}</span>
          <span aria-hidden>{open ? "▾" : "▸"}</span>
        </button>
        {open && mail.ledger && (
          <ul className={styles.ledgerBody}>
            {mail.ledger.map((e, i) => {
              // A returning quest's cut stays masked until its sealed story is opened,
              // so the ledger can't spoil the reveal (§4).
              const masked = e.sealedMailId !== undefined && !readIds.has(e.sealedMailId);
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
            {mail.runwayNote && <li className={styles.runwayLine}><span>{mail.runwayNote}</span></li>}
          </ul>
        )}
      </div>
    );
  }

  // acceptance / notice / coach — plain info line.
  return (
    <div className={styles.info} data-kind={mail.kind} onPointerDown={() => { if (!mail.read) onRead(); }}>
      {mail.teaser}
    </div>
  );
}
