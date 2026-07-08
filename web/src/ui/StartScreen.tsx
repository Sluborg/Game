// Landing screen: the "Asset Report" key art (its own title) with a compact menu
// of entry points. "Enter the Guild" is the primary way into the Slice 1 loop;
// World Map and Combat Test are secondary. A Reset control wipes the saved run
// (behind a confirm), reachable even if a broken save ever kept the app from the
// board. Controls use the shared kit <Button>.

import { useState } from "react";
import { Button } from "./kit";
import styles from "./StartScreen.module.css";

interface Props {
  onPlay: () => void;
  onNodeTest: () => void;
  onCombatTest: () => void;
  onReset: () => void;
}

export function StartScreen({ onPlay, onNodeTest, onCombatTest, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.screen}>
      <h1 className={styles.srOnly}>Asset Report</h1>
      <nav className={styles.menu} aria-label="Main menu">
        <Button className={styles.menuBtn} onClick={onPlay}>
          Enter the Guild
        </Button>
        <Button variant="secondary" className={styles.menuBtn} onClick={onNodeTest}>
          World Map
        </Button>
        <Button variant="secondary" className={styles.menuBtn} onClick={onCombatTest}>
          Combat Test
        </Button>
        {!confirming ? (
          <Button variant="secondary" className={styles.menuBtn} onClick={() => setConfirming(true)}>
            Reset run
          </Button>
        ) : (
          <div className={styles.confirm}>
            <span className={styles.confirmText}>Wipe this run and start over?</span>
            <div className={styles.confirmRow}>
              <Button
                className={styles.confirmBtn}
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
              >
                Reset
              </Button>
              <Button variant="secondary" className={styles.confirmBtn} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
