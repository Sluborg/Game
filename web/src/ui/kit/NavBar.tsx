// NavBar — the persistent bottom navigation for the guild app. Three tabs
// (Map / Heroes / Combat Test), each a ≥44px tap target with a 24×24 inline-SVG
// icon (currentColor, same pattern as StartScreen's icons — no raster art) plus
// a label. This replaces every screen's old "← Menu" back-to-start button, so
// navigation no longer dead-ends at the start screen. The active tab is
// highlighted and marked aria-current. Keys match Root's hash routes.

import type { ReactNode } from "react";
import styles from "./NavBar.module.css";

export type NavKey = "node" | "heroes" | "test";

export interface NavBarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
}

function MapIcon() {
  // Folded map with a marker pin.
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function HeroesIcon() {
  // Two figures = the roster.
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <circle cx="9" cy="7.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.2A3 3 0 0 1 18 11M17.5 14.7c2.6.4 4.5 2.5 4.5 5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SwordsIcon() {
  // Crossed swords, echoing StartScreen's Combat Test icon at 24×24.
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <path d="M4 4l9 11M20 4l-9 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 4l2 .5M20 4l-2 .5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 18l3-3M16 18l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface Tab {
  key: NavKey;
  label: string;
  icon: ReactNode;
}

const TABS: Tab[] = [
  { key: "node", label: "Map", icon: <MapIcon /> },
  { key: "heroes", label: "Heroes", icon: <HeroesIcon /> },
  { key: "test", label: "Combat Test", icon: <SwordsIcon /> },
];

export function NavBar({ active, onNavigate }: NavBarProps) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(tab.key)}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
