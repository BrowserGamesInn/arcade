import { describe, it, expect } from 'vitest';
import { directionToDelta } from './belt.js';
import type { BeltDirection } from './belt.js';
import { MovementSystem } from './movement.js';
import type { BeltLookup, Item } from './movement.js';

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

// ── helpers ───────────────────────────────────────────────────────────────────

function straightBelt(length: number, dir: BeltDirection): BeltLookup {
  const dirs: Record<string, BeltDirection> = {};
  for (let c = 0; c < length; c++) dirs[`${c},0`] = dir;
  return (col, row) => dirs[`${col},${row}`];
}

function item(col: number, row: number, direction: BeltDirection, progress = 0): Item {
  return { col, row, direction, progress, color: 'a' };
}

// ── MovementSystem.tick ───────────────────────────────────────────────────────

describe('MovementSystem.tick', () => {
  it('advances progress by speed * dt on a straight belt', () => {
    const sys = new MovementSystem({ speed: 2, getBelt: straightBelt(3, 'east') });
    sys.add(item(0, 0, 'east'));
    sys.tick(0.1);
    expect(sys.items[0].progress).toBeCloseTo(0.2);
    expect(sys.items[0].col).toBe(0);
  });

  it('crosses a cell boundary and carries progress remainder', () => {
    const sys = new MovementSystem({ speed: 2, getBelt: straightBelt(3, 'east') });
    sys.add(item(0, 0, 'east', 0.8));
    sys.tick(0.2); // 0.8 + 0.4 = 1.2 → hop to col=1, progress=0.2
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].progress).toBeCloseTo(0.2);
  });

  it('picks up the new direction after hopping to a cell pointing a different way', () => {
    const getBelt: BeltLookup = (col, row) => {
      if (col === 0 && row === 0) return 'east';
      if (col === 1 && row === 0) return 'south';
      if (col === 1 && row === 1) return 'south';
      return undefined;
    };
    const sys = new MovementSystem({ speed: 2, getBelt });
    sys.add(item(0, 0, 'east', 0.9));
    sys.tick(0.1); // 0.9 + 0.2 = 1.1 → hop to (1,0), direction 'south', progress=0.1
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].row).toBe(0);
    expect(sys.items[0].direction).toBe('south');
  });

  it('holds an item at progress 0 when the next cell has no belt', () => {
    const getBelt: BeltLookup = (col, row) => (col === 0 && row === 0 ? 'east' : undefined);
    const sys = new MovementSystem({ speed: 2, getBelt });
    sys.add(item(0, 0, 'east'));
    sys.tick(0.5);
    sys.tick(0.5);
    expect(sys.items[0].col).toBe(0);
    expect(sys.items[0].progress).toBe(0);
  });

  it('stops at the last belt tile when the path runs out mid-hop', () => {
    const sys = new MovementSystem({ speed: 2, getBelt: straightBelt(2, 'east') });
    sys.add(item(0, 0, 'east'));
    sys.tick(2); // advance = 4 cells — far past the path
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].progress).toBe(0);
  });
});

// ── machine transform ─────────────────────────────────────────────────────────

describe('MovementSystem machine transform', () => {
  it('transforms item colour when it hops into a machine cell', () => {
    const getBelt: BeltLookup = (col, _row) => {
      if (col === 0 || col === 1 || col === 2) return 'east';
      return undefined;
    };
    const getMachine = (col: number, row: number) =>
      col === 1 && row === 0 ? { input: 'a' as const, output: 'b' as const } : undefined;

    const sys = new MovementSystem({ speed: 2, getBelt, getMachine });
    sys.add(item(0, 0, 'east', 0.9));
    sys.tick(0.1); // hops to (1,0) which is a machine
    expect(sys.items[0].col).toBe(1);
    expect(sys.items[0].color).toBe('b');
  });

  it('does not transform when item colour does not match machine input', () => {
    const getBelt: BeltLookup = (col) => col <= 2 ? 'east' : undefined;
    const getMachine = (col: number, row: number) =>
      col === 1 && row === 0 ? { input: 'b' as const, output: 'a' as const } : undefined;

    const sys = new MovementSystem({ speed: 2, getBelt, getMachine });
    sys.add(item(0, 0, 'east', 0.9)); // colour 'a'
    sys.tick(0.1); // hops to (1,0) — machine wants 'b' input, no transform
    expect(sys.items[0].color).toBe('a');
  });
});

// ── sink consumption ──────────────────────────────────────────────────────────

describe('MovementSystem sink consumption', () => {
  it('removes item from items array when it reaches a sink', () => {
    const getBelt: BeltLookup = (col) => col === 0 ? 'east' : undefined;
    const getSink = (col: number, row: number) =>
      col === 1 && row === 0 ? { requiredColor: 'a' as const, required: 3 } : undefined;

    const sys = new MovementSystem({ speed: 2, getBelt, getSink });
    sys.add(item(0, 0, 'east', 0.9));
    sys.tick(0.1); // hops to sink at (1,0) → consumed
    expect(sys.items).toHaveLength(0);
  });

  it('fires onItemConsumed callback with the sink coordinates', () => {
    const getBelt: BeltLookup = (col) => col === 0 ? 'east' : undefined;
    const getSink = (col: number, row: number) =>
      col === 1 && row === 0 ? { requiredColor: 'a' as const, required: 3 } : undefined;

    let firedCol = -1, firedRow = -1;
    const sys = new MovementSystem({
      speed: 2, getBelt, getSink,
      onItemConsumed: (_item, sc, sr) => { firedCol = sc; firedRow = sr; },
    });
    sys.add(item(0, 0, 'east', 0.9));
    sys.tick(0.1);
    expect(firedCol).toBe(1);
    expect(firedRow).toBe(0);
  });

  it('allows item to glide toward a sink (pre-check passes)', () => {
    const getBelt: BeltLookup = (col) => col === 0 ? 'east' : undefined;
    const getSink = (col: number, row: number) =>
      col === 1 && row === 0 ? { requiredColor: 'a' as const, required: 3 } : undefined;

    const sys = new MovementSystem({ speed: 1, getBelt, getSink });
    sys.add(item(0, 0, 'east', 0)); // progress=0, next cell is sink
    sys.tick(0.4); // progress becomes 0.4 — item is still alive, gliding toward sink
    expect(sys.items).toHaveLength(1);
    expect(sys.items[0].progress).toBeCloseTo(0.4);
  });

  it('clear() removes all items', () => {
    const sys = new MovementSystem({ speed: 1, getBelt: straightBelt(5, 'east') });
    sys.add(item(0, 0, 'east'));
    sys.add(item(1, 0, 'east'));
    sys.clear();
    expect(sys.items).toHaveLength(0);
  });
});

// ── isWon ─────────────────────────────────────────────────────────────────────

import { isWon } from './machine.js';
import type { SinkState } from './machine.js';

function sink(consumed: number, required: number): SinkState {
  return { col: 0, row: 0, requiredColor: 'a', required, consumed };
}

describe('isWon', () => {
  it('returns false for an empty sink list', () => {
    expect(isWon([])).toBe(false);
  });

  it('returns false when any sink is not yet satisfied', () => {
    expect(isWon([sink(2, 3)])).toBe(false);
    expect(isWon([sink(3, 3), sink(1, 3)])).toBe(false);
  });

  it('returns true when all sinks are satisfied', () => {
    expect(isWon([sink(3, 3)])).toBe(true);
    expect(isWon([sink(5, 3), sink(4, 4)])).toBe(true);
  });
});
