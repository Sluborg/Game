// LpcSprite — the compositor. Stacks transparent 64x64 LPC layers (z-ordered)
// into one figure on a <canvas>, cropping the requested animation frame and
// applying an optional per-layer tint. Rendered at native 64px and CSS-scaled
// with pixelated rendering, so every unit shares one uniform scale.
//
// Phase A draws a single (idle) frame; the frame/animation/direction props are
// already here so Phase B can drive them from requestAnimationFrame.

import { memo, useEffect, useRef } from "react";
import { loadImage } from "./loader";
import {
  ANIMATIONS,
  DIRECTION_ROW,
  FRAME,
  type AnimationName,
  type Direction,
  type ResolvedLayer,
} from "./types";
import styles from "./LpcSprite.module.css";

export interface LpcSpriteProps {
  layers: ResolvedLayer[];
  animation?: AnimationName;
  /** Frame index within the animation. */
  frame?: number;
  direction?: Direction;
  className?: string;
}

function sourceRect(animation: AnimationName, frame: number, direction: Direction) {
  const def = ANIMATIONS[animation];
  const row = def.singleDir ? def.row : def.row + DIRECTION_ROW[direction];
  const col = Math.min(frame, def.frames - 1);
  return { sx: col * FRAME, sy: row * FRAME };
}

function LpcSpriteImpl({
  layers,
  animation = "idle",
  frame = 0,
  direction = "down",
  className,
}: LpcSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!scratchRef.current) {
      const s = document.createElement("canvas");
      s.width = FRAME;
      s.height = FRAME;
      scratchRef.current = s;
    }
    const scratch = scratchRef.current;
    const sctx = scratch.getContext("2d");
    if (!sctx) return;

    const { sx, sy } = sourceRect(animation, frame, direction);

    Promise.all(layers.map((l) => loadImage(l.url).then((img) => ({ img, layer: l })))).then(
      (loaded) => {
        if (cancelled) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, FRAME, FRAME);
        for (const { img, layer } of loaded) {
          sctx.imageSmoothingEnabled = false;
          sctx.clearRect(0, 0, FRAME, FRAME);
          sctx.globalCompositeOperation = "source-over";
          sctx.globalAlpha = 1;
          sctx.drawImage(img, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
          if (layer.tint) {
            sctx.globalCompositeOperation = "source-atop";
            sctx.globalAlpha = layer.tint.strength;
            sctx.fillStyle = layer.tint.color;
            sctx.fillRect(0, 0, FRAME, FRAME);
          }
          ctx.drawImage(scratch, 0, 0);
        }
      },
      () => {
        /* a missing layer simply doesn't draw; others still composite */
      },
    );

    return () => {
      cancelled = true;
    };
  }, [layers, animation, frame, direction]);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME}
      height={FRAME}
      className={`${styles.canvas} ${className ?? ""}`}
      aria-hidden
    />
  );
}

export const LpcSprite = memo(LpcSpriteImpl);
