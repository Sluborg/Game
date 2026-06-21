// LpcSprite — composites z-ordered LPC layers onto a <canvas> and animates them
// with a single requestAnimationFrame loop (no setTimeout/setInterval, no React
// state per frame). The figure faces the viewer; combat motion is expressed as a
// horizontal lunge toward the enemy plus a real LPC walk-frame step on a swing,
// and a recoil + flash when hurt. The canvas is only redrawn when the source
// frame changes; the per-frame transform is a cheap style write.

import { memo, useEffect, useRef } from "react";
import { loadImage } from "./loader";
import { FRAME, type ResolvedLayer } from "./types";
import styles from "./LpcSprite.module.css";

// Source frames come from the walk-down row (weapon held + visible in every
// frame); the walk cycle gives the lunge a real stepping motion.
const WALK_ROW = 10;
const WALK_FRAMES = 9;
const ATTACK_MS = 340;
const HURT_MS = 260;
const BOB_PERIOD = 2400;

type Action = { type: "attack" | "hurt"; start: number } | null;

export interface LpcSpriteProps {
  layers: ResolvedLayer[];
  /** +1 lunges right (party), -1 lunges left (enemies). */
  lungeDir: 1 | -1;
  swingNonce: number;
  hurtNonce: number;
  /** Base display scale (size hierarchy). */
  scale?: number;
  /** Knocked out — static, greyed. */
  down?: boolean;
}

function LpcSpriteImpl({ layers, lungeDir, swingNonce, hurtNonce, scale = 1, down = false }: LpcSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<{ img: HTMLImageElement; layer: ResolvedLayer }[]>([]);
  const readyRef = useRef(false);
  const lastColRef = useRef(-1);
  const actionRef = useRef<Action>(null);

  // Mirror animation-affecting props into refs so the long-lived rAF loop stays current.
  const propsRef = useRef({ lungeDir, scale, down });
  propsRef.current = { lungeDir, scale, down };

  // Load (and cache) layer images; redraw from scratch when the gear/tint changes.
  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    Promise.all(layers.map((layer) => loadImage(layer.url).then((img) => ({ img, layer })))).then(
      (loaded) => {
        if (cancelled) return;
        imagesRef.current = loaded;
        readyRef.current = true;
        lastColRef.current = -1; // force a redraw
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [layers]);

  // Trigger one-shot actions from event nonces (hurt wins if both fire).
  const firstSwing = useRef(swingNonce);
  const firstHurt = useRef(hurtNonce);
  useEffect(() => {
    if (swingNonce !== firstSwing.current) {
      firstSwing.current = swingNonce;
      if (actionRef.current?.type !== "hurt") actionRef.current = { type: "attack", start: performance.now() };
    }
  }, [swingNonce]);
  useEffect(() => {
    if (hurtNonce !== firstHurt.current) {
      firstHurt.current = hurtNonce;
      actionRef.current = { type: "hurt", start: performance.now() };
    }
  }, [hurtNonce]);

  // The animation loop.
  useEffect(() => {
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
    const sctx = scratch.getContext("2d")!;

    const draw = (col: number) => {
      if (!readyRef.current) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, FRAME, FRAME);
      const sx = col * FRAME;
      const sy = WALK_ROW * FRAME;
      for (const { img, layer } of imagesRef.current) {
        sctx.imageSmoothingEnabled = false;
        sctx.globalCompositeOperation = "source-over";
        sctx.globalAlpha = 1;
        sctx.clearRect(0, 0, FRAME, FRAME);
        sctx.drawImage(img, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
        if (layer.tint) {
          sctx.globalCompositeOperation = "source-atop";
          sctx.globalAlpha = layer.tint.strength;
          sctx.fillStyle = layer.tint.color;
          sctx.fillRect(0, 0, FRAME, FRAME);
        }
        ctx.drawImage(scratch, 0, 0);
      }
    };

    let raf = 0;
    const loop = (now: number) => {
      const { lungeDir: dir, scale: s, down: ko } = propsRef.current;
      let col = 0;
      let tx = 0;
      let ty = 0;
      let aScale = 1;
      let filter = "";

      if (ko) {
        filter = "grayscale(0.8)";
      } else {
        const act = actionRef.current;
        if (act && now - act.start >= (act.type === "attack" ? ATTACK_MS : HURT_MS)) actionRef.current = null;
        const live = actionRef.current;
        if (live?.type === "attack") {
          const p = (now - live.start) / ATTACK_MS;
          const swing = Math.sin(p * Math.PI);
          col = Math.min(WALK_FRAMES - 1, Math.floor(p * WALK_FRAMES));
          tx = swing * 24 * dir;
          ty = -swing * 6;
          aScale = 1 + swing * 0.06;
        } else if (live?.type === "hurt") {
          const p = (now - live.start) / HURT_MS;
          const env = Math.sin(p * Math.PI);
          tx = -dir * env * 9 + Math.sin(p * 48) * 1.6;
          filter = `brightness(${1 + (1 - p) * 1.1})`;
        } else {
          ty = Math.sin((now / BOB_PERIOD) * Math.PI * 2) * 2;
        }
      }

      if (col !== lastColRef.current) {
        draw(col);
        lastColRef.current = col;
      }
      canvas.style.transform = `translate(${tx}%, ${ty}%) scale(${s * aScale})`;
      canvas.style.filter = filter;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={FRAME} height={FRAME} className={styles.canvas} aria-hidden />;
}

export const LpcSprite = memo(LpcSpriteImpl);
