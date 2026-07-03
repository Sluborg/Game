// Inspect: tap a chip to see its effect in a floating parchment popover ABOVE
// the chip (flips below only when there isn't room up top). Design notes that
// make this safe inside the bottom Sheet (which owns Escape, scroll-locks its
// body, and traps focus in its panel):
//   * The popover is TEXT-ONLY (no focusable controls), portalled to the body
//     and position:fixed — so it escapes the scroll container's clipping, and
//     the Sheet's panel focus-trap simply never sees it. (Cross-hero "Go to"
//     lives inline in the relation row, inside the panel — not in here.)
//   * A transparent scrim above the sheet catches the dismiss tap and stops it
//     propagating, so dismissing the popover never also closes the sheet, and
//     the opening tap can't be swallowed (the scrim mounts after it).
//   * Escape is owned by the Sheet (= close sheet), which also unmounts this —
//     an accepted non-dismiss path for a non-interactive note.
//   * Capture-phase scroll + resize dismiss it, since it's pinned to the
//     viewport while its anchor chip can scroll away.

import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import styles from "./HeroCard.module.css";

interface InspectChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

/** A chip that opens an inspect popover. The caller wires onClick to report the
 * chip's element (event.currentTarget) + its title/effect up to HeroCard. */
export function InspectChip({ active, className, children, ...rest }: InspectChipProps) {
  return (
    <button
      type="button"
      aria-expanded={active}
      className={`${styles.inspectable} ${className ?? ""} ${active ? styles.inspectOpen : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface InspectData {
  id: string;
  anchor: HTMLElement;
  title: string;
  effect: string;
}

export function InspectPopover({ data, onClose }: { data: InspectData | null; onClose: () => void }) {
  // Dismiss when the anchor can move out from under a viewport-pinned box.
  useEffect(() => {
    if (!data) return;
    const close = () => onClose();
    document.addEventListener("scroll", close, true); // capture: scroll doesn't bubble
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [data, onClose]);

  if (!data) return null;
  return createPortal(
    <>
      <div
        className={styles.scrim}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <PopoverBox anchor={data.anchor} title={data.title} effect={data.effect} />
    </>,
    document.body,
  );
}

function PopoverBox({ anchor, title, effect }: { anchor: HTMLElement; title: string; effect: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Start off-screen so the first (measuring) paint doesn't flash at 0,0.
  const [pos, setPos] = useState({ top: -9999, left: 0, caretX: 20, place: "above" as "above" | "below" });

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const r = anchor.getBoundingClientRect();
    const bw = box.offsetWidth;
    const bh = box.offsetHeight;
    const M = 8; // viewport margin
    const GAP = 10; // gap between chip and box
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const center = r.left + r.width / 2;
    const left = Math.min(Math.max(center - bw / 2, M), Math.max(M, vw - bw - M));
    let place: "above" | "below" = "above";
    let top = r.top - bh - GAP;
    if (top < M) {
      place = "below";
      top = r.bottom + GAP;
      if (top + bh > vh - M) top = Math.max(M, vh - bh - M);
    }
    const caretX = Math.min(Math.max(center - left, 14), Math.max(14, bw - 14));
    setPos({ top, left, caretX, place });
  }, [anchor]);

  return (
    <div ref={ref} className={styles.popover} data-place={pos.place} style={{ top: pos.top, left: pos.left }} role="note" aria-live="polite">
      <span className={styles.popCaret} data-place={pos.place} style={{ left: pos.caretX }} aria-hidden />
      <span className={styles.popTitle}>{title}</span>
      <span className={styles.popEffect}>{effect}</span>
    </div>
  );
}
