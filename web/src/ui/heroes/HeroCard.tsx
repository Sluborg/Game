// HeroCard — the hero detail sheet, reorganised into tabs. A compact header
// (small static portrait + archetype + status; the hero NAME is the Sheet's own
// title, not repeated here) sits above a sticky tab strip:
//   Character · Gear · Bonds · Career · Skills
//
// Built to the locked DESIGN.md §5 spec:
//   * Character shows ONLY the 4 real sim attributes (str/dex/sta/per) — "UI-lean"
//     — as certainty chips (solid = verified, hatched = claimed, plain "?" = rumor;
//     one visual treatment, no second glyph) plus exactly 3 trait slots. The stat
//     chip's rounded-PILL "?" stays visually distinct from a trait's DASHED-HEXAGON
//     "?" socket, even though both now share this tab.
//   * Bonds render as named-feeling chips over a −100..100 score (relationships.ts),
//     grouped by target — never a graph/web.
//   * Career (contracts + ledger) and Skills are honest "coming" stubs — future
//     slices; they never present unbuilt mechanics as functional.
//   * Any chip is inspectable: tapping it reveals its effect inline (see inspect.tsx).

import { useState, type KeyboardEvent, type ReactNode } from "react";
import type { Bond, Hero, HeroAttr } from "./mockHeroes";
import type { GearSlot } from "./mockHeroes";
import { HeroSprite } from "./HeroSprite";
import { bandFor, signedScore } from "./relationships";
import { InspectChip, InspectDetail } from "./inspect";
import styles from "./HeroCard.module.css";

type TabKey = "character" | "gear" | "bonds" | "career" | "skills";

const CERTAINTY_TAG = { verified: "verified", claimed: "claimed", rumor: "rumor" } as const;

// --- tab strip icons (24×24 inline SVG, currentColor) --------------------------
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

const BOND_GROUPS: { scope: Bond["scope"]; heading: string }[] = [
  { scope: "guild", heading: "To the Guild" },
  { scope: "party", heading: "To their Party" },
  { scope: "hero", heading: "To other Heroes" },
];

export function HeroCard({ hero }: { hero: Hero }) {
  const [tab, setTab] = useState<TabKey>("character");
  // One inspector open at a time across the whole sheet; reset on tab change.
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));
  const selectTab = (k: TabKey) => {
    setTab(k);
    setOpenId(null);
  };

  // WAI-ARIA tabs: roving focus with arrow keys / Home / End.
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
        {tab === "character" && <CharacterTab hero={hero} openId={openId} toggle={toggle} />}
        {tab === "gear" && <GearTab hero={hero} openId={openId} toggle={toggle} />}
        {tab === "bonds" && <BondsTab hero={hero} openId={openId} toggle={toggle} />}
        {tab === "career" && (
          <ComingSoon title="Contracts &amp; pay" line="Renewal terms, your cut, and the gold ledger arrive with the contracts slice." />
        )}
        {tab === "skills" && <ComingSoon title="Skills" line="Learned skills and specialities are still on the drawing board." />}
      </div>
    </div>
  );
}

// --- Character: the 4 real attributes + 3 trait slots --------------------------
function CharacterTab({ hero, openId, toggle }: TabProps) {
  const openAttr = hero.attributes.find((a) => openId === `attr:${a.key}`);
  const openTrait = hero.traits.find((_, i) => openId === `trait:${i}`);
  return (
    <>
      <p className={styles.hint}>Tap a chip to see what it does.</p>

      <div className={styles.stats}>
        {hero.attributes.map((a) => (
          <AttrChip key={a.key} attr={a} open={openId === `attr:${a.key}`} onToggle={() => toggle(`attr:${a.key}`)} />
        ))}
      </div>
      {openAttr && <InspectDetail title={openAttr.label} effect={openAttr.effect} />}

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
            return (
              <InspectChip
                key={i}
                className={styles.trait}
                open={openId === `trait:${i}`}
                onToggle={() => toggle(`trait:${i}`)}
                aria-label={`Trait ${trait.name}`}
              >
                <TraitToken initial={trait.name[0]} />
                <span className={styles.traitName}>{trait.name}</span>
              </InspectChip>
            );
          }
          // Empty trait socket — a DASHED hexagon, deliberately a different shape
          // from the rounded-pill rumor "?" above (DESIGN.md §4/§5).
          return (
            <div key={i} className={styles.trait} role="img" aria-label="Undiscovered trait">
              <TraitSocket />
              <span className={styles.traitNameDim}>Unknown</span>
            </div>
          );
        })}
      </div>
      {openTrait && <InspectDetail title={openTrait.name} effect={openTrait.effect} />}
    </>
  );
}

function AttrChip({ attr, open, onToggle }: { attr: HeroAttr; open: boolean; onToggle: () => void }) {
  const shown = attr.certainty === "rumor" ? "?" : String(attr.value);
  const spoken = attr.certainty === "rumor" ? "unknown" : String(attr.value);
  return (
    <InspectChip
      className={styles.stat}
      data-certainty={attr.certainty}
      open={open}
      onToggle={onToggle}
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
function GearTab({ hero, openId, toggle }: TabProps) {
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
            <div key={slot.key} className={styles.gearWrap}>
              <InspectChip
                className={styles.gearCell}
                open={openId === id}
                onToggle={() => toggle(id)}
                aria-label={`${slot.label}: ${item.name}`}
              >
                <span className={styles.gearSlot}>{slot.label}</span>
                <span className={styles.gearVal}>{item.name}</span>
              </InspectChip>
              {openId === id && <InspectDetail title={item.name} effect={item.effect} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

// --- Bonds: named-feeling chips over a −100..100 score, grouped by target ------
function BondsTab({ hero, openId, toggle }: TabProps) {
  return (
    <>
      <p className={styles.hint}>Tap a bond to see the story behind it.</p>
      {hero.bonds.length === 0 && <p className={styles.relNone}>No known ties yet.</p>}
      {BOND_GROUPS.map((group) => {
        const bonds = hero.bonds
          .map((b, i) => ({ b, i }))
          .filter(({ b }) => b.scope === group.scope);
        if (bonds.length === 0) return null;
        return (
          <div key={group.scope} className={styles.bondGroup}>
            <h4 className={styles.groupTitle}>{group.heading}</h4>
            <div className={styles.bonds}>
              {bonds.map(({ b, i }) => (
                <BondChip key={i} bond={b} open={openId === `bond:${i}`} onToggle={() => toggle(`bond:${i}`)} />
              ))}
            </div>
            {bonds.map(
              ({ b, i }) =>
                openId === `bond:${i}` && <InspectDetail key={`d${i}`} title={`${b.name} · ${bandFor(b.score).feeling}`} effect={b.note} />,
            )}
          </div>
        );
      })}
    </>
  );
}

function BondChip({ bond, open, onToggle }: { bond: Bond; open: boolean; onToggle: () => void }) {
  const band = bandFor(bond.score);
  return (
    <InspectChip
      className={styles.bondChip}
      data-valence={band.valence}
      open={open}
      onToggle={onToggle}
      aria-label={`${bond.name}: ${band.feeling}, ${signedScore(bond.score)}`}
    >
      <span className={styles.bondName}>{bond.name}</span>
      <span className={styles.bondFeeling}>{band.feeling}</span>
      <span className={styles.bondScore} aria-hidden>
        {signedScore(bond.score)}
      </span>
    </InspectChip>
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
  openId: string | null;
  toggle: (id: string) => void;
}
