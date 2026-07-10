// Icon — the Kenney icon primitive (docs/kenney.md adoption: Board Game Icons,
// CC0). The PNGs are import-bundled (same convention as the Panel frame) and
// rendered through a CSS mask so they tint with currentColor — one sprite works
// on every surface/valence. Icons CARRY meaning, text CONFIRMS it (DESIGN "UI —
// clarity via Kenney icons"): every icon in the app sits next to a label, so the
// glyph itself is decorative to assistive tech (aria-hidden).

import type { CSSProperties } from "react";
import type { IconName } from "../../game/guild";
import campfire from "../../assets/kenney/board-game-icons/campfire.png";
import sword from "../../assets/kenney/board-game-icons/sword.png";
import flagTriangle from "../../assets/kenney/board-game-icons/flag_triangle.png";
import bookClosed from "../../assets/kenney/board-game-icons/book_closed.png";
import structureHouse from "../../assets/kenney/board-game-icons/structure_house.png";
import pouch from "../../assets/kenney/board-game-icons/pouch.png";
import token from "../../assets/kenney/board-game-icons/token.png";
import notepad from "../../assets/kenney/board-game-icons/notepad.png";
import shield from "../../assets/kenney/board-game-icons/shield.png";
import hourglass from "../../assets/kenney/board-game-icons/hourglass.png";
import pawns from "../../assets/kenney/board-game-icons/pawns.png";
import pawn from "../../assets/kenney/board-game-icons/pawn.png";
import skull from "../../assets/kenney/board-game-icons/skull.png";
import bookOpen from "../../assets/kenney/board-game-icons/book_open.png";
import arrowCross from "../../assets/kenney/board-game-icons/arrow_cross.png";
import suitHearts from "../../assets/kenney/board-game-icons/suit_hearts.png";
import styles from "./Icon.module.css";

/** UI-only glyphs (board rows, skull ratings) — kept OUT of the persisted
 * IconName union: these never enter GuildState. */
export type UiIconName = "skull" | "typeInvestigation" | "typeTravel" | "typeSocial" | "typeCombat";

const SPRITES: Record<IconName | UiIconName, string> = {
  rest: campfire,
  train: sword,
  depart: flagTriangle,
  report: bookClosed,
  tavern: structureHouse,
  gold: pouch,
  spend: token,
  letter: notepad,
  watch: shield,
  night: hourglass,
  party: pawns,
  hero: pawn,
  skull,
  typeInvestigation: bookOpen,
  typeTravel: arrowCross,
  typeSocial: suitHearts,
  typeCombat: sword,
};

export interface IconProps {
  name: IconName | UiIconName;
  /** Pixel size (square). Default 18 — feed-line scale. */
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  const style: CSSProperties & Record<string, string> = {
    width: `${size}px`,
    height: `${size}px`,
    "--icon-url": `url(${SPRITES[name]})`,
  };
  return <span className={`${styles.icon}${className ? ` ${className}` : ""}`} style={style} aria-hidden />;
}
