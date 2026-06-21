// CombatTestScreen — composition root for the Combat Test feature. Owns the
// fight configuration, derives a FightConfig, drives it through useCombatClock,
// and lays out the arena, transport controls, setup panel and log. No combat
// logic lives here; it only wires components to the clock.

import { useMemo, useState } from "react";
import type { FightConfig, HeroTier, MonsterSpecies } from "../../game/battle";
import { Arena } from "./Arena";
import { CombatLog } from "./CombatLog";
import { ConfigPanel } from "./ConfigPanel";
import { Controls } from "./Controls";
import { useCombatClock } from "./useCombatClock";
import styles from "./CombatTestScreen.module.css";

export interface CombatTestScreenProps {
  onExit: () => void;
}

export function CombatTestScreen({ onExit }: CombatTestScreenProps) {
  const [heroTier, setHeroTier] = useState<HeroTier>("medium");
  const [monster, setMonster] = useState<MonsterSpecies>("goblin");
  const [stackCount, setStackCount] = useState(2);
  const [stackSize, setStackSize] = useState(2);

  const config = useMemo<FightConfig>(
    () => ({
      heroTier,
      stacks: Array.from({ length: stackCount }, () => ({ species: monster, size: stackSize })),
    }),
    [heroTier, monster, stackCount, stackSize],
  );

  const clock = useCombatClock(config);
  const locked = clock.status === "running" || clock.status === "paused";

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <button className={styles.back} onClick={onExit} aria-label="Back to menu">
          ‹ Menu
        </button>
        <h1 className={styles.title}>Combat Test</h1>
        <span className={styles.spacer} />
      </header>

      <main className={styles.main}>
        <section className={styles.stage}>
          <Arena
            state={clock.state}
            floaters={clock.floaters}
            swingNonce={clock.swingNonce}
            hurtNonce={clock.hurtNonce}
            onFloaterDone={clock.dismissFloater}
          />
          {clock.result && (
            <div
              className={`${styles.banner} ${clock.result === "victory" ? styles.victory : styles.defeat}`}
              role="status"
            >
              {clock.result === "victory" ? "Victory" : "Defeat"}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <Controls
            status={clock.status}
            speed={clock.speed}
            onStart={clock.start}
            onPause={clock.pause}
            onResume={clock.resume}
            onReset={clock.reset}
            onSpeed={clock.setSpeed}
          />
        </section>

        <section className={styles.card}>
          <ConfigPanel
            heroTier={heroTier}
            monster={monster}
            stackCount={stackCount}
            stackSize={stackSize}
            disabled={locked}
            onHeroTier={setHeroTier}
            onMonster={setMonster}
            onStackCount={setStackCount}
            onStackSize={setStackSize}
          />
        </section>

        <CombatLog log={clock.log} />
      </main>
    </div>
  );
}
