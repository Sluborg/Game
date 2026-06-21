// Combat log — newest line on top, coloured by tone. Reads the formatted lines
// the clock produced from engine events.

import { memo, useMemo } from "react";
import type { LogLine } from "./format";
import styles from "./CombatLog.module.css";

export interface CombatLogProps {
  log: { id: number; line: LogLine }[];
}

function CombatLogImpl({ log }: CombatLogProps) {
  const newestFirst = useMemo(() => log.slice().reverse(), [log]);
  return (
    <div className={styles.log}>
      <div className={styles.title}>Combat Log</div>
      <div className={styles.lines}>
        {newestFirst.length === 0 ? (
          <p className={styles.hint}>Press Start to begin the fight.</p>
        ) : (
          newestFirst.map((entry, i) => (
            <p
              key={entry.id}
              className={`${styles.line} ${styles[entry.line.tone]}`}
              style={{ opacity: Math.max(0.4, 1 - i * 0.05) }}
            >
              {entry.line.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

export const CombatLog = memo(CombatLogImpl);
