// UnitSprite — composes a unit's model from layered SVG (body + armour + weapon)
// using the body's anchors so gear lines up, and plays attack/hurt animations
// driven by event nonces. Pure presentation: it knows appearance, not stats.

import { memo, useEffect, useRef, useState } from "react";
import type { Appearance } from "../../game/battle";
import { BODY_ANCHORS, VIEWBOX } from "./sprites/anchors";
import { ARMOR_SPRITES, BODY_SPRITES, WEAPON_SPRITES } from "./sprites/registry";
import styles from "./sprites/sprites.module.css";

type Anim = "none" | "hurt" | "lungeUp" | "lungeDown";

export interface UnitSpriteProps {
  appearance: Appearance;
  /** Hero faces up (attacks the top row); monsters face down. */
  facing: "up" | "down";
  /** Bump to replay the attack lunge + weapon swing. */
  swingNonce: number;
  /** Bump to replay the hurt reaction. */
  hurtNonce: number;
  /** Knocked-out husk. */
  down?: boolean;
}

function UnitSpriteImpl({ appearance, facing, swingNonce, hurtNonce, down }: UnitSpriteProps) {
  const anchors = BODY_ANCHORS[appearance.body];
  const Body = BODY_SPRITES[appearance.body];
  const Weapon = WEAPON_SPRITES[appearance.weapon];
  const Armor = ARMOR_SPRITES[appearance.armor];

  // One animation slot per sprite: the latest event wins, replayed by bumping a
  // sequence number that remounts the animated group (CSS plays once, then rests).
  const [{ seq, anim }, setAnim] = useState<{ seq: number; anim: Anim }>({ seq: 0, anim: "none" });
  const prev = useRef({ swing: swingNonce, hurt: hurtNonce });

  useEffect(() => {
    const p = prev.current;
    let next: Anim | null = null;
    if (hurtNonce !== p.hurt) next = "hurt";
    else if (swingNonce !== p.swing) next = facing === "up" ? "lungeUp" : "lungeDown";
    prev.current = { swing: swingNonce, hurt: hurtNonce };
    if (next) setAnim((a) => ({ seq: a.seq + 1, anim: next as Anim }));
  }, [swingNonce, hurtNonce, facing]);

  const animClass =
    anim === "hurt"
      ? styles.hurt
      : anim === "lungeUp"
        ? styles.lungeUp
        : anim === "lungeDown"
          ? styles.lungeDown
          : undefined;
  const swinging = anim === "lungeUp" || anim === "lungeDown";
  const heft = `translate(60 132) scale(${anchors.scale}) translate(-60 -132)`;

  return (
    <svg
      className={`${styles.sprite} ${styles[appearance.body]} ${down ? styles.down : ""}`}
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      role="img"
      aria-hidden
    >
      <g className={styles.idle}>
        <g key={seq} className={animClass}>
          <g transform={heft}>
            <Body />
            <Armor anchors={anchors} />
            <g transform={`translate(${anchors.hand.x} ${anchors.hand.y})`}>
              <g className={swinging ? styles.weaponSwing : undefined}>
                <Weapon />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export const UnitSprite = memo(UnitSpriteImpl);
