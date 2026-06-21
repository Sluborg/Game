// LpcSprite — composites z-ordered LPC layers onto a <canvas> and animates them
// with a single requestAnimationFrame loop (no setTimeout/setInterval, no React
// state per frame). Units are drawn from the LEFT-facing pose (the held weapon
// is reliably present there); the hero is CSS-mirrored to face right. Combat
// motion is a horizontal lunge toward the enemy plus an idle bob and a hurt
// recoil + flash. The canvas is drawn once (the pose frame); per-frame work is a
// cheap transform/filter write.

import { memo, useEffect, useRef } from "react";
import { loadImage } from "./loader";
import { FRAME, type ResolvedLayer } from "./types";
import styles from "./LpcSprite.module.css";

// Left-facing walk row, standing frame — held weapon present for our weapons.
const POSE_ROW = 9;
const POSE_COL = 0;
const ATTACK_MS = 340;
const HURT_MS = 260;
const BOB_PERIOD = 2400;

type Action = { type: "attack" | "hurt"; start: number } | null;

export interface LpcSpriteProps {
  layers: ResolvedLayer[];
  /** +1 lunges right (party), -1 lunges left (enemies). */
  lungeDir: 1 | -1;
  /** Flip horizontally to face right (party units). */
  mirror?: boolean;
  swingNonce: number;
  hurtNonce: number;
  /** Base display scale (size hierarchy). */
  scale?: number;
  /** Knocked out — static, greyed. */
  down?: boolean;
}

function LpcSpriteImpl({
  layers,
  lungeDir,
  mirror = false,
  swingNonce,
  hurtNonce,
  scale = 1,
  down = false,
}: LpcSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<{ img: HTMLImageElement; layer: ResolvedLayer }[]>([]);
  const readyRef = useRef(false);
  const drawnRef = useRef(false);
  const actionRef = useRef<Action>(null);

  const propsRef = useRef({ lungeDir, scale, down, mirror });
  propsRef.current = { lungeDir, scale, down, mirror };

  // Load (and cache) layer images; redraw when the gear/tint changes.
  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    drawnRef.current = false;
    Promise.all(layers.map((layer) => loadImage(layer.url).then((img) => ({ img, layer })))).then(
      (loaded) => {
        if (cancelled) return;
        imagesRef.current = loaded;
        readyRef.current = true;
        drawnRef.current = false; // force a redraw
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [layers]);

  // One-shot actions from event nonces (hurt wins if both fire).
  const seenSwing = useRef(swingNonce);
  const seenHurt = useRef(hurtNonce);
  useEffect(() => {
    if (swingNonce !== seenSwing.current) {
      seenSwing.current = swingNonce;
      if (actionRef.current?.type !== "hurt") actionRef.current = { type: "attack", start: performance.now() };
    }
  }, [swingNonce]);
  useEffect(() => {
    if (hurtNonce !== seenHurt.current) {
      seenHurt.current = hurtNonce;
      actionRef.current = { type: "hurt", start: performance.now() };
    }
  }, [hurtNonce]);

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

    const draw = () => {
      if (!readyRef.current) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, FRAME, FRAME);
      const sx = POSE_COL * FRAME;
      const sy = POSE_ROW * FRAME;
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
      const { lungeDir: dir, scale: s, down: ko, mirror: mir } = propsRef.current;
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
          tx = swing * 26 * dir;
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

      if (!drawnRef.current) {
        draw();
        drawnRef.current = readyRef.current;
      }
      const sx = (mir ? -1 : 1) * s * aScale;
      canvas.style.transform = `translate(${tx}%, ${ty}%) scale(${sx}, ${s * aScale})`;
      canvas.style.filter = filter;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={FRAME} height={FRAME} className={styles.canvas} aria-hidden />;
}

export const LpcSprite = memo(LpcSpriteImpl);
