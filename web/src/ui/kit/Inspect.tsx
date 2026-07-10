// Inspect — the floating parchment popover, EXTRACTED VERBATIM from
// web/src/ui/heroes/inspect.tsx so the Hall's ⓘ explainers reuse the
// painfully-debugged dismiss machinery instead of re-fighting it (Review #1:
// the opening-tap-closes-it bug, the backdrop swallow, the next-frame arming —
// see the original header, preserved below). heroes/inspect.tsx re-exports
// from here, so the hero sheet is byte-identical in behavior.
//
// Original design notes (what makes this safe inside AND outside a Sheet):
//   * The popover is TEXT-ONLY (no focusable controls), portalled to the body
//     and position:fixed — it escapes scroll-container clipping and any focus
//     trap never sees it. A caret points back at the source chip.
//   * Dismiss: re-tapping the SAME chip or a DIFFERENT chip is owned by the
//     chip's own onClick (the outside listener ignores [data-inspect-chip]
//     taps); any OTHER tap closes it, armed on the NEXT frame so the opening
//     tap can't immediately close it. A backdrop-targeted dismiss arms a
//     self-disarming capture click-swallow so a Sheet backdrop doesn't also
//     close; used standalone (no role="dialog" ancestor) the swallow is
//     needless but harmless — it self-disarms.
//   * Capture-phase scroll + resize dismiss it (viewport-pinned box, scrolling
//     anchor).

import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./Inspect.module.css";

interface InspectChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

/** A chip that opens an inspect popover. `data-inspect-chip` lets the
 * outside-dismiss listener stay out of the chip's own toggle/re-anchor. */
export function InspectChip({ active, className, children, ...rest }: InspectChipProps) {
  return (
    <button
      type="button"
      data-inspect-chip
      aria-expanded={active}
      className={`${styles.inspectable} ${className ?? ""}`}
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
  const boxRef = useRef<HTMLDivElement>(null);

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

  // Outside-tap dismiss (see the file header for the full rationale).
  useEffect(() => {
    if (!data) return;

    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (boxRef.current?.contains(t)) return; // tapping the note itself: ignore
      if (t.closest("[data-inspect-chip]")) return; // a chip owns its own toggle / re-anchor
      onClose();
      if (!t.closest('[role="dialog"]')) armBackdropSwallow();
    };

    function armBackdropSwallow() {
      const swallow = (ev: Event) => {
        const et = ev.target as Element | null;
        if (et && !et.closest('[role="dialog"]')) ev.stopPropagation();
        disarm();
      };
      const disarmOnNextDown = () => disarm();
      const disarm = () => {
        document.removeEventListener("click", swallow, true);
        document.removeEventListener("pointerdown", disarmOnNextDown, true);
      };
      document.addEventListener("click", swallow, true);
      document.addEventListener("pointerdown", disarmOnNextDown, true);
    }

    // Defer a frame so the opening tap's own pointer sequence isn't caught.
    const raf = requestAnimationFrame(() => document.addEventListener("pointerdown", onDown, true));
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [data, onClose]);

  if (!data) return null;
  return createPortal(<PopoverBox boxRef={boxRef} anchor={data.anchor} title={data.title} effect={data.effect} />, document.body);
}

function PopoverBox({
  boxRef,
  anchor,
  title,
  effect,
}: {
  boxRef: RefObject<HTMLDivElement>;
  anchor: HTMLElement;
  title: string;
  effect: string;
}) {
  // Start off-screen so the first (measuring) paint doesn't flash at 0,0.
  const [pos, setPos] = useState({ top: -9999, left: 0, caretX: 20, place: "above" as "above" | "below" });

  useLayoutEffect(() => {
    const box = boxRef.current;
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
  }, [boxRef, anchor]);

  return (
    <div ref={boxRef} className={styles.popover} data-place={pos.place} style={{ top: pos.top, left: pos.left }} role="note" aria-hidden>
      <span className={styles.popCaret} data-place={pos.place} style={{ left: pos.caretX }} aria-hidden />
      <span className={styles.popTitle}>{title}</span>
      <span className={styles.popEffect}>{effect}</span>
    </div>
  );
}
