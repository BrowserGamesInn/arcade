import type { BeltDirection, ItemColor } from '@arcade/engine';

export interface LevelBelt {
  col: number;
  row: number;
  direction: BeltDirection;
}

export interface LevelMachine {
  col: number;
  row: number;
  input: ItemColor;
  output: ItemColor;
}

export interface LevelSink {
  col: number;
  row: number;
  requiredColor: ItemColor;
  required: number;
}

export interface Level {
  title: string;
  grid: { cols: number; rows: number; cellSize: number };
  source: { col: number; row: number };
  /** Pre-placed, immovable belts that are part of the puzzle layout. */
  belts: readonly LevelBelt[];
  machines: readonly LevelMachine[];
  sinks: readonly LevelSink[];
}

export const LEVELS: readonly Level[] = [
  // ── Level 1: Straight orange delivery ────────────────────────────────────
  {
    title: 'First Delivery',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 4 },
    belts: [{ col: 0, row: 4, direction: 'east' }],
    machines: [],
    sinks: [{ col: 8, row: 4, requiredColor: 'a', required: 2 }],
  },

  // ── Level 2: Introduce the machine ───────────────────────────────────────
  {
    title: 'Processing',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 4, row: 0, direction: 'east' },
    ],
    machines: [{ col: 4, row: 0, input: 'a', output: 'b' }],
    sinks: [{ col: 8, row: 0, requiredColor: 'b', required: 2 }],
  },

  // ── Level 3: Turn corner ──────────────────────────────────────────────────
  {
    title: 'Corner Turn',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 5, row: 0, direction: 'south' },
    ],
    machines: [{ col: 5, row: 0, input: 'a', output: 'b' }],
    sinks: [{ col: 5, row: 7, requiredColor: 'b', required: 2 }],
  },

  // ── Level 4: Snake (east → south → west) ─────────────────────────────────
  {
    title: 'Snake',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 8, row: 0, direction: 'south' },
      { col: 8, row: 4, direction: 'west' },
    ],
    machines: [{ col: 8, row: 0, input: 'a', output: 'b' }],
    sinks: [{ col: 0, row: 4, requiredColor: 'b', required: 3 }],
  },

  // ── Level 5: Double turn through machine ──────────────────────────────────
  {
    title: 'Double Turn',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 4, row: 0, direction: 'south' },
      { col: 4, row: 4, direction: 'east' },
    ],
    machines: [{ col: 4, row: 4, input: 'a', output: 'b' }],
    sinks: [{ col: 9, row: 4, requiredColor: 'b', required: 3 }],
  },

  // ── Level 6: Two machines (a→b→a = orange again) ─────────────────────────
  {
    title: 'Double Process',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 3, row: 0, direction: 'east' },
      { col: 6, row: 0, direction: 'east' },
    ],
    machines: [
      { col: 3, row: 0, input: 'a', output: 'b' },
      { col: 6, row: 0, input: 'b', output: 'a' },
    ],
    sinks: [{ col: 9, row: 0, requiredColor: 'a', required: 3 }],
  },

  // ── Level 7: L + second machine via detour ────────────────────────────────
  {
    title: 'Detour',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 5, row: 0, direction: 'south' },
      { col: 5, row: 5, direction: 'east' },
    ],
    machines: [
      { col: 5, row: 5, input: 'a', output: 'b' },
    ],
    sinks: [{ col: 9, row: 5, requiredColor: 'b', required: 4 }],
  },

  // ── Level 8: Z-path with two machines ────────────────────────────────────
  {
    title: 'Z-Path',
    grid: { cols: 10, rows: 10, cellSize: 1 },
    source: { col: 0, row: 0 },
    belts: [
      { col: 0, row: 0, direction: 'east' },
      { col: 3, row: 0, direction: 'south' },
      { col: 3, row: 5, direction: 'east' },
      { col: 7, row: 5, direction: 'south' },
    ],
    machines: [
      { col: 3, row: 0, input: 'a', output: 'b' },
      { col: 7, row: 5, input: 'b', output: 'a' },
    ],
    sinks: [{ col: 7, row: 9, requiredColor: 'a', required: 5 }],
  },
];
