// HeroSprite — renders a hero's placeholder portrait by reusing the existing LPC
// compositor (LpcSprite) at a caller-set square size (64×64 roster thumbnail;
// 192 stat-page portrait display — the portrait ART TARGET remains 256×256, an
// asset-vs-display split). Same composite, CSS-upscaled with image-rendering:
// pixelated, exactly how LpcSprite already renders. Rendered static (no bob).
//
// LpcSprite draws to an aria-hidden <canvas> and silently swallows image-load
// failures (LpcSprite.tsx:58) — on a fresh clone / blocked fetch that would
// leave the roster a wall of blank boxes with nothing in the accessibility
// tree. So this wrapper (a) preloads the layer images through the shared cache
// to learn the real load state, (b) shows an accessible initials tile until/
// unless the sprite is ready, and (c) always carries role="img" + a name label.
// Same graceful-degradation intent as the map screen's placeholder catalog.

import { useEffect, useState } from "react";
import { LpcSprite } from "../combat/lpc/LpcSprite";
import { loadImage } from "../combat/lpc/loader";
import type { ResolvedLayer } from "../combat/lpc/types";
import styles from "./HeroSprite.module.css";

export interface HeroSpriteProps {
  layers: ResolvedLayer[];
  name: string;
  /** Pixel size of the square (64 roster thumb, 256 stat-page portrait). */
  size: number;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function HeroSprite({ layers, name, size }: HeroSpriteProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    Promise.all(layers.map((l) => loadImage(l.url)))
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        // Leave `ready` false — the initials fallback stays visible.
      });
    return () => {
      alive = false;
    };
  }, [layers]);

  return (
    <div
      className={styles.frame}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name} portrait`}
    >
      {!ready && (
        <span className={styles.fallback} style={{ fontSize: Math.round(size * 0.36) }} aria-hidden>
          {initialsOf(name)}
        </span>
      )}
      {ready && (
        <div className={styles.sprite}>
          {/* Static presentation (no idle bob) — heroes are shown, not fighting. */}
          <LpcSprite layers={layers} lungeDir={1} swingNonce={0} hurtNonce={0} scale={1} animate={false} />
        </div>
      )}
    </div>
  );
}
