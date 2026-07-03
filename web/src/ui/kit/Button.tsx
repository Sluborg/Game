// Button — the reusable, token-driven button for the guild UI. Two variants
// (primary = gold call-to-action, secondary = outline), both always ≥44px so
// they're comfortable phone tap targets (the repo-wide convention — see the
// 2026-07-01 map-nodes work in PROGRESS.md). Colours come only from tokens.css.

import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({ variant = "primary", className, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]} ${className ?? ""}`} {...rest} />
  );
}
