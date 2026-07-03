// Sheet — a phone-first bottom sheet/overlay. It slides up over the current
// screen, dims the rest, and is dismissible three ways: backdrop tap, the ×
// close control, or Escape. While open it traps focus inside the panel and
// locks the page behind it from scrolling; on close it restores focus to
// whatever was focused when it opened. This is the container the hero detail
// (stat page) opens in. ~460px max width, tested at that phone viewport.

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Sheet.module.css";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Title shown in the sheet header and used as the dialog's accessible name. */
  title?: string;
  /** Accessible label for the × control. */
  closeLabel?: string;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, closeLabel = "Close", children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Remember the pre-open focus and restore it when the sheet closes/unmounts.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      restoreRef.current?.focus?.();
    };
  }, [open]);

  // Lock the page behind the sheet from scrolling (symmetric add/remove so a
  // StrictMode double-mount can't leave the body stuck locked).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes; Tab / Shift+Tab cycle within the panel (focus trap).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      {/* Backdrop: a tap anywhere outside the panel dismisses. */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div className={styles.panel} ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.header}>
          <span className={styles.handle} aria-hidden />
          {title && <h2 className={styles.title}>{title}</h2>}
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
