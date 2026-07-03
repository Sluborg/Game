// Transport controls: Start / Pause-Resume / Reset and a live speed slider.

import { memo } from "react";
import type { ClockStatus } from "./useCombatClock";
import styles from "./Controls.module.css";

export interface ControlsProps {
  status: ClockStatus;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
}

function ControlsImpl({ status, speed, onStart, onPause, onResume, onReset, onSpeed }: ControlsProps) {
  const running = status === "running";
  const paused = status === "paused";
  return (
    <div className={styles.controls}>
      <div className={styles.row}>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={onStart}
          disabled={running}
        >
          {status === "ended" ? "Fight again" : status === "paused" ? "Restart" : "Start"}
        </button>
        <button
          className={styles.btn}
          onClick={paused ? onResume : onPause}
          disabled={!running && !paused}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={onReset}>
          Reset
        </button>
      </div>

      <label className={styles.speed}>
        <span className={styles.speedLabel}>Speed</span>
        <input
          className={styles.slider}
          type="range"
          min={0.25}
          max={3}
          step={0.25}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
        <span className={styles.speedValue}>{speed.toFixed(2)}×</span>
      </label>
    </div>
  );
}

export const Controls = memo(ControlsImpl);
