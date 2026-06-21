// Arena — the board. Horizontal phasing: the hero party occupies the left
// column, enemy stacks the right column. Every unit is an LPC composite (gear
// shown on the model); team is read from position + facing, not cell colour.

import { memo } from "react";
import {
  DEFAULT_GRID,
  layoutArena,
  type Appearance,
  type CombatStateView,
  type HeroView,
  type StackView,
} from "../../game/battle";
import { DamageFloaters, type Floater } from "./DamageFloaters";
import { HealthBar } from "./HealthBar";
import { LpcSprite } from "./lpc/LpcSprite";
import { visualFor } from "./lpc/presets";
import styles from "./Arena.module.css";

export interface ArenaProps {
  state: CombatStateView;
  floaters: Floater[];
  swingNonce: Record<string, number>;
  hurtNonce: Record<string, number>;
  onFloaterDone: (id: number) => void;
  /** Gild the hero's gear (recolor hook preview). */
  divine?: boolean;
}

function Cell({
  children,
  floaters,
  onFloaterDone,
  empty,
}: {
  children?: React.ReactNode;
  floaters: Floater[];
  onFloaterDone: (id: number) => void;
  empty?: boolean;
}) {
  return (
    <div className={`${styles.cell} ${empty ? styles.empty : ""}`}>
      <div className={styles.cellInner}>{children}</div>
      <DamageFloaters floaters={floaters} onDone={onFloaterDone} />
    </div>
  );
}

function Figure({
  appearance,
  swing,
  hurt,
  divine,
  down,
}: {
  appearance: Appearance;
  swing: number;
  hurt: number;
  divine?: boolean;
  down?: boolean;
}) {
  const v = visualFor(appearance, divine);
  return (
    <div className={styles.figure}>
      <LpcSprite
        layers={v.layers}
        scale={v.scale}
        lungeDir={v.lungeDir}
        swingNonce={swing}
        hurtNonce={hurt}
        down={down}
      />
    </div>
  );
}

function HeroTile({ hero, swing, hurt, divine }: { hero: HeroView; swing: number; hurt: number; divine?: boolean }) {
  return (
    <div className={styles.tile}>
      <Figure appearance={hero.appearance} swing={swing} hurt={hurt} divine={divine} down={!hero.alive} />
      <HealthBar hp={hero.hp} maxHp={hero.maxHp} side="hero" showText />
      <span className={styles.name}>{hero.name}</span>
    </div>
  );
}

function StackTile({ stack, swing, hurt }: { stack: StackView; swing: number; hurt: number }) {
  if (stack.alive === 0) return <div className={styles.clearedMark} aria-label="cleared" />;
  return (
    <div className={styles.tile}>
      <div className={styles.figureWrap}>
        <Figure appearance={stack.appearance} swing={swing} hurt={hurt} />
        {stack.alive > 1 && <span className={styles.badge}>×{stack.alive}</span>}
      </div>
      <HealthBar hp={stack.frontHp} maxHp={stack.frontMaxHp} side="enemy" />
      <span className={styles.name}>{stack.name}</span>
    </div>
  );
}

function ArenaImpl({ state, floaters, swingNonce, hurtNonce, onFloaterDone, divine }: ArenaProps) {
  const cells = layoutArena(state.stacks.length);
  const floatersFor = (cellId: string) => floaters.filter((f) => f.cellId === cellId);

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${DEFAULT_GRID.cols}, 1fr)` }}
      role="grid"
      aria-label="Combat arena"
    >
      {cells.map((cell) => {
        if (cell.role === "hero") {
          return (
            <Cell key={cell.id} floaters={floatersFor("hero")} onFloaterDone={onFloaterDone}>
              <HeroTile
                hero={state.hero}
                swing={swingNonce["hero"] ?? 0}
                hurt={hurtNonce["hero"] ?? 0}
                divine={divine}
              />
            </Cell>
          );
        }
        if (cell.role === "monster" && cell.stackIndex !== undefined) {
          const stack = state.stacks[cell.stackIndex];
          const cellId = `stack-${cell.stackIndex}`;
          return (
            <Cell key={cell.id} floaters={floatersFor(cellId)} onFloaterDone={onFloaterDone}>
              {stack && (
                <StackTile stack={stack} swing={swingNonce[cellId] ?? 0} hurt={hurtNonce[cellId] ?? 0} />
              )}
            </Cell>
          );
        }
        return <Cell key={cell.id} empty floaters={[]} onFloaterDone={onFloaterDone} />;
      })}
    </div>
  );
}

export const Arena = memo(ArenaImpl);
