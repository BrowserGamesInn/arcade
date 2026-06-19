import { describe, it, expect } from 'vitest';
import { directionToDelta } from './belt.js';
import type { BeltDirection } from './belt.js';
import { MovementSystem } from './movement.js';
import type { BeltLookup } from './movement.js';

// ── directionToDelta ──────────────────────────────────────────────────────────

describe('directionToDelta', () => {
  it('east yields +col', () => {
    expect(directionToDelta('east')).toEqual({ dcol: 1, drow: 0 });
  });

  it('west yields −col', () => {
    expect(directionToDelta('west')).toEqual({ dcol: -1, drow: 0 });
  });

  it('south yields +row', () => {
    expect(directionToDelta('south')).toEqual({ dcol: 0, drow: 1 });
  });

  it('north yields −row', () => {
    expect(directionToDelta('north')).toEqual({ dcol: 0, drow: -1 });
  });
});

// ── MovementSystem ────────────────────────────────────────────────────────────

function straightBelt(length: number, dir: BeltDirection): BeltLookup {
  // Horizontal east-pointing belt from (0,0) to (length-1, 0)
  const dirs: Record<string, BeltDirection> = {};
  for (let c = 0; c < length; c++) dirs[`${c},0`] = dir;
  return (col, row) => dirs[`${col},${row}`];
}

describe('MovementSystem.tick', () => {
  it('advances progress by speed * dt on a straight belt', () => {
    const getBelt = straightBelt(3, 'east');
    const sys = new MovementSystem({ speed: 2, getBelt });
    sys.add({ col: 0, row: 0, direction: 'east', progress: 0 });
    sys.tick(0.1);
    expect(sys.items[0].progress).toBeCloseTo(0.2);
    expect(sys.items[0].col).toBe(0);
  });

  it('crosses a cell boundary and carries progress remainder', () => {
    const getBelt = straightBelt(3, 'east');
    const sys = new MovementSystem({ speed: 2, getBelt });
    // progress = 0.8; after tick(0.2): would be 1.2 → hop to col=1, progress=0.2
    sys.add({ col: 0, row: 0, direction: 'east', progress: 0.8 });
    sys.tick(0.2);
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].progress).toBeCloseTo(0.2);
  });

  it('picks up the new direction after hopping to a cell pointing a different way', () => {
    // Belt at (0,0) east, belt at (1,0) south — item should turn on hop.
    const getBelt: BeltLookup = (col, row) => {
      if (col === 0 && row === 0) return 'east';
      if (col === 1 && row === 0) return 'south';
      if (col === 1 && row === 1) return 'south';
      return undefined;
    };
    const sys = new MovementSystem({ speed: 2, getBelt });
    sys.add({ col: 0, row: 0, direction: 'east', progress: 0.9 });
    sys.tick(0.1); // progress: 0.9 + 0.2 = 1.1 → hop to (1,0) direction 'south', progress=0.1
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].row).toBe(0);
    expect(sys.items[0].direction).toBe('south');
  });

  it('holds an item at progress 0 when the next cell has no belt', () => {
    // Single belt tile — item cannot advance beyond it.
    const getBelt: BeltLookup = (col, row) => (col === 0 && row === 0 ? 'east' : undefined);
    const sys = new MovementSystem({ speed: 2, getBelt });
    sys.add({ col: 0, row: 0, direction: 'east', progress: 0 });
    sys.tick(0.5);
    sys.tick(0.5);
    // Item must stay on cell (0,0) and not glide into the void repeatedly.
    expect(sys.items[0].col).toBe(0);
    expect(sys.items[0].progress).toBe(0);
  });

  it('stops at the last belt tile when the path runs out mid-hop', () => {
    // Belts at (0,0) and (1,0) east; (2,0) is empty.
    const getBelt = straightBelt(2, 'east');
    const sys = new MovementSystem({ speed: 2, getBelt });
    // Large tick to cross two cells; item should stop at (1,0)
    sys.add({ col: 0, row: 0, direction: 'east', progress: 0 });
    sys.tick(2); // advance = 4 cells worth — far past the path
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].progress).toBe(0);
  });
});
