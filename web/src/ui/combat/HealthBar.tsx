// A typed health bar. The optional numeric readout sits on its own line above
// the bar (legible, never overlapping the sprite). The fill animates via a CSS
// transition on a transform, so HP drains smoothly without per-frame JS.

import { memo } from "react";
import styles from "./HealthBar.module.css";

export interface HealthBarProps {
  hp: number;
  maxHp: number;
  side: "hero" | "enemy";
  showText?: boolean;
}

function HealthBarImpl({ hp, maxHp, side, showText }: HealthBarProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  return (
    <div className={styles.wrap}>
      {showText && (
        <span className={styles.label}>
          {Math.ceil(hp)}/{maxHp}
        </span>
      )}
      <div className={styles.bar} data-side={side} role="progressbar" aria-valuenow={hp} aria-valuemax={maxHp}>
        <div className={styles.fill} style={{ transform: `scaleX(${pct})` }} />
      </div>
    </div>
  );
}

export const HealthBar = memo(HealthBarImpl);
