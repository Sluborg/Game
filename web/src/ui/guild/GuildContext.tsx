// GuildContext — the single owner of the live GuildState for the Board + Report
// screens. It holds the run in React state, drives every change through the PURE
// sim reducers (web/src/game/guild), and autosaves to localStorage after each
// change. freshSeed() (wall-clock entropy) is read ONLY here, at the UI boundary —
// never inside a reducer — so the sim stays deterministic/replayable.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadState,
  saveState,
  clearSave,
  freshSeed,
  createInitialState,
  reviseCut,
  endDay,
  markMailRead,
  type GuildState,
} from "../../game/guild";

interface GuildApi {
  state: GuildState;
  /** Revise a posting's cut (once/day; the reducer enforces it). */
  revise: (postingId: string, cutPct: number) => void;
  /** Run the end-day tick. */
  end: () => void;
  /** Mark a mail envelope read. */
  readMail: (mailId: string) => void;
  /** Wipe the save and start a fresh run. */
  reset: () => void;
  /** Count of unread envelopes (drives the Report tab badge). */
  unread: number;
}

const Ctx = createContext<GuildApi | null>(null);

export function GuildProvider({ children }: { children: ReactNode }) {
  // Lazy init: load an existing run or start fresh. One localStorage read.
  const [state, setState] = useState<GuildState>(() => loadState(freshSeed()));

  // Persistence is a side effect of state, NOT part of the reducer/updater (which
  // must stay pure — dev StrictMode double-invokes updaters). Autosave whenever the
  // run changes.
  useEffect(() => {
    saveState(state);
  }, [state]);

  // All mutations go through the pure reducers via functional updates (no stale
  // closures). The effect above persists the result.
  const commit = useCallback((fn: (s: GuildState) => GuildState) => setState((prev) => fn(prev)), []);

  const revise = useCallback((postingId: string, cutPct: number) => commit((s) => reviseCut(s, postingId, cutPct)), [commit]);
  const end = useCallback(() => commit((s) => endDay(s)), [commit]);
  const readMail = useCallback((mailId: string) => commit((s) => markMailRead(s, mailId)), [commit]);
  const reset = useCallback(() => {
    clearSave();
    setState(createInitialState(freshSeed()));
  }, []);

  const unread = useMemo(() => state.mail.filter((m) => !m.read).length, [state.mail]);

  const api = useMemo<GuildApi>(() => ({ state, revise, end, readMail, reset, unread }), [state, revise, end, readMail, reset, unread]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGuild(): GuildApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useGuild must be used within a GuildProvider");
  return api;
}
