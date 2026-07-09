// NavBar — the persistent bottom navigation for the guild app. Four tabs
// (Map / Guild / Heroes / Report), each a ≥44px tap target with a 24×24 inline-SVG
// icon (currentColor, same pattern as StartScreen's icons — no raster art) plus a
// label. The Report tab carries an unread-envelope badge. Combat Test is a dev
// tool and is NOT in the nav (it's reached from the Start screen). The active tab
// is highlighted and marked aria-current. Keys match Root's hash routes.

import type { ReactNode } from "react";
import styles from "./NavBar.module.css";

export type NavKey = "node" | "guild" | "heroes" | "report";

export interface NavBarProps {
  active?: NavKey;
  unread?: number;
  onNavigate: (key: NavKey) => void;
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function GuildIcon() {
  // A guild-hall / notice-board: a framed board on posts.
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8h10M7 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 16v4M16 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HeroesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <circle cx="9" cy="7.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.2A3 3 0 0 1 18 11M17.5 14.7c2.6.4 4.5 2.5 4.5 5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon() {
  // A sealed letter.
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 6.5 12 13l8.5-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
  { key: "guild", label: "Hall", icon: <GuildIcon /> },
  { key: "heroes", label: "Heroes", icon: <HeroesIcon /> },
  { key: "report", label: "Report", icon: <ReportIcon /> },
];

export function NavBar({ active, unread = 0, onNavigate }: NavBarProps) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const showBadge = tab.key === "report" && unread > 0;
        return (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(tab.key)}
          >
            <span className={styles.icon}>
              {tab.icon}
              {showBadge && <span className={styles.badge} aria-label={`${unread} unread`}>{unread}</span>}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
