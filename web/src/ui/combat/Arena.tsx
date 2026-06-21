// Arena — the board. Renders the data-driven grid of neutral cells and places
// the hero and monster stacks into them, wiring each unit's sprite to its live
// HP and to the per-cell animation nonces. Team is shown by the sprite, not by
// colouring the cell.

import { memo } from "react";
import {
  layoutArena,
  type CombatStateView,
  type HeroView,
  type StackView,
} from "../../game/battle";
import { DamageFloaters, type Floater } from "./DamageFloaters";
import { HealthBar } from "./HealthBar";
import { UnitSprite } from "./UnitSprite";
import { LpcSprite } from "./lpc/LpcSprite";
import { itemsForAppearance, resolveLayers } from "./lpc/presets";
import type { Tint } from "./lpc/types";
import styles from "./Arena.module.css";

export interface ArenaProps {
  state: CombatStateView;
  floaters: Floater[];
  swingNonce: Record<string, number>;
  hurtNonce: Record<string, number>;
  onFloaterDone: (id: number) => void;
  /** Optional theme tint applied to the hero's tintable layers (recolor hook). */
  heroTint?: Tint;
}

function Cell({
  children,
  floaters,
  onFloaterDone,
  variant,
}: {
  children?: React.ReactNode;
  floaters: Floater[];
  onFloaterDone: (id: number) => void;
  variant: "unit" | "empty";
}) {
  return (
    <div className={`${styles.cell} ${variant === "empty" ? styles.empty : ""}`}>
      <div className={styles.cellInner}>{children}</div>
      <DamageFloaters floaters={floaters} onDone={onFloaterDone} />
    </div>
  );
}

function HeroTile({ hero, tint }: { hero: HeroView; tint?: Tint }) {
  // Phase A: the hero is composited from LPC layers (base body + armour + weapon),
  // so equipped gear shows on the model. Static idle frame for now.
  const layers = resolveLayers(itemsForAppearance(hero.appearance), tint);
  return (
    <div className={styles.tile}>
      <div className={`${styles.sprite} ${styles.spriteLpc} ${!hero.alive ? styles.down : ""}`}>
        <LpcSprite layers={layers} animation="idle" direction="down" />
      </div>
      <HealthBar hp={hero.hp} maxHp={hero.maxHp} side="hero" showText />
      <span className={styles.name}>{hero.name}</span>
    </div>
  );
}

function StackTile({ stack, swing, hurt }: { stack: StackView; swing: number; hurt: number }) {
  if (stack.alive === 0) {
    return <div className={styles.clearedMark} aria-label="cleared" />;
  }
  return (
    <div className={`${styles.tile} ${stack.alive > 1 ? styles.stacked : ""}`} data-count={stack.alive}>
      <div className={styles.sprite}>
        <UnitSprite appearance={stack.appearance} facing="down" swingNonce={swing} hurtNonce={hurt} />
        {stack.alive > 1 && <span className={styles.badge}>×{stack.alive}</span>}
      </div>
      <HealthBar hp={stack.frontHp} maxHp={stack.frontMaxHp} side="enemy" />
      <span className={styles.name}>{stack.name}</span>
    </div>
  );
}

function ArenaImpl({ state, floaters, swingNonce, hurtNonce, onFloaterDone, heroTint }: ArenaProps) {
  const cells = layoutArena(state.stacks.length);
  const floatersFor = (cellId: string) => floaters.filter((f) => f.cellId === cellId);

  return (
    <div className={styles.grid} role="grid" aria-label="Combat arena">
      {cells.map((cell) => {
        if (cell.role === "hero") {
          return (
            <Cell key={cell.id} variant="unit" floaters={floatersFor("hero")} onFloaterDone={onFloaterDone}>
              <HeroTile hero={state.hero} tint={heroTint} />
            </Cell>
          );
        }
        if (cell.role === "monster" && cell.stackIndex !== undefined) {
          const stack = state.stacks[cell.stackIndex];
          const cellId = `stack-${cell.stackIndex}`;
          return (
            <Cell key={cell.id} variant="unit" floaters={floatersFor(cellId)} onFloaterDone={onFloaterDone}>
              {stack && (
                <StackTile
                  stack={stack}
                  swing={swingNonce[cellId] ?? 0}
                  hurt={hurtNonce[cellId] ?? 0}
                />
              )}
            </Cell>
          );
        }
        return <Cell key={cell.id} variant="empty" floaters={[]} onFloaterDone={onFloaterDone} />;
      })}
    </div>
  );
}

export const Arena = memo(ArenaImpl);
