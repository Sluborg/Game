// Inspect: tap a chip to see its effect in a floating parchment popover ABOVE
// the chip (flips below only when there isn't room up top). Design notes that
// make this safe inside the bottom Sheet (which owns Escape, scroll-locks its
// body, and traps focus in its panel):
//   * The popover is TEXT-ONLY (no focusable controls), portalled to the body
//     and position:fixed — so it escapes the scroll container's clipping, and
//     the Sheet's panel focus-trap simply never sees it. (Cross-hero "View"
//     lives inline in the relation row, inside the panel — not in here.) A
//     caret on the box points back at the source chip, so the note stays
//     anchored without any persistent ring on the chip itself.
//   * Dismiss (reworked — no scrim, which used to eat the opening/closing tap):
//       - Re-tapping the SAME chip, or tapping a DIFFERENT chip, is owned by the
//         chip's own onClick (a same-id toggle / an in-place re-anchor). The
//         outside listener IGNORES taps that land on any [data-inspect-chip] so
//         it never fights those — a chip swap repositions one mounted box.
//       - Any OTHER tap (blank sheet, tab strip, backdrop) closes the popover.
//         The listener is armed on the NEXT frame so the opening tap can't
//         immediately close it.
//       - A backdrop tap must close the popover WITHOUT also closing the Sheet
//         (whose backdrop closes on click). So on a backdrop-targeted dismiss we
//         install a capture-phase click "swallow": it stops only clicks whose
//         target is OUTSIDE the dialog panel, self-removes on the first click of
//         any kind, and is also disarmed by the next pointerdown — so a no-click
//         drag can never leave it stale to eat an unrelated later click. It
//         lives OUTSIDE this effect's cleanup on purpose: closing the popover
//         re-runs the effect, and tearing the swallow down there would kill it
//         before the very click it exists to catch.
//   * Escape is owned by the Sheet (= close sheet), which also unmounts this —
//     an accepted non-dismiss path for a non-interactive note.
//   * Capture-phase scroll + resize dismiss it, since it's pinned to the
//     viewport while its anchor chip can scroll away.

import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./HeroCard.module.css";

interface InspectChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

/** A chip that opens an inspect popover. The caller wires onClick to report the
 * chip's element (event.currentTarget) + its title/effect up to HeroCard. The
 * `data-inspect-chip` marker lets the outside-dismiss listener recognise a chip
 * tap and stay out of its way (the chip's own onClick owns toggle / re-anchor).
 * `aria-expanded` carries the open state to assistive tech; there is no longer a
 * persistent visual "open" ring — the popover (with its caret) IS the feedback. */
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
  // Lifted so the outside-dismiss listener can tell "tap inside the note" from
  // "tap outside", and so PopoverBox measures against the same element.
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
      // Only a backdrop-targeted tap needs the Sheet-close guard. NB: this assumes
      // the popover lives inside the Sheet's role="dialog" panel (true — HeroCard
      // only ever renders inside <Sheet>). If reused standalone, closest() is null
      // for every tap and would arm a needless (harmless, self-disarming) swallow.
      if (!t.closest('[role="dialog"]')) armBackdropSwallow();
    };

    // Stop the click a backdrop tap generates from reaching the Sheet backdrop's
    // onClick — but ONLY that click, and only if it lands outside the dialog.
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
