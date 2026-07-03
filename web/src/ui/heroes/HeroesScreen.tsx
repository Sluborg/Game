// HeroesScreen — the roster: every hero on one screen with their whereabouts at
// a glance (a colour-coded status dot + a status line), so you never have to
// navigate the map to find where a hero is. Tapping a row opens that hero's
// stat page (HeroCard) in a bottom Sheet. UI scaffolding only — mock data.

import { useState } from "react";
import { HEROES } from "./mockHeroes";
import { HeroSprite } from "./HeroSprite";
import { HeroCard } from "./HeroCard";
import { Button, Sheet } from "../kit";
import styles from "./HeroesScreen.module.css";

export function HeroesScreen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openHero = HEROES.find((h) => h.id === openId) ?? null;
  const close = () => setOpenId(null);
  // Cross-hero "Go to" from a relation row — guarded so a bad id can't set a
  // non-existent openId (which would silently close the sheet).
  const goTo = (id: string) => {
    if (HEROES.some((h) => h.id === id)) setOpenId(id);
  };

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

      <Sheet open={!!openHero} onClose={close} title={openHero?.name}>
        {openHero && (
          <>
            {/* key resets tab/inspector state when the sheet swaps heroes (incl. via Go-to). */}
            <HeroCard key={openHero.id} hero={openHero} onGoto={goTo} />
            {/* A full-width secondary close at the bottom of the sheet — easier
                one-handed reach than the top-right ×, and the kit Button in use. */}
            <Button variant="secondary" className={styles.sheetClose} onClick={close}>
              Close
            </Button>
          </>
        )}
      </Sheet>
    </div>
  );
}
