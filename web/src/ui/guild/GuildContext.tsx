// GuildContext — the single owner of the live GuildState for the Hall + Report
// screens. It holds the run in React state, drives every change through the PURE
// sim reducers (web/src/game/guild), and autosaves to localStorage after each
// change. freshSeed() (wall-clock entropy) is read ONLY here, at the UI boundary —
// never inside a reducer — so the sim stays deterministic/replayable.
//
// The driver is PLAY-primary (Stefan): a UI interval steps single events; the
// pacing is presentation, the sim never touches the wall clock. Play latches
// through decision-pauses and auto-resumes when they're answered; tab-hide
// hard-disarms it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadState,
  saveState,
  clearSave,
  freshSeed,
  createInitialState,
  step,
  markMailRead,
  buyTavern,
  dismissTavern,
  displayedGold,
  type GuildState,
} from "../../game/guild";

interface GuildApi {
  state: GuildState;
  /** The treasury the UI shows — real gold minus unopened sealed credits (B1). */
  shownGold: number;
  /** Play mode: process exactly one sim event (called on a UI interval). The
   * single-event Advance retired from the UI; the sim keeps advanceUntilStop
   * for tests. */
  stepOnce: () => void;
  /** Open a sealed outcome / mark any mail read (settles shownGold). */
  readMail: (mailId: string) => void;
  /** The slice's one fixed-price investment. */
  build: () => void;
  /** "Not yet" on the tavern proposal (the invest card stays). */
  dismissProposal: () => void;
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

  const stepOnce = useCallback(() => commit((s) => step(s)), [commit]);
  const readMail = useCallback((mailId: string) => commit((s) => markMailRead(s, mailId)), [commit]);
  const build = useCallback(() => commit((s) => buyTavern(s)), [commit]);
  const dismissProposal = useCallback(() => commit((s) => dismissTavern(s)), [commit]);
  const reset = useCallback(() => {
    clearSave();
    setState(createInitialState(freshSeed()));
  }, []);

  // The badge means "unwatched stories" — nightly ledgers don't nag (a Hall-only
  // player who watches every story would otherwise accrue +1/day forever).
  const unread = useMemo(() => state.mail.filter((m) => m.kind === "outcome" && !m.read).length, [state.mail]);
  const shownGold = useMemo(() => displayedGold(state), [state]);

  const api = useMemo<GuildApi>(
    () => ({ state, shownGold, stepOnce, readMail, build, dismissProposal, reset, unread }),
    [state, shownGold, stepOnce, readMail, build, dismissProposal, reset, unread],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGuild(): GuildApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useGuild must be used within a GuildProvider");
  return api;
}
