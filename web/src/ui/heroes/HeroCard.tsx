// HeroCard — the hero detail "stat page", opened inside a Sheet. Built to the
// locked visual spec in DESIGN.md §5:
//   * 3–4 headline stats + equipment only ("sim-full, UI-lean"), never the full
//     attribute spread.
//   * Certainty lives IN the stat chip's own fill (solid = verified, hatched =
//     claimed, plain "?" = rumor) — one visual treatment, not a second glyph.
//     A small text certainty tag + aria-label carry the same information for
//     colour-blind / screen-reader users (the fill alone can't).
//   * Exactly 3 trait slots. Filled = a solid hexagon token. Empty = a dim,
//     DASHED-hexagon "?" socket — a deliberately DIFFERENT shape from the stat
//     chip's rounded-pill rumor "?", so the two "?"s can never be confused
//     (see TraitSocket vs the rumor stat chip below).
//   * Relationships render as a line of chips, never a graph/web.

import type { Hero, HeroStat } from "./mockHeroes";
import { HeroSprite } from "./HeroSprite";
import styles from "./HeroCard.module.css";

const CERTAINTY_TAG: Record<HeroStat["certainty"], string> = {
  verified: "verified",
  claimed: "claimed",
  rumor: "rumor",
};

/** A headline stat. The rumor "?" shows INSIDE this rounded pill — that pill
 * shape is what distinguishes it from the hexagonal empty-trait socket. */
function StatChip({ stat }: { stat: HeroStat }) {
  const shown = stat.certainty === "rumor" ? "?" : String(stat.value);
  const spoken = stat.certainty === "rumor" ? "unknown" : String(stat.value);
  return (
    <div
      className={styles.stat}
      data-certainty={stat.certainty}
      aria-label={`${stat.label} ${spoken}, ${CERTAINTY_TAG[stat.certainty]}`}
    >
      <span className={styles.statLabel}>{stat.label}</span>
      <span className={styles.statValue}>{shown}</span>
      <span className={styles.statTag} aria-hidden>
        {CERTAINTY_TAG[stat.certainty]}
      </span>
    </div>
  );
}

/** Filled trait — a solid hexagon token (CK-style icon placeholder; no real art
 * exists yet, so it carries the trait's initial). 32×32. */
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

/** Empty trait socket — a DASHED hexagon holding a dim "?". Different shape and
 * treatment from the rumor stat chip's pill "?", per DESIGN.md §4/§5. Exactly
 * 32×32, an inline-SVG placeholder (no raster art for trait icons yet). */
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

const TRAIT_SLOTS = [0, 1, 2];

export function HeroCard({ hero }: { hero: Hero }) {
  return (
    <div className={styles.card}>
      <div className={styles.hero}>
        <HeroSprite layers={hero.layers} name={hero.name} size={256} />
        <div className={styles.ident}>
          <span className={styles.archetype}>{hero.archetype}</span>
          <span className={styles.status} data-kind={hero.status.kind}>
            <span className={styles.dot} aria-hidden />
            {hero.status.text}
          </span>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Stats</h3>
        <div className={styles.stats}>
          {hero.stats.map((s) => (
            <StatChip key={s.label} stat={s} />
          ))}
        </div>
        <p className={styles.legend}>
          <span data-swatch="verified" /> verified
          <span data-swatch="claimed" /> claimed
          <span data-swatch="rumor" /> rumor
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Equipment</h3>
        <div className={styles.equip}>
          <div className={styles.equipRow}>
            <span className={styles.equipSlot}>Weapon</span>
            <span className={styles.equipVal}>{hero.equipment.weapon}</span>
          </div>
          <div className={styles.equipRow}>
            <span className={styles.equipSlot}>Armor</span>
            <span className={styles.equipVal}>{hero.equipment.armor}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Traits</h3>
        <div className={styles.traits}>
          {TRAIT_SLOTS.map((i) => {
            const trait = hero.traits[i];
            if (trait) {
              return (
                <div key={i} className={styles.trait} title={trait.blurb}>
                  <TraitToken initial={trait.name[0]} />
                  <span className={styles.traitName}>{trait.name}</span>
                </div>
              );
            }
            return (
              <div key={i} className={styles.trait} role="img" aria-label="Undiscovered trait">
                <TraitSocket />
                <span className={styles.traitNameDim}>Unknown</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Relationships</h3>
        <div className={styles.relations}>
          {hero.relations.length === 0 && <span className={styles.relNone}>No known ties yet</span>}
          {hero.relations.map((r, i) => (
            <span key={i} className={`${styles.relChip} ${r.verb === "likes" ? styles.likes : styles.hates}`}>
              {r.verb} {r.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
