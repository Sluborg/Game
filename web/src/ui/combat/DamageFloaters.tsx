// Floating combat numbers. Each floater is spawned from a combat event with a
// fixed scatter offset, animates once via CSS, and removes itself on
// animationend — no timers, and memoized so it never re-renders (no jitter).

import { memo } from "react";
import styles from "./DamageFloaters.module.css";

export type FloaterKind = "normal" | "crit" | "miss";

export interface Floater {
  id: number;
  cellId: string;
  kind: FloaterKind;
  text: string;
  /** Scatter within the cell, in %, fixed at spawn. */
  dx: number;
  dy: number;
}

const FloaterView = memo(function FloaterView({
  floater,
  onDone,
}: {
  floater: Floater;
  onDone: (id: number) => void;
}) {
  return (
    <span
      className={`${styles.floater} ${styles[floater.kind]}`}
      style={{ left: `${50 + floater.dx}%`, top: `${46 + floater.dy}%` }}
      onAnimationEnd={() => onDone(floater.id)}
    >
      {floater.text}
    </span>
  );
});

export interface DamageFloatersProps {
  floaters: Floater[];
  onDone: (id: number) => void;
}

function DamageFloatersImpl({ floaters, onDone }: DamageFloatersProps) {
  return (
    <div className={styles.layer} aria-hidden>
      {floaters.map((f) => (
        <FloaterView key={f.id} floater={f} onDone={onDone} />
      ))}
    </div>
  );
}

export const DamageFloaters = memo(DamageFloatersImpl);
