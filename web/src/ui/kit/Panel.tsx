// Panel — a decorative Kenney "Fantasy UI Borders" frame (CC0) drawn as a CSS
// 9-slice border-image, offered as a reusable kit primitive so any screen can
// wrap content in the guild's fantasy frame. Polymorphic via `as` (defaults to
// a <div>) so it can BE the semantic element it frames (e.g. a <section>) rather
// than adding a wrapper level — keeping one framed level per view.
//
// The frame degrades gracefully: Panel.module.css declares a real stroke-gold
// border UNDER the border-image, so if the sprite ever fails to load the element
// falls back to the plain bordered look, never to nothing (Review #1, Adversary).

import type { ComponentPropsWithoutRef, ElementType } from "react";
import styles from "./Panel.module.css";

export type PanelProps<T extends ElementType = "div"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Panel<T extends ElementType = "div">({ as, className, ...rest }: PanelProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return <Tag className={[styles.panel, className].filter(Boolean).join(" ")} {...rest} />;
}
