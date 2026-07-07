// Landing screen: the "Asset Report" key art (its own title) with a compact menu
// of entry points. Controls use the shared kit <Button> — the app's single,
// token-driven button system — uniform gold, label only, no bespoke cards.

import { Button } from "./kit";
import styles from "./StartScreen.module.css";

interface Props {
  onGuild: () => void;
  onCombatTest: () => void;
  onNodeTest: () => void;
}

export function StartScreen({ onGuild, onCombatTest, onNodeTest }: Props) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.srOnly}>Asset Report</h1>
      <nav className={styles.menu} aria-label="Main menu">
        <Button className={styles.menuBtn} onClick={onGuild}>
          Enter the Guild
        </Button>
        <Button variant="secondary" className={styles.menuBtn} onClick={onNodeTest}>
          World Map
        </Button>
        <Button variant="secondary" className={styles.menuBtn} onClick={onCombatTest}>
          Combat Test
        </Button>
      </nav>
    </div>
  );
}
