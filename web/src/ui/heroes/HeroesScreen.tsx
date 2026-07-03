// HeroesScreen — the roster: every hero on one screen with their whereabouts at
// a glance (a colour-coded status dot + a status line), so you never have to
// navigate the map to find where a hero is. Tapping a row opens that hero's
// stat page (HeroCard) in a bottom Sheet. UI scaffolding only — mock data.

import { useState } from "react";
import { HEROES } from "./mockHeroes";
import { HeroSprite } from "./HeroSprite";
import { HeroCard } from "./HeroCard";
import { Sheet } from "../kit";
import styles from "./HeroesScreen.module.css";

export function HeroesScreen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openHero = HEROES.find((h) => h.id === openId) ?? null;

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>Heroes</h1>
        <span className={styles.count}>{HEROES.length} in the guild</span>
      </header>

      <ul className={styles.roster}>
        {HEROES.map((hero) => (
          <li key={hero.id}>
            <button
              type="button"
              className={styles.row}
              onClick={() => setOpenId(hero.id)}
              aria-haspopup="dialog"
              aria-label={`${hero.name}, ${hero.archetype}. ${hero.status.text}. Open stat page.`}
            >
              <HeroSprite layers={hero.layers} name={hero.name} size={64} />
              <span className={styles.rowText}>
                <span className={styles.rowName}>{hero.name}</span>
                <span className={styles.rowArch}>{hero.archetype}</span>
                {/* Status dot is the glanceable code; the text is the second cue. */}
                <span className={styles.status} data-kind={hero.status.kind}>
                  <span className={styles.dot} aria-hidden />
                  {hero.status.text}
                </span>
              </span>
              <span className={styles.chev} aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={!!openHero} onClose={() => setOpenId(null)} title={openHero?.name}>
        {openHero && <HeroCard hero={openHero} />}
      </Sheet>
    </div>
  );
}
