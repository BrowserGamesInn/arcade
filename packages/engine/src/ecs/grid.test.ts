import { describe, it, expect } from 'vitest';
import { cellToWorld, worldToCell } from './grid.js';

// Cell size used throughout tests — picked to keep numbers readable
const CELL = 1;
const CELL2 = 2;

describe('cellToWorld', () => {
  it('maps cell (0,0) to the centre of the first cell', () => {
    const pos = cellToWorld(0, 0, CELL);
    expect(pos.x).toBe(0.5);
    expect(pos.z).toBe(0.5);
  });

  it('maps cell (1,0) correctly', () => {
    const pos = cellToWorld(1, 0, CELL);
    expect(pos.x).toBe(1.5);
    expect(pos.z).toBe(0.5);
  });

  it('maps cell (0,1) correctly', () => {
    const pos = cellToWorld(0, 1, CELL);
    expect(pos.x).toBe(0.5);
    expect(pos.z).toBe(1.5);
  });

  it('scales correctly with cellSize = 2', () => {
    const pos = cellToWorld(1, 1, CELL2);
    expect(pos.x).toBe(3); // 1*2 + 2/2
    expect(pos.z).toBe(3);
  });

  it('handles large col/row values', () => {
    const pos = cellToWorld(99, 49, CELL);
    expect(pos.x).toBe(99.5);
    expect(pos.z).toBe(49.5);
  });
});

describe('worldToCell', () => {
  it('maps the centre of cell (0,0) back to (0,0)', () => {
    const coord = worldToCell(0.5, 0.5, CELL);
    expect(coord.col).toBe(0);
    expect(coord.row).toBe(0);
  });

  it('maps the centre of cell (1,0) back to (1,0)', () => {
    const coord = worldToCell(1.5, 0.5, CELL);
    expect(coord.col).toBe(1);
    expect(coord.row).toBe(0);
  });

  it('maps a point at the left edge of cell (1,0)', () => {
    // x=1.0 is exactly the boundary; floor(1.0/1) = 1 → still cell 1
    const coord = worldToCell(1.0, 0.5, CELL);
    expect(coord.col).toBe(1);
    expect(coord.row).toBe(0);
  });

  it('maps a point just before the right edge back to same cell', () => {
    const coord = worldToCell(0.999, 0.999, CELL);
    expect(coord.col).toBe(0);
    expect(coord.row).toBe(0);
  });

  it('scales correctly with cellSize = 2', () => {
    const coord = worldToCell(3, 3, CELL2); // centre of cell (1,1) with cellSize=2
    expect(coord.col).toBe(1);
    expect(coord.row).toBe(1);
  });
});

describe('cellToWorld ↔ worldToCell round-trip', () => {
  it('round-trips (col,row) through world space back to the same cell', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [0, 1],
      [5, 3],
      [10, 10],
    ];
    for (const [col, row] of cases) {
      const world = cellToWorld(col, row, CELL);
      const back = worldToCell(world.x, world.z, CELL);
      expect(back.col).toBe(col);
      expect(back.row).toBe(row);
    }
  });

  it('round-trips with cellSize = 2', () => {
    const cases: Array<[number, number]> = [[0, 0], [1, 1], [3, 7]];
    for (const [col, row] of cases) {
      const world = cellToWorld(col, row, CELL2);
      const back = worldToCell(world.x, world.z, CELL2);
      expect(back.col).toBe(col);
      expect(back.row).toBe(row);
    }
  });
});
