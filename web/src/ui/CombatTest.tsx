// Standalone Combat Test screen. Self-contained: drives the pure CombatSim
// engine (web/src/game/combatTester.ts) with a requestAnimationFrame loop and
// renders the 2×3 arena, floating damage numbers, a log and the controls.
// Decoupled from the day/economy game — nothing here imports GameState.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CombatSim,
  HERO_PRESETS,
  MONSTER_DEFS,
  arenaLayout,
  attackTimeOf,
  dodgeOf,
  maxHpOf,
  type Floater,
  type HeroPresetId,
  type HeroView,
  type MonsterKindId,
  type SimConfig,
  type SimSnapshot,
  type StackView,
} from "../game/combatTester";

const HERO_IDS = Object.keys(HERO_PRESETS) as HeroPresetId[];
const MONSTER_IDS = Object.keys(MONSTER_DEFS) as MonsterKindId[];

// --- Module-scope, memoized tiles & floaters (so numbers never jitter) ----------

const FloaterView = memo(function FloaterView({ f }: { f: Floater }) {
  const cls =
    f.kind === "crit" ? "ct-float ct-float-crit" : f.kind === "miss" ? "ct-float ct-float-miss" : "ct-float";
  return (
    <span className={cls} style={{ left: `${50 + f.dx}%`, top: `${42 + f.dy}%` }}>
      {f.text}
    </span>
  );
});

function StackedEmoji({ emoji, alive }: { emoji: string; alive: number }) {
  const n = Math.min(alive, 3);
  const spans = [];
  for (let i = 0; i < n; i++) {
    spans.push(
      <span
        key={i}
        className="ct-stack-emoji"
        style={{ transform: `translate(${i * 5 - (n - 1) * 2.5}px, ${i * -4}px)`, zIndex: n - i, opacity: i === 0 ? 1 : 0.85 }}
      >
        {emoji}
      </span>,
    );
  }
  return <span className="ct-stack">{spans}</span>;
}

const MonsterTile = memo(function MonsterTile({
  stack,
  floaters,
}: {
  stack: StackView;
  floaters: Floater[];
}) {
  const cleared = stack.alive === 0;
  const cls = `ct-cell ct-cell-monster${cleared ? " ct-cleared" : ""}${stack.hit ? " ct-hit" : ""}`;
  return (
    <div className={cls}>
      {cleared ? (
        <span className="ct-cleared-mark">☠</span>
      ) : (
        <>
          <div className={`ct-unit ct-unit-monster${stack.lunging ? " ct-lunge-down" : ""}`}>
            <StackedEmoji emoji={stack.emoji} alive={stack.alive} />
            {stack.alive > 1 && <span className="ct-badge">×{stack.alive}</span>}
          </div>
          <div className="ct-hpbar">
            <div className="ct-hpbar-fill ct-hp-enemy" style={{ width: `${stack.frontHpPct * 100}%` }} />
          </div>
        </>
      )}
      {floaters.map((f) => (
        <FloaterView key={f.id} f={f} />
      ))}
    </div>
  );
});

const HeroTile = memo(function HeroTile({ hero, floaters }: { hero: HeroView; floaters: Floater[] }) {
  const down = hero.hp <= 0;
  const cls = `ct-cell ct-cell-hero${down ? " ct-cleared" : ""}${hero.hit ? " ct-hit" : ""}`;
  return (
    <div className={cls}>
      <div className={`ct-unit ct-unit-hero${hero.lunging ? " ct-lunge-up" : ""}`}>
        <span className="ct-stack-emoji">{down ? "💀" : hero.emoji}</span>
      </div>
      <div className="ct-hpbar">
        <div className="ct-hpbar-fill ct-hp-hero" style={{ width: `${hero.hpPct * 100}%` }} />
      </div>
      {floaters.map((f) => (
        <FloaterView key={f.id} f={f} />
      ))}
    </div>
  );
});

const EmptyTile = memo(function EmptyTile() {
  return <div className="ct-cell ct-cell-empty" />;
});

// --- Main screen ----------------------------------------------------------------

interface Props {
  onExit: () => void;
}

export function CombatTest({ onExit }: Props) {
  const [heroPreset, setHeroPreset] = useState<HeroPresetId>("Medium");
  const [monsterKind, setMonsterKind] = useState<MonsterKindId>("Goblin");
  const [stackCount, setStackCount] = useState(2);
  const [stackSize, setStackSize] = useState(2);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<SimSnapshot | null>(null);

  const simRef = useRef<CombatSim | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const lastRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const config = useMemo<SimConfig>(
    () => ({
      heroPreset,
      stacks: Array.from({ length: stackCount }, () => ({ kind: monsterKind, size: stackSize })),
    }),
    [heroPreset, monsterKind, stackCount, stackSize],
  );

  const buildSim = useCallback((): CombatSim => {
    const sim = new CombatSim(config);
    simRef.current = sim;
    setView(sim.snapshot());
    return sim;
  }, [config]);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    lastRef.current = 0;
  }, []);

  const tick = useCallback((t: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const dt = lastRef.current ? Math.min(120, t - lastRef.current) : 16;
    lastRef.current = t;
    sim.update(dt, speedRef.current);
    setView(sim.snapshot());
    if (sim.phase === "running") {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = undefined;
      lastRef.current = 0;
    }
  }, []);

  // Build a fresh (idle) sim for the live preview when config changes — but only
  // while no fight is in progress, so a running fight isn't disturbed.
  useEffect(() => {
    const phase = simRef.current?.phase;
    if (!phase || phase === "idle" || phase === "done") buildSim();
  }, [buildSim]);

  // Tear down the animation loop on unmount.
  useEffect(() => stopRaf, [stopRaf]);

  const phase = view?.phase ?? "idle";
  const configLocked = phase === "running" || phase === "paused";

  const handleStart = useCallback(() => {
    stopRaf();
    let sim = simRef.current;
    if (!sim || sim.phase === "done") sim = buildSim();
    sim.start();
    setView(sim.snapshot());
    rafRef.current = requestAnimationFrame(tick);
  }, [buildSim, stopRaf, tick]);

  const handlePauseResume = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (sim.phase === "running") {
      sim.pause();
      stopRaf();
      setView(sim.snapshot());
    } else if (sim.phase === "paused") {
      sim.resume();
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [stopRaf, tick]);

  const handleReset = useCallback(() => {
    stopRaf();
    buildSim();
  }, [buildSim, stopRaf]);

  // Floaters routed to the cell that owns them.
  const floatersByCell = useMemo(() => {
    const map: Record<string, Floater[]> = {};
    for (const f of view?.floaters ?? []) (map[f.cellId] ??= []).push(f);
    return map;
  }, [view]);

  const cells = useMemo(() => arenaLayout(stackCount), [stackCount]);
  const heroAttrs = HERO_PRESETS[heroPreset].attrs;

  return (
    <div className="ct-wrap">
      <header className="topbar">
        <span className="topbar-title">⚔️ Combat Test</span>
        <button className="btn btn-reset" onClick={onExit} title="Back to menu">
          ☰ Menu
        </button>
      </header>

      <main className="ct-main">
        {/* Arena */}
        <div className="ct-arena">
          <div className="ct-grid">
            {cells.map((cell) => {
              if (cell.role === "hero" && view) {
                return <HeroTile key={cell.id} hero={view.hero} floaters={floatersByCell["hero"] ?? []} />;
              }
              if (cell.role === "monster" && view && cell.stackIndex !== undefined) {
                const stack = view.stacks[cell.stackIndex];
                if (stack) {
                  return (
                    <MonsterTile
                      key={cell.id}
                      stack={stack}
                      floaters={floatersByCell[`m${cell.stackIndex}`] ?? []}
                    />
                  );
                }
              }
              return <EmptyTile key={cell.id} />;
            })}
          </div>

          {view?.result && (
            <div className={`ct-banner ${view.result === "VICTORY" ? "ct-banner-win" : "ct-banner-lose"}`}>
              {view.result}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="ct-controls">
          <div className="ct-actions">
            <button className="btn ct-btn-start" onClick={handleStart} disabled={phase === "running"}>
              {phase === "done" ? "↻ Fight again" : "▶ Start"}
            </button>
            <button className="btn" onClick={handlePauseResume} disabled={phase !== "running" && phase !== "paused"}>
              {phase === "paused" ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="btn btn-reset" onClick={handleReset}>
              ⟳ Reset
            </button>
          </div>

          <label className="ct-field ct-field-speed">
            <span>Speed ×{speed.toFixed(2)}</span>
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </label>

          <div className="ct-field">
            <span>Hero</span>
            <div className="ct-segment">
              {HERO_IDS.map((id) => (
                <button
                  key={id}
                  className={`ct-seg-btn${heroPreset === id ? " ct-seg-on" : ""}`}
                  disabled={configLocked}
                  onClick={() => setHeroPreset(id)}
                >
                  {HERO_PRESETS[id].emoji} {HERO_PRESETS[id].label}
                </button>
              ))}
            </div>
            <span className="ct-hint">
              hp {maxHpOf(heroAttrs)} · dmg {heroAttrs.Str} · dodge {Math.round(dodgeOf(heroAttrs) * 100)}% · swing{" "}
              {attackTimeOf(heroAttrs).toFixed(2)}s ({HERO_PRESETS[heroPreset].weaponName})
            </span>
          </div>

          <div className="ct-field">
            <span>Monster</span>
            <div className="ct-segment">
              {MONSTER_IDS.map((id) => (
                <button
                  key={id}
                  className={`ct-seg-btn${monsterKind === id ? " ct-seg-on" : ""}`}
                  disabled={configLocked}
                  onClick={() => setMonsterKind(id)}
                >
                  {MONSTER_DEFS[id].emoji} {MONSTER_DEFS[id].label}
                </button>
              ))}
            </div>
          </div>

          <div className="ct-field ct-field-row">
            <label className="ct-step">
              <span>Stacks</span>
              <Stepper value={stackCount} min={1} max={3} disabled={configLocked} onChange={setStackCount} />
            </label>
            <label className="ct-step">
              <span>Each ×</span>
              <Stepper value={stackSize} min={1} max={3} disabled={configLocked} onChange={setStackSize} />
            </label>
          </div>
        </div>

        {/* Log */}
        <div className="ct-log">
          <div className="battlelog-title">📜 Combat Log</div>
          {(view?.log ?? []).map((line, i) => (
            <div
              key={`${i}-${line}`}
              className="ct-log-line"
              style={{ color: logLineColor(line), opacity: Math.max(0.35, 1 - i * 0.06) }}
            >
              {line}
            </div>
          ))}
          {(view?.log.length ?? 0) === 0 && <div className="ct-hint">Press Start to begin the fight.</div>}
        </div>
      </main>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <span className="ct-stepper">
      <button className="ct-step-btn" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="ct-step-val">{value}</span>
      <button className="ct-step-btn" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}

function logLineColor(line: string): string {
  if (line.includes("VICTORY")) return "#52C46B";
  if (line.includes("DEFEAT") || line.includes("DEATH")) return "#E05252";
  if (line.includes("CRIT")) return "#FF9D45";
  if (line.includes("KILL")) return "#FFD700";
  if (line.includes("MISS")) return "#87CEEB";
  return "#F4E4BC";
}
