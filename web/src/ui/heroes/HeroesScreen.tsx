// HeroesScreen — the roster, with PARTIES as the primary unit (§6): parties are
// shown first, each in a bordered card that wraps its members, and the heroes not
// yet in a party fall into a "Without a party" section below. Tapping any hero —
// a party member or a solo one — opens that hero's tabbed stat page (HeroCard) in
// a bottom Sheet. UI scaffolding only — mock data (mockHeroes + mockParties).

import { useCallback, useState } from "react";
import { HEROES } from "./mockHeroes";
import { PARTY_VIEWS, SOLO } from "./mockParties";
import { HeroSprite } from "./HeroSprite";
import { HeroCard } from "./HeroCard";
import { PartyCard } from "./PartyCard";
import { Button, Sheet } from "../kit";
import styles from "./HeroesScreen.module.css";

export function HeroesScreen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openHero = HEROES.find((h) => h.id === openId) ?? null;
  const close = () => setOpenId(null);
  const open = useCallback((id: string) => setOpenId(id), []);
  // Cross-hero "View" from a relation row — guarded so a bad id can't set a
  // non-existent openId (which would silently close the sheet).
  const goTo = (id: string) => {
    if (HEROES.some((h) => h.id === id)) setOpenId(id);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>Heroes</h1>
        <span className={styles.count}>
          {PARTY_VIEWS.length} {PARTY_VIEWS.length === 1 ? "party" : "parties"} · {HEROES.length} heroes
        </span>
      </header>

      <section className={styles.section} aria-labelledby="sec-parties">
        <h2 className={styles.sectionTitle} id="sec-parties">
          Parties
        </h2>
        <div className={styles.parties}>
          {PARTY_VIEWS.map((view) => (
            <PartyCard key={view.party.id} view={view} onOpen={open} />
          ))}
        </div>
      </section>

      {SOLO.length > 0 && (
        <section className={styles.section} aria-labelledby="sec-solo">
          <h2 className={styles.sectionTitle} id="sec-solo">
            Without a party
          </h2>
          <ul className={styles.roster}>
            {SOLO.map((hero) => (
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
        </section>
      )}

      <Sheet open={!!openHero} onClose={close} title={openHero?.name}>
        {openHero && (
          <>
            {/* key resets tab/inspector state when the sheet swaps heroes (incl. via View). */}
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
