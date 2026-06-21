// Landing screen: pick Campaign (the existing day/economy game) or the Combat
// Test feature. Styled via the shared token system; icons are inline SVG.

import styles from "./StartScreen.module.css";

interface Props {
  onPlayCampaign: () => void;
  onCombatTest: () => void;
}

function CastleIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.icon} aria-hidden>
      <path d="M8 44V20l5 3 5-5 6 5 6-5 5 5 5-3v24Z" fill="var(--c-royal-light)" />
      <path d="M8 20V12h4v4h6v-4h4v4h6v-4h4v4h6v8l-5-3-5 5-6-5-6 5-5-5Z" fill="var(--c-gold)" />
      <rect x={20} y={30} width={8} height={14} rx={1} fill="var(--surface-0)" />
    </svg>
  );
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

export function StartScreen({ onPlayCampaign, onCombatTest }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Godblood</h1>
        <p className={styles.subtitle}>A demigod kingdom, day by day.</p>

        <button className={`${styles.card} ${styles.campaign}`} onClick={onPlayCampaign}>
          <CastleIcon />
          <span className={styles.text}>
            <span className={styles.name}>Campaign</span>
            <span className={styles.desc}>Build your kingdom, recruit heroes, survive each day.</span>
          </span>
        </button>

        <button className={`${styles.card} ${styles.test}`} onClick={onCombatTest}>
          <SwordsIcon />
          <span className={styles.text}>
            <span className={styles.name}>Combat Test</span>
            <span className={styles.desc}>Watch the tick-based battle engine resolve a fight.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
