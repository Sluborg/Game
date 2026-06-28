import { describe, expect, it } from "vitest";
import { createInitialCampaignState, edgesFrom } from "./data";
import { advanceTurn, groupReport, orderAction, orderMove } from "./engine";
import { generateAgentName, pickPortrait, rollSkills } from "./names";
import type { CampaignState } from "./types";

// Helper: order an agent onto an edge by id.
function send(state: CampaignState, agentId: number, edgeId: string) {
  return orderMove(state, agentId, edgeId);
}

describe("initial state", () => {
  it("has the starter map and two Village agents", () => {
    const s = createInitialCampaignState();
    expect(s.turn).toBe(1);
    expect(s.lastReport).toEqual([]);
    expect(s.nodes).toHaveLength(4);
    expect(s.edges).toHaveLength(4);
    expect(s.agents).toHaveLength(2);
    expect(s.agents.every((a) => a.location.kind === "node" && a.location.nodeId === "VILLAGE")).toBe(true);
    expect(s.agents.map((a) => a.name)).toEqual(["JimBob Agentson", "Mathilda Quillfeather"]);
    expect(s.agents.every((a) => a.currentAction === "IDLE")).toBe(true);
  });

  it("spreads danger across the scale so multiple levels are represented", () => {
    const s = createInitialCampaignState();
    const levels = new Set(s.edges.map((e) => e.danger));
    expect(levels.size).toBeGreaterThanOrEqual(3);
    // Safe paths cost 1 turn, unsafe (danger >= 4) cost 2.
    for (const e of s.edges) {
      expect(e.turnCost).toBe(e.danger >= 4 ? 2 : 1);
    }
  });

  it("treats edges as undirected so agents can return home", () => {
    const s = createInitialCampaignState();
    // From RUINS you can reach both FOREST and MINES even though edges are stored
    // VILLAGE/FOREST->RUINS direction.
    const fromRuins = edgesFrom(s, "RUINS").map((e) => e.id).sort();
    expect(fromRuins).toEqual(["FOREST->RUINS", "MINES->RUINS"]);
    const fromVillage = edgesFrom(s, "VILLAGE").map((e) => e.id).sort();
    expect(fromVillage).toEqual(["VILLAGE->FOREST", "VILLAGE->MINES"]);
  });
});

describe("orderMove / orderAction", () => {
  it("places an agent into transit with the edge's turn cost and origin", () => {
    const s = createInitialCampaignState();
    const moved = send(s, 1, "VILLAGE->FOREST");
    const a = moved.agents.find((x) => x.id === 1)!;
    expect(a.location).toEqual({
      kind: "transit",
      edgeId: "VILLAGE->FOREST",
      origin: "VILLAGE",
      destination: "FOREST",
      remainingTurns: 1, // safe edge
    });
  });

  it("uses turnCost 2 for the unsafe edges", () => {
    let s = createInitialCampaignState();
    s = send(s, 1, "VILLAGE->FOREST");
    s = advanceTurn(s).state; // arrives at Forest
    s = send(s, 1, "FOREST->RUINS");
    const a = s.agents.find((x) => x.id === 1)!;
    expect(a.location.kind === "transit" && a.location.remainingTurns).toBe(2);
  });

  it("ignores a move when the agent is not at a node touching the edge", () => {
    const s = createInitialCampaignState();
    // Agent at VILLAGE cannot take FOREST->RUINS.
    const after = send(s, 1, "FOREST->RUINS");
    expect(after).toBe(s);
  });

  it("sets a valid action and rejects disabled / home-only / in-transit ones", () => {
    let s = createInitialCampaignState();
    s = orderAction(s, 1, "QUESTS");
    expect(s.agents.find((a) => a.id === 1)!.currentAction).toBe("QUESTS");

    // FOLLOW is disabled.
    const noFollow = orderAction(s, 1, "FOLLOW");
    expect(noFollow.agents.find((a) => a.id === 1)!.currentAction).toBe("QUESTS");

    // GUILD_HALL is home-only and the agent IS at the Village -> allowed.
    const guild = orderAction(s, 1, "GUILD_HALL");
    expect(guild.agents.find((a) => a.id === 1)!.currentAction).toBe("GUILD_HALL");

    // Move agent 2 to the Forest, then GUILD_HALL must be rejected there.
    let t = createInitialCampaignState();
    t = send(t, 2, "VILLAGE->FOREST");
    t = advanceTurn(t).state;
    const offHome = orderAction(t, 2, "GUILD_HALL");
    expect(offHome.agents.find((a) => a.id === 2)!.currentAction).toBe("IDLE");

    // An in-transit agent cannot be ordered to act.
    let u = createInitialCampaignState();
    u = send(u, 1, "VILLAGE->MINES");
    const inTransit = orderAction(u, 1, "QUESTS");
    expect(inTransit).toBe(u);
  });
});

describe("advanceTurn — travel timing", () => {
  it("arrives after one turn on a safe edge", () => {
    let s = createInitialCampaignState();
    s = send(s, 1, "VILLAGE->FOREST");
    const { state, report } = advanceTurn(s);
    const a = state.agents.find((x) => x.id === 1)!;
    expect(a.location).toEqual({ kind: "node", nodeId: "FOREST" });
    expect(report.some((r) => r.kind === "arrival" && r.agentId === 1)).toBe(true);
  });

  it("takes two turns on an unsafe edge, with a transit line first", () => {
    let s = createInitialCampaignState();
    s = send(s, 1, "VILLAGE->FOREST");
    s = advanceTurn(s).state; // at Forest
    s = send(s, 1, "FOREST->RUINS");

    const first = advanceTurn(s);
    const mid = first.state.agents.find((x) => x.id === 1)!;
    expect(mid.location.kind === "transit" && mid.location.remainingTurns).toBe(1);
    expect(first.report.some((r) => r.kind === "transit" && r.agentId === 1)).toBe(true);

    const second = advanceTurn(first.state);
    const end = second.state.agents.find((x) => x.id === 1)!;
    expect(end.location).toEqual({ kind: "node", nodeId: "RUINS" });
    expect(second.report.some((r) => r.kind === "arrival" && r.agentId === 1)).toBe(true);
  });

  it("increments the turn counter each call", () => {
    const s = createInitialCampaignState();
    expect(advanceTurn(s).state.turn).toBe(2);
    expect(advanceTurn(advanceTurn(s).state).state.turn).toBe(3);
  });
});

describe("advanceTurn — report generation", () => {
  it("reports an action and resets the agent to IDLE", () => {
    let s = createInitialCampaignState();
    s = send(s, 1, "VILLAGE->FOREST");
    s = advanceTurn(s).state; // agent 1 at Forest, agent 2 idle at Village
    s = orderAction(s, 1, "QUESTS");
    const { state, report } = advanceTurn(s);

    const line = report.find((r) => r.agentId === 1)!;
    expect(line.kind).toBe("action");
    expect(line.action).toBe("QUESTS");
    expect(line.text).toContain("looked for Quests");
    expect(line.text).toContain("Forest");
    expect(state.agents.find((a) => a.id === 1)!.currentAction).toBe("IDLE");
  });

  it("emits an idle line for an agent given no order", () => {
    const s = createInitialCampaignState();
    const { report } = advanceTurn(s);
    expect(report.every((r) => r.kind === "idle")).toBe(true);
    expect(report).toHaveLength(2);
  });

  it("stores the report on lastReport", () => {
    const s = createInitialCampaignState();
    const { state, report } = advanceTurn(s);
    expect(state.lastReport).toEqual(report);
  });
});

describe("groupReport", () => {
  function sampleReport() {
    let s = createInitialCampaignState();
    s = orderAction(s, 1, "QUESTS");
    s = orderAction(s, 2, "QUESTS");
    return advanceTurn(s);
  }

  it("collapses same-action entries under one group by default", () => {
    const { state, report } = sampleReport();
    const groups = groupReport(report, "action", state);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("QUESTS");
    expect(groups[0].entries).toHaveLength(2);
  });

  it("keys by node for 'area' and by agent for 'agent'", () => {
    const { state, report } = sampleReport();
    const byArea = groupReport(report, "area", state);
    expect(byArea).toHaveLength(1);
    expect(byArea[0].key).toBe("VILLAGE");

    const byAgent = groupReport(report, "agent", state);
    expect(byAgent).toHaveLength(2);
    expect(byAgent.map((g) => g.label).sort()).toEqual(["JimBob Agentson", "Mathilda Quillfeather"]);
  });
});

describe("name/portrait generation", () => {
  it("is deterministic by seed", () => {
    expect(generateAgentName(0)).toBe(generateAgentName(0));
    expect(pickPortrait(1)).toBe("portrait-01.svg");
    expect(pickPortrait(8)).toBe("portrait-08.svg");
    expect(pickPortrait(9)).toBe("portrait-01.svg");
    const skills = rollSkills(3);
    expect(skills).toHaveLength(3);
    expect(skills.every((sk) => sk.rating >= 1 && sk.rating <= 5)).toBe(true);
    expect(new Set(skills.map((sk) => sk.name)).size).toBe(3); // distinct
  });

  it("rollSkills terminates with 3 distinct skills for every seed (regression)", () => {
    // Seeds congruent to 2 or 7 (mod 10) previously hung the old recurrence.
    for (let seed = 0; seed <= 20; seed++) {
      const skills = rollSkills(seed);
      expect(skills).toHaveLength(3);
      expect(new Set(skills.map((sk) => sk.name)).size).toBe(3);
      expect(skills.every((sk) => sk.rating >= 1 && sk.rating <= 5)).toBe(true);
    }
  });
});
