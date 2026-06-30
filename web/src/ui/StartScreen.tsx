// Landing screen: pick the Combat Test feature or the minimal Node Test.
// Styled via the shared token system; icons are inline SVG.

import styles from "./StartScreen.module.css";

interface Props {
  onCombatTest: () => void;
  onNodeTest: () => void;
}

function SwordsIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.icon} aria-hidden>
      <path d="M12 6l5 1 17 23-4 4L7 17Z" fill="var(--c-blood)" />
      <path d="M36 6l-5 1L14 30l4 4 17-17Z" fill="var(--c-gold)" />
      <rect x={6} y={36} width={10} height={4} rx={1} transform="rotate(45 11 38)" fill="var(--c-parchment-dim)" />
      <rect x={32} y={36} width={10} height={4} rx={1} transform="rotate(-45 37 38)" fill="var(--c-parchment-dim)" />
    </svg>
  );
}

function NodeIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.icon} aria-hidden>
      <path d="M6 16l18-8 18 8-18 8Z" fill="var(--c-royal-light)" />
      <path d="M6 16v16l18 8V24Z" fill="var(--c-royal-deep)" />
      <path d="M42 16v16l-18 8V24Z" fill="var(--c-royal)" />
      <circle cx={24} cy={15} r={4} fill="var(--c-gold)" />
      <circle cx={14} cy={28} r={3} fill="var(--c-gold-light)" />
      <circle cx={34} cy={29} r={3} fill="var(--c-gold-light)" />
    </svg>
  );
}

export function StartScreen({ onCombatTest, onNodeTest }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Godblood</h1>
        <p className={styles.subtitle}>A demigod kingdom, day by day.</p>

        <button className={`${styles.card} ${styles.test}`} onClick={onCombatTest}>
          <SwordsIcon />
          <span className={styles.text}>
            <span className={styles.name}>Combat Test</span>
            <span className={styles.desc}>Watch the tick-based battle engine resolve a fight.</span>
          </span>
        </button>

        <button className={`${styles.card} ${styles.node}`} onClick={onNodeTest}>
          <NodeIcon />
          <span className={styles.text}>
            <span className={styles.name}>Node Test</span>
            <span className={styles.desc}>Preview the world map and building nodes rendered from the Art Library.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
