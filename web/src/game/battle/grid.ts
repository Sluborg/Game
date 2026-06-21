// Arena geometry. The board is a grid of neutral cells laid out horizontally:
// the hero party occupies the left column, enemy stacks the right column. It is
// computed from a spec (rows/cols) + stack count, never hardcoded, so a wider
// party or a bigger board is a one-line change.

export interface GridSpec {
  rows: number;
  cols: number;
}

/** Left column = party, right column = enemies; 3 enemy slots tall. */
export const DEFAULT_GRID: GridSpec = { rows: 3, cols: 2 };

export type CellRole = "monster" | "hero" | "empty";

export interface CellSlot {
  id: string;
  row: number;
  col: number;
  role: CellRole;
  /** For monster cells: which stack (0-based, top to bottom) lands here. */
  stackIndex?: number;
}

/**
 * Hero sits centre-left; `stackCount` enemy stacks fill the right column,
 * vertically centred. Remaining cells are reserved empties (future party).
 */
export function layoutArena(stackCount: number, grid: GridSpec = DEFAULT_GRID): CellSlot[] {
  const heroRow = Math.floor(grid.rows / 2);
  const enemyCol = grid.cols - 1;
  const startRow = Math.floor((grid.rows - stackCount) / 2);
  const cells: CellSlot[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const id = `r${row}c${col}`;
      if (col === 0 && row === heroRow) {
        cells.push({ id, row, col, role: "hero" });
      } else if (col === enemyCol && row >= startRow && row < startRow + stackCount) {
        cells.push({ id, row, col, role: "monster", stackIndex: row - startRow });
      } else {
        cells.push({ id, row, col, role: "empty" });
      }
    }
  }
  return cells;
}

/** Max enemy stacks the board holds (right column height). */
export function maxStacks(grid: GridSpec = DEFAULT_GRID): number {
  return grid.rows;
}
