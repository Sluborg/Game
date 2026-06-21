// useCombatClock — bridges the pure engine to React. A requestAnimationFrame
// loop advances the engine by real (speed-scaled) time, then translates the
// returned events into render state: damage floaters, per-cell attack/hurt
// animation nonces, and log lines. The simulation itself stays in the engine.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CombatEngine,
  HERO_TEMPLATES,
  MONSTER_TEMPLATES,
  type CombatEvent,
  type CombatStateView,
  type FightConfig,
  type FightResult,
} from "../../game/battle";
import type { Floater } from "./DamageFloaters";
import { formatEvent, type LogLine, type NameOf } from "./format";

export type ClockStatus = "idle" | "running" | "paused" | "ended";

export interface CombatClock {
  state: CombatStateView;
  floaters: Floater[];
  swingNonce: Record<string, number>;
  hurtNonce: Record<string, number>;
  log: { id: number; line: LogLine }[];
  status: ClockStatus;
  result: FightResult | null;
  speed: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
  dismissFloater: (id: number) => void;
}

interface ViewModel {
  state: CombatStateView;
  floaters: Floater[];
  swingNonce: Record<string, number>;
  hurtNonce: Record<string, number>;
  log: { id: number; line: LogLine }[];
  status: ClockStatus;
  result: FightResult | null;
}

const MAX_FLOATERS = 36;
const MAX_LOG = 48;
const MAX_DT = 0.1; // seconds; guards against tab-inactivity jumps

function buildNameMap(config: FightConfig): Map<string, string> {
  const names = new Map<string, string>();
  names.set("hero", HERO_TEMPLATES[config.heroTier].name);
  config.stacks.forEach((spec, i) => {
    const name = MONSTER_TEMPLATES[spec.species].name;
    for (let m = 0; m < spec.size; m++) names.set(`m${i}-${m}`, name);
  });
  return names;
}

export function useCombatClock(config: FightConfig): CombatClock {
  const engineRef = useRef<CombatEngine | null>(null);
  const nameOfRef = useRef<NameOf>(() => "");
  const rafRef = useRef<number | undefined>(undefined);
  const lastTsRef = useRef(0);
  const speedRef = useRef(1);
  const seqRef = useRef({ floater: 1, log: 1 });

  const [speed, setSpeedState] = useState(1);
  const [vm, setVm] = useState<ViewModel>(() => {
    const engine = new CombatEngine(config);
    engineRef.current = engine;
    const names = buildNameMap(config);
    nameOfRef.current = (id) => names.get(id) ?? id;
    return {
      state: engine.getState(),
      floaters: [],
      swingNonce: {},
      hurtNonce: {},
      log: [],
      status: "idle",
      result: null,
    };
  });

  const stopLoop = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    lastTsRef.current = 0;
  }, []);

  const ingest = useCallback((events: CombatEvent[], next: CombatStateView): void => {
    setVm((prev) => {
      const swing = { ...prev.swingNonce };
      const hurt = { ...prev.hurtNonce };
      let floaters = prev.floaters;
      let log = prev.log;
      let status = prev.status;
      let result = prev.result;

      for (const e of events) {
        if (e.kind === "swing") {
          swing[e.sourceCellId] = (swing[e.sourceCellId] ?? 0) + 1;
        } else if (e.kind === "hit") {
          hurt[e.targetCellId] = (hurt[e.targetCellId] ?? 0) + 1;
          floaters = floaters.concat({
            id: seqRef.current.floater++,
            cellId: e.targetCellId,
            kind: e.crit ? "crit" : "normal",
            text: e.crit ? `${e.amount}!` : `${e.amount}`,
            dx: (Math.random() - 0.5) * 46,
            dy: (Math.random() - 0.5) * 26,
          });
        } else if (e.kind === "miss") {
          floaters = floaters.concat({
            id: seqRef.current.floater++,
            cellId: e.targetCellId,
            kind: "miss",
            text: "MISS",
            dx: (Math.random() - 0.5) * 46,
            dy: (Math.random() - 0.5) * 26,
          });
        } else if (e.kind === "end") {
          status = "ended";
          result = e.result;
        }
        const line = formatEvent(e, nameOfRef.current);
        if (line) log = log.concat({ id: seqRef.current.log++, line });
      }

      if (floaters.length > MAX_FLOATERS) floaters = floaters.slice(-MAX_FLOATERS);
      if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);

      return { state: next, floaters, swingNonce: swing, hurtNonce: hurt, log, status, result };
    });
  }, []);

  const frame = useCallback(
    (ts: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const last = lastTsRef.current || ts;
      const dt = Math.min(MAX_DT, ((ts - last) / 1000) * speedRef.current);
      lastTsRef.current = ts;

      const events = engine.advance(dt);
      ingest(events, engine.getState());

      if (engine.isOver) {
        rafRef.current = undefined;
        lastTsRef.current = 0;
      } else {
        rafRef.current = requestAnimationFrame(frame);
      }
    },
    [ingest],
  );

  const build = useCallback((): CombatEngine => {
    stopLoop();
    const engine = new CombatEngine(config);
    engineRef.current = engine;
    const names = buildNameMap(config);
    nameOfRef.current = (id) => names.get(id) ?? id;
    setVm({
      state: engine.getState(),
      floaters: [],
      swingNonce: {},
      hurtNonce: {},
      log: [],
      status: "idle",
      result: null,
    });
    return engine;
  }, [config, stopLoop]);

  // Rebuild a fresh (idle) preview whenever the config changes — but never while
  // a fight is in flight.
  useEffect(() => {
    setVm((prev) => {
      if (prev.status === "running" || prev.status === "paused") return prev;
      const engine = new CombatEngine(config);
      engineRef.current = engine;
      const names = buildNameMap(config);
      nameOfRef.current = (id) => names.get(id) ?? id;
      return {
        state: engine.getState(),
        floaters: [],
        swingNonce: {},
        hurtNonce: {},
        log: [],
        status: "idle",
        result: null,
      };
    });
  }, [config]);

  useEffect(() => stopLoop, [stopLoop]);

  const start = useCallback(() => {
    // Always begin a fresh fight. This backs "Start" (idle), "Restart" (paused)
    // and "Fight again" (ended); continuing a paused fight is resume(). build()
    // stops any running loop and installs a new engine in idle state.
    build();
    setVm((prev) => ({ ...prev, status: "running" }));
    rafRef.current = requestAnimationFrame(frame);
  }, [build, frame]);

  const pause = useCallback(() => {
    stopLoop();
    setVm((prev) => (prev.status === "running" ? { ...prev, status: "paused" } : prev));
  }, [stopLoop]);

  const resume = useCallback(() => {
    setVm((prev) => {
      if (prev.status !== "paused") return prev;
      lastTsRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
      return { ...prev, status: "running" };
    });
  }, [frame]);

  const reset = useCallback(() => {
    build();
  }, [build]);

  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeedState(s);
  }, []);

  const dismissFloater = useCallback((id: number) => {
    setVm((prev) => ({ ...prev, floaters: prev.floaters.filter((f) => f.id !== id) }));
  }, []);

  return useMemo(
    () => ({
      state: vm.state,
      floaters: vm.floaters,
      swingNonce: vm.swingNonce,
      hurtNonce: vm.hurtNonce,
      log: vm.log,
      status: vm.status,
      result: vm.result,
      speed,
      start,
      pause,
      resume,
      reset,
      setSpeed,
      dismissFloater,
    }),
    [vm, speed, start, pause, resume, reset, setSpeed, dismissFloater],
  );
}
