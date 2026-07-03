// Inline "tap a chip to see its effect" pattern for the hero sheet. Deliberately
// NOT a floating popover: the Sheet body is the scroll container (a bubble would
// clip / detach / fight the focus trap) and the Sheet owns Escape (= close sheet).
// So an inspectable is just a <button> chip; opening it reveals a detail card
// that reflows in beneath its group. One open at a time, owned by HeroCard and
// reset on tab/hero change. Dismiss = tap it again (or open another). No Escape,
// no portal — nothing for the Sheet's focus trap to miss.

import type { ButtonHTMLAttributes } from "react";
import styles from "./HeroCard.module.css";

interface InspectChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
  onToggle: () => void;
}

export function InspectChip({ open, onToggle, className, children, ...rest }: InspectChipProps) {
  return (
    <button
      type="button"
      className={`${styles.inspectable} ${className ?? ""} ${open ? styles.inspectOpen : ""}`}
      aria-expanded={open}
      onClick={onToggle}
      {...rest}
    >
      {children}
    </button>
  );
}

export function InspectDetail({ title, effect }: { title: string; effect: string }) {
  return (
    <div className={styles.inspectDetail} role="note">
      <span className={styles.inspectTitle}>{title}</span>
      <span className={styles.inspectEffect}>{effect}</span>
    </div>
  );
}
