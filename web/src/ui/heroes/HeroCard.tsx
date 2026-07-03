// HeroCard — the tabbed hero detail sheet. Compact header (small static portrait
// + archetype + status; the hero NAME is the Sheet's title) over a sticky tab
// strip: Character · Gear · Bonds · Career · Skills.
//
// Interaction: any chip is inspectable — tapping it opens a floating parchment
// popover ABOVE the chip with its effect (see inspect.tsx). Bonds are grouped
// into distinct cards — the Guild tie (its own thing, tied to retention §8), the
// Party (cohesion §6), and other Heroes — the last as one two-line row each with
// a "Go to" jump to that hero's sheet. DESIGN.md §5 fidelity: the 4 real sim
// attributes only (UI-lean), certainty in the chip fill, trait sockets vs the
// rumor pill "?", relationships as chips/rows (never a web).

import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { Bond, Hero, HeroAttr } from "./mockHeroes";
import type { GearSlot } from "./mockHeroes";
import { HEROES } from "./mockHeroes";
import { HeroSprite } from "./HeroSprite";
import { bandFor, signedScore } from "./relationships";
import { InspectChip, InspectPopover, type InspectData } from "./inspect";
import styles from "./HeroCard.module.css";

type TabKey = "character" | "gear" | "bonds" | "career" | "skills";
type OpenInspect = (e: MouseEvent<HTMLButtonElement>, id: string, title: string, effect: string) => void;

const CERTAINTY_TAG = { verified: "verified", claimed: "claimed", rumor: "rumor" } as const;

const ICONS: Record<TabKey, ReactNode> = {
  character: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path d="M12 3l7 3v5c0 4.2-2.9 7.4-7 8.6C7.9 18.4 5 15.2 5 11V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  bonds: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <circle cx="7.5" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="16" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.6 9.6l4.8 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  career: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path d="M6 4h9l3 3v13H6V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  skills: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path d="M12 3l2.3 5.6L20 9.2l-4.3 3.8L17 19l-5-3-5 3 1.3-6L4 9.2l5.7-.6L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

const TABS: { key: TabKey; label: string; soon?: boolean }[] = [
  { key: "character", label: "Character" },
  { key: "gear", label: "Gear" },
  { key: "bonds", label: "Bonds" },
  { key: "career", label: "Career", soon: true },
  { key: "skills", label: "Skills", soon: true },
];

const GEAR_SLOTS: { key: GearSlot; label: string }[] = [
  { key: "head", label: "Head" },
  { key: "armor", label: "Armor" },
  { key: "mainhand", label: "Main" },
  { key: "offhand", label: "Off" },
  { key: "trinket1", label: "Trinket" },
  { key: "trinket2", label: "Trinket" },
];

export function HeroCard({ hero, onGoto }: { hero: Hero; onGoto: (id: string) => void }) {
  const [tab, setTab] = useState<TabKey>("character");
  const [pop, setPop] = useState<InspectData | null>(null);

  const openInspect: OpenInspect = (e, id, title, effect) => {
    const anchor = e.currentTarget; // capture before the deferred updater (React nulls currentTarget after dispatch)
    setPop((cur) => (cur?.id === id ? null : { id, anchor, title, effect }));
  };
  const selectTab = (k: TabKey) => {
    setTab(k);
    setPop(null); // close any popover when switching tabs
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === tab);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    selectTab(TABS[next].key);
    document.getElementById(`tab-${TABS[next].key}`)?.focus();
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <HeroSprite layers={hero.layers} name={hero.name} size={88} />
        <div className={styles.headText}>
          <span className={styles.archetype}>{hero.archetype}</span>
          <span className={styles.status} data-kind={hero.status.kind}>
            <span className={styles.dot} aria-hidden />
            {hero.status.text}
          </span>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Hero details" onKeyDown={onTabKey}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              tabIndex={active ? 0 : -1}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => selectTab(t.key)}
            >
              <span className={styles.tabIcon}>{ICONS[t.key]}</span>
              <span className={styles.tabLabel}>{t.label}</span>
              {t.soon && <span className={styles.soon} aria-label="coming soon">soon</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.panel} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === "character" && <CharacterTab hero={hero} pop={pop} openInspect={openInspect} />}
        {tab === "gear" && <GearTab hero={hero} pop={pop} openInspect={openInspect} />}
        {tab === "bonds" && <BondsTab hero={hero} pop={pop} openInspect={openInspect} onGoto={onGoto} />}
        {tab === "career" && (
          <ComingSoon title="Contracts &amp; pay" line="Renewal terms, your cut, and the gold ledger arrive with the contracts slice." />
        )}
        {tab === "skills" && <ComingSoon title="Skills" line="Learned skills and specialities are still on the drawing board." />}
      </div>

      {/* The visual popover is portalled to <body>, OUTSIDE this aria-modal sheet —
          so it's invisible to a screen reader inside the modal. Mirror its text in
          an IN-modal polite live region so activating a chip announces the effect
          (Codex P2). The portalled box itself is aria-hidden to avoid a double read. */}
      <span className={styles.srOnly} aria-live="polite">
        {pop ? `${pop.title}. ${pop.effect}` : ""}
      </span>
      <InspectPopover data={pop} onClose={() => setPop(null)} />
    </div>
  );
}

// --- Character: the 4 real attributes + 3 trait slots --------------------------
function CharacterTab({ hero, pop, openInspect }: TabProps) {
  return (
    <>
      <p className={styles.hint}>Tap a chip to see what it does.</p>

      <div className={styles.stats}>
        {hero.attributes.map((a) => (
          <AttrChip key={a.key} attr={a} pop={pop} openInspect={openInspect} />
        ))}
      </div>

      <p className={styles.legend}>
        <span data-swatch="verified" /> verified
        <span data-swatch="claimed" /> claimed
        <span data-swatch="rumor" /> rumor
      </p>

      <h4 className={styles.groupTitle}>Traits</h4>
      <div className={styles.traits}>
        {[0, 1, 2].map((i) => {
          const trait = hero.traits[i];
          if (trait) {
            const id = `trait:${i}`;
            return (
              <InspectChip
                key={i}
                className={styles.trait}
                active={pop?.id === id}
                onClick={(e) => openInspect(e, id, trait.name, trait.effect)}
                aria-label={`Trait ${trait.name}`}
              >
                <TraitToken initial={trait.name[0]} />
                <span className={styles.traitName}>{trait.name}</span>
              </InspectChip>
            );
          }
          // Empty trait socket — a DASHED hexagon, a different shape from the
          // rounded-pill rumor "?" above (DESIGN.md §4/§5).
          return (
            <div key={i} className={styles.trait} role="img" aria-label="Undiscovered trait">
              <TraitSocket />
              <span className={styles.traitNameDim}>Unknown</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AttrChip({ attr, pop, openInspect }: { attr: HeroAttr; pop: InspectData | null; openInspect: OpenInspect }) {
  const id = `attr:${attr.key}`;
  const shown = attr.certainty === "rumor" ? "?" : String(attr.value);
  const spoken = attr.certainty === "rumor" ? "unknown" : String(attr.value);
  return (
    <InspectChip
      className={styles.stat}
      data-certainty={attr.certainty}
      active={pop?.id === id}
      onClick={(e) => openInspect(e, id, attr.label, attr.effect)}
      aria-label={`${attr.label} ${spoken}, ${CERTAINTY_TAG[attr.certainty]}`}
    >
      <span className={styles.statLabel}>{attr.key}</span>
      <span className={styles.statValue}>{shown}</span>
      <span className={styles.statTag} aria-hidden>
        {CERTAINTY_TAG[attr.certainty]}
      </span>
    </InspectChip>
  );
}

// --- Gear: 6 slots -------------------------------------------------------------
function GearTab({ hero, pop, openInspect }: TabProps) {
  return (
    <>
      <p className={styles.hint}>Tap a slot to see what it does.</p>
      <div className={styles.gearGrid}>
        {GEAR_SLOTS.map((slot) => {
          const item = hero.equipment[slot.key];
          if (!item) {
            return (
              <div key={slot.key} className={`${styles.gearCell} ${styles.gearEmpty}`}>
                <span className={styles.gearSlot}>{slot.label}</span>
                <span className={styles.gearVal}>Empty</span>
              </div>
            );
          }
          const id = `gear:${slot.key}`;
          return (
            <InspectChip
              key={slot.key}
              className={styles.gearCell}
              active={pop?.id === id}
              onClick={(e) => openInspect(e, id, item.name, item.effect)}
              aria-label={`${slot.label}: ${item.name}`}
            >
              <span className={styles.gearSlot}>{slot.label}</span>
              <span className={styles.gearVal}>{item.name}</span>
            </InspectChip>
          );
        })}
      </div>
    </>
  );
}

// --- Bonds: distinct Guild card + Party card + Relations rows ------------------
function BondsTab({ hero, pop, openInspect, onGoto }: TabProps & { onGoto: (id: string) => void }) {
  const indexed = hero.bonds.map((b, i) => ({ b, i }));
  const guild = indexed.find(({ b }) => b.scope === "guild");
  const party = indexed.filter(({ b }) => b.scope === "party");
  const heroes = indexed.filter(({ b }) => b.scope === "hero");

  return (
    <>
      <p className={styles.hint}>Tap a bond to see the story behind it.</p>

      {guild && (
        <section className={styles.guildCard}>
          <div className={styles.guildHead}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
              <path d="M12 3l7 3v6c0 4-3 6.6-7 8-4-1.4-7-4-7-8V6l7-3Z" stroke="var(--c-gold)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            To the Guild
          </div>
          <BondLine bond={guild.b} id={`bond:${guild.i}`} pop={pop} openInspect={openInspect} />
        </section>
      )}

      {party.length > 0 && (
        <section className={styles.bondCard}>
          <h4 className={styles.groupTitle}>Their Party</h4>
          {party.map(({ b, i }) => (
            <BondLine key={i} bond={b} id={`bond:${i}`} pop={pop} openInspect={openInspect} />
          ))}
        </section>
      )}

      <section className={styles.bondCard}>
        <h4 className={styles.groupTitle}>Other Heroes</h4>
        {heroes.length === 0 && <p className={styles.relNone}>No known ties to other heroes yet.</p>}
        <ul className={styles.relList}>
          {heroes.map(({ b, i }) => (
            <RelationRow key={i} bond={b} id={`bond:${i}`} pop={pop} openInspect={openInspect} onGoto={onGoto} />
          ))}
        </ul>
      </section>
    </>
  );
}

/** A single-line bond (guild / party): feeling + score, tap for the note. */
function BondLine({ bond, id, pop, openInspect }: { bond: Bond; id: string; pop: InspectData | null; openInspect: OpenInspect }) {
  const band = bandFor(bond.score);
  const label = bond.type ?? band.feeling;
  return (
    <InspectChip
      className={styles.bondLine}
      data-valence={band.valence}
      active={pop?.id === id}
      onClick={(e) => openInspect(e, id, `${bond.name} · ${band.feeling}`, bond.note)}
      aria-label={`${bond.name}: ${label}, ${signedScore(bond.score)}`}
    >
      <span className={styles.bondLabel}>{label}</span>
      <span className={styles.bondScore} aria-hidden>
        {signedScore(bond.score)}
      </span>
    </InspectChip>
  );
}

/** A hero↔hero relation as a two-line row: name + score + Go-to; archetype · variant. */
function RelationRow({
  bond,
  id,
  pop,
  openInspect,
  onGoto,
}: {
  bond: Bond;
  id: string;
  pop: InspectData | null;
  openInspect: OpenInspect;
  onGoto: (id: string) => void;
}) {
  const band = bandFor(bond.score);
  const target = bond.targetId ? HEROES.find((h) => h.id === bond.targetId) : undefined;
  const fullName = target?.name ?? bond.name;
  const archetype = target?.archetype;
  const variant = bond.type ?? band.feeling;
  return (
    <li className={styles.relRow} data-valence={band.valence}>
      <InspectChip
        className={styles.relMain}
        active={pop?.id === id}
        onClick={(e) => openInspect(e, id, `${fullName} · ${band.feeling}`, bond.note)}
        aria-label={`${fullName}, ${variant}, ${signedScore(bond.score)}. Story.`}
      >
        <span className={styles.relLine1}>
          <span className={styles.relName}>{fullName}</span>
          <span className={styles.relScore}>{signedScore(bond.score)}</span>
        </span>
        <span className={styles.relLine2}>
          {archetype && <span className={styles.relArch}>{archetype}</span>}
          {archetype && " · "}
          <span className={styles.relVariant}>{variant}</span>
        </span>
      </InspectChip>
      {/* "Go to" only when the target resolves to a real hero — a bad id must
          not silently close the sheet. */}
      {target && (
        <button type="button" className={styles.relGo} onClick={() => onGoto(target.id)} aria-label={`Go to ${fullName}`}>
          Go ›
        </button>
      )}
    </li>
  );
}

// --- Stub tabs -----------------------------------------------------------------
function ComingSoon({ title, line }: { title: string; line: string }) {
  return (
    <div className={styles.soonPane}>
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className={styles.soonTitle}>{title}</span>
      <span className={styles.soonLine}>{line}</span>
    </div>
  );
}

// --- shared glyphs -------------------------------------------------------------
function TraitToken({ initial }: { initial: string }) {
  return (
    <svg className={styles.traitGlyph} viewBox="0 0 32 32" width="32" height="32" aria-hidden>
      <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="var(--c-royal)" stroke="var(--c-gold)" strokeWidth="1.5" />
      <text x="16" y="17" textAnchor="middle" dominantBaseline="central" fill="var(--c-gold-light)" fontFamily="var(--font-display)" fontSize="13" fontWeight="700">
        {initial}
      </text>
    </svg>
  );
}

function TraitSocket() {
  return (
    <svg className={styles.traitGlyph} viewBox="0 0 32 32" width="32" height="32" aria-hidden>
      <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="none" stroke="var(--stroke-soft)" strokeWidth="2" strokeDasharray="4 3" />
      <text x="16" y="17" textAnchor="middle" dominantBaseline="central" fill="var(--text-dim)" fontFamily="var(--font-display)" fontSize="14">
        ?
      </text>
    </svg>
  );
}

interface TabProps {
  hero: Hero;
  pop: InspectData | null;
  openInspect: OpenInspect;
}
