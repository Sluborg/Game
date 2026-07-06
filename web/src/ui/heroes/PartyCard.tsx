// PartyCard — a party as the primary unit: one bordered card that WRAPS the whole
// party. Header = party name + an observed "where / doing what" line; a 2×2 grid
// of the four guild ESTIMATES (Fame · Cohesion · Morale · Rating); the party's
// own next-turn intent; then the members inside (boss first, marked with a crown),
// each tapping into the existing hero Sheet. A disabled "Sway the boss" affordance
// stands in for the Slice 4–5 party lever (§6 — you influence a party through its
// boss) without inventing a working mechanic.
//
// Everything is framed as the guild-master's READ, not ground truth (§4/§5): the
// values carry an "estimate" caption, the plan is the party's intent (not your
// order), and the rating is built only from members' trusted stats (mockParties).

import type { ReactNode } from "react";
import type { Hero } from "./mockHeroes";
import type { PartyView } from "./mockParties";
import { heroMood } from "./mockParties";
import { HeroSprite } from "./HeroSprite";
import { Panel, Button } from "../kit";
import styles from "./PartyCard.module.css";

export function PartyCard({ view, onOpen }: { view: PartyView; onOpen: (id: string) => void }) {
  const { party, boss, members, ratings, avgRating } = view;
  const titleId = `party-${party.id}`;

  return (
    <Panel as="section" className={styles.party} aria-labelledby={titleId}>
      <header className={styles.head}>
        <h3 className={styles.name} id={titleId}>
          {party.name}
        </h3>
        <p className={styles.where}>
          <PinIcon />
          <span>
            In {party.location} · {party.activity}
          </span>
        </p>
      </header>

      <div className={styles.stats}>
        <Meter icon={<FameIcon />} label="Fame" value={party.fame} />
        <Meter icon={<CohesionIcon />} label="Cohesion" value={party.cohesion} />
        <Meter icon={<MoraleIcon />} label="Morale" value={party.morale} />
        <Rating value={avgRating} />
      </div>
      <p className={styles.estimate}>Guild estimate — sharpens with report fidelity.</p>

      <p className={styles.plan}>
        <PlanIcon />
        <span>
          <span className={styles.planLead}>Plans to</span> {party.plan}
        </span>
      </p>

      <ul className={styles.members}>
        {members.map((hero) => (
          <MemberRow key={hero.id} hero={hero} isBoss={hero.id === boss.id} rating={ratings.get(hero.id) ?? null} onOpen={onOpen} />
        ))}
      </ul>

      {/* Slice 4–5 lever, deliberately inert: you sway a party through its boss
          (§6). A real disabled control (out of the tab order, announced disabled),
          styled subdued so it never reads as a live action. */}
      <div className={styles.actions}>
        <Button variant="secondary" className={styles.sway} disabled aria-label="Sway the boss — coming soon">
          Sway the boss
          <span className={styles.soon} aria-hidden>
            soon
          </span>
        </Button>
      </div>
    </Panel>
  );
}

function MemberRow({ hero, isBoss, rating, onOpen }: { hero: Hero; isBoss: boolean; rating: number | null; onOpen: (id: string) => void }) {
  const mood = heroMood(hero);
  const ratingText = rating != null ? rating.toFixed(1) : "unrated";
  const bossText = isBoss ? ", leads the party" : "";
  return (
    <li>
      <button
        type="button"
        className={styles.member}
        onClick={() => onOpen(hero.id)}
        aria-haspopup="dialog"
        aria-label={`${hero.name}, ${hero.archetype}${bossText}. Rating ${ratingText}, morale ${mood.label}. Open stat page.`}
      >
        <HeroSprite layers={hero.layers} name={hero.name} size={44} />
        <span className={styles.memberText}>
          <span className={styles.memberName}>
            {isBoss && <CrownIcon />}
            {hero.name}
          </span>
          <span className={styles.memberArch}>{hero.archetype}</span>
        </span>
        <span className={styles.memberMeta}>
          <span className={styles.memberRating} aria-hidden>
            {rating != null ? `★ ${rating.toFixed(1)}` : "★ —"}
          </span>
          <span className={styles.mood} data-valence={mood.valence} title={mood.label} aria-hidden />
        </span>
        <span className={styles.chev} aria-hidden>
          ›
        </span>
      </button>
    </li>
  );
}

function Meter({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.stat}>
      <span className={styles.statTop}>
        {icon}
        <span className={styles.statLabel}>{label}</span>
      </span>
      <span className={styles.statVal}>{Math.round(pct)}</span>
      <span className={styles.meter} aria-hidden>
        <span className={styles.meterFill} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function Rating({ value }: { value: number | null }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statTop}>
        <StarIcon />
        <span className={styles.statLabel}>Rating</span>
      </span>
      <span className={styles.statVal}>
        {value != null ? value.toFixed(1) : "—"}
        <span className={styles.ratingMax} aria-hidden>
          {value != null ? " / 5" : ""}
        </span>
      </span>
      <span className={styles.ratingHint} aria-hidden>
        {value != null ? "certainty-weighted CVs" : "no rated stats yet"}
      </span>
    </div>
  );
}

// --- glyphs (stroke, currentColor, decorative) ---------------------------------
function PinIcon() {
  return (
    <svg className={styles.lineIcon} viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
      <path d="M12 21c4-4.5 6.5-7.8 6.5-11a6.5 6.5 0 1 0-13 0c0 3.2 2.5 6.5 6.5 11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function PlanIcon() {
  return (
    <svg className={styles.lineIcon} viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
      <path d="M6 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 5h9l-1.6 3L15 11H6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function FameIcon() {
  return (
    <svg className={styles.statIcon} viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path d="M8 3h8v6a4 4 0 0 1-8 0V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 13v4m-3 4h6m-6 0 1-4h4l1 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CohesionIcon() {
  return (
    <svg className={styles.statIcon} viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path d="M10 8a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 16a4 4 0 0 0 4-4v0a4 4 0 0 0-4-4h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function MoraleIcon() {
  return (
    <svg className={styles.statIcon} viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className={styles.statIcon} viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path d="M12 3.5l2.5 5.3 5.5.6-4 3.9 1 5.7L12 16.9 6.5 19l1-5.7-4-3.9 5.5-.6L12 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg className={styles.crown} viewBox="0 0 24 24" width="14" height="12" fill="none" aria-hidden>
      <path d="M3 7l3.5 3L12 4l5.5 6L21 7l-1.5 11h-15L3 7Z" fill="var(--c-gold)" stroke="var(--c-gold-dark)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
