import { directionToDelta } from './belt.js';
import type { BeltDirection } from './belt.js';

export interface Item {
  col: number;
  row: number;
  direction: BeltDirection;
  /** Fractional progress toward the next cell centre, in [0, 1). */
  progress: number;
}

/** Returns the belt direction at a given cell, or undefined if no belt exists there. */
export type BeltLookup = (col: number, row: number) => BeltDirection | undefined;

export interface MovementOptions {
  /** Movement speed in cells per second. */
  speed: number;
  getBelt: BeltLookup;
}

export class MovementSystem {
  readonly items: Item[] = [];
  private readonly speed: number;
  private readonly getBelt: BeltLookup;

  constructor(opts: MovementOptions) {
    this.speed = opts.speed;
    this.getBelt = opts.getBelt;
  }

  add(item: Item): void {
    this.items.push(item);
  }

  tick(dt: number): void {
    const advance = this.speed * dt;
    for (const item of this.items) {
      const { dcol, drow } = directionToDelta(item.direction);
      // If there's no belt in the exit direction, hold the item at the current cell centre.
      if (this.getBelt(item.col + dcol, item.row + drow) === undefined) {
        item.progress = 0;
        continue;
      }
      item.progress += advance;
      // Roll over whole-cell hops; re-query direction after each hop so mid-transit belt
      // rotations are picked up on arrival at the next cell.
      while (item.progress >= 1) {
        const { dcol: dc, drow: dr } = directionToDelta(item.direction);
        const nextCol = item.col + dc;
        const nextRow = item.row + dr;
        const nextDir = this.getBelt(nextCol, nextRow);
        if (nextDir === undefined) {
          item.progress = 0;
          break;
        }
        item.col = nextCol;
        item.row = nextRow;
        item.direction = nextDir;
        item.progress -= 1;
      }
    }
  }
}
