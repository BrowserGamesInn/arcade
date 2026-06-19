/**
 * Grid coordinate utilities — pure functions, no Three.js dependency.
 *
 * The game grid is laid out on the XZ plane (Y is up). Each cell is a
 * square of side `cellSize` world units. Cell (0, 0) maps to the world
 * origin; column indices increase along +X and row indices along +Z.
 *
 * These helpers are the single source of truth for converting between
 * grid space and world space throughout the engine and game packages.
 */

export interface GridCoord {
  col: number;
  row: number;
}

export interface WorldPos {
  x: number;
  z: number;
}

/**
 * Convert a grid cell address to the world-space centre of that cell.
 *
 * @param col  - Grid column (integer, 0-based)
 * @param row  - Grid row (integer, 0-based)
 * @param cellSize - Side length of each grid cell in world units (> 0)
 * @returns World-space position of the cell centre (XZ plane, Y = 0)
 */
export function cellToWorld(col: number, row: number, cellSize: number): WorldPos {
  return {
    x: col * cellSize + cellSize / 2,
    z: row * cellSize + cellSize / 2,
  };
}

/**
 * Convert a world-space position to the grid cell that contains it.
 *
 * Positions outside the positive quadrant yield negative indices —
 * callers that need bounds checking should validate the result.
 *
 * @param x        - World X coordinate
 * @param z        - World Z coordinate
 * @param cellSize - Side length of each grid cell in world units (> 0)
 * @returns Grid cell address (floored integer col/row)
 */
export function worldToCell(x: number, z: number, cellSize: number): GridCoord {
  return {
    col: Math.floor(x / cellSize),
    row: Math.floor(z / cellSize),
  };
}
