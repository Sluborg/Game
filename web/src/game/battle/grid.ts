// Arena geometry. The board is a grid of neutral cells; today it is 2×3 but the
// layout is computed from a spec (rows/cols) and a stack count, never hardcoded
// to 6, so a larger board or different placement is a one-line change.

export interface GridSpec {
  rows: number;
  cols: number;
}

export const DEFAULT_GRID: GridSpec = { rows: 2, cols: 3 };

export type CellRole = "monster" | "hero" | "empty";

export interface CellSlot {
  id: string;
  row: number;
  col: number;
  role: CellRole;
  /** For monster cells: which stack (0-based, left to right) lands here. */
  stackIndex?: number;
}

/**
 * Top row holds up to `stackCount` monster stacks (left to right); the hero sits
 * centre of the bottom row; the rest are reserved empties.
 */
export function layoutArena(stackCount: number, grid: GridSpec = DEFAULT_GRID): CellSlot[] {
  const heroCol = Math.floor(grid.cols / 2);
  const cells: CellSlot[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const id = `r${row}c${col}`;
      if (row === 0) {
        cells.push(
          col < stackCount
            ? { id, row, col, role: "monster", stackIndex: col }
            : { id, row, col, role: "empty" },
        );
      } else {
        cells.push({ id, row, col, role: row === grid.rows - 1 && col === heroCol ? "hero" : "empty" });
      }
    }
  }
  return cells;
}

/** Max monster stacks the board can hold (top row width). */
export function maxStacks(grid: GridSpec = DEFAULT_GRID): number {
  return grid.cols;
}
