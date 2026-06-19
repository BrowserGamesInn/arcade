import { directionToDelta } from './belt.js';
import type { BeltDirection } from './belt.js';
import type { ItemColor, MachineLookup, SinkLookup } from './machine.js';

export interface Item {
  col: number;
  row: number;
  direction: BeltDirection;
  /** Fractional progress toward the next cell centre, in [0, 1). */
  progress: number;
  color: ItemColor;
}

/** Returns the belt direction at a given cell, or undefined if no belt exists there. */
export type BeltLookup = (col: number, row: number) => BeltDirection | undefined;

export interface MovementOptions {
  /** Movement speed in cells per second. */
  speed: number;
  getBelt: BeltLookup;
  /** Optional machine lookup — when an item hops into a machine cell whose input colour
   *  matches, the item's colour is changed to the machine's output colour. */
  getMachine?: MachineLookup;
  /** Optional sink lookup — items that hop into a sink cell are consumed. */
  getSink?: SinkLookup;
  /** Fired just before a consumed item is removed from the items array. */
  onItemConsumed?: (item: Item, sinkCol: number, sinkRow: number) => void;
}

export class MovementSystem {
  readonly items: Item[] = [];
  private readonly speed: number;
  private readonly getBelt: BeltLookup;
  private readonly getMachine?: MachineLookup;
  private readonly getSink?: SinkLookup;
  private readonly onItemConsumed?: (item: Item, sinkCol: number, sinkRow: number) => void;

  constructor(opts: MovementOptions) {
    this.speed = opts.speed;
    this.getBelt = opts.getBelt;
    this.getMachine = opts.getMachine;
    this.getSink = opts.getSink;
    this.onItemConsumed = opts.onItemConsumed;
  }

  add(item: Item): void {
    this.items.push(item);
  }

  /** Remove all items (e.g. on Reset). */
  clear(): void {
    this.items.length = 0;
  }

  tick(dt: number): void {
    const advance = this.speed * dt;
    const consumed: number[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const { dcol, drow } = directionToDelta(item.direction);
      const nx0 = item.col + dcol;
      const ny0 = item.row + drow;

      // Pre-check: freeze if next cell has neither a belt nor a sink.
      if (this.getBelt(nx0, ny0) === undefined && this.getSink?.(nx0, ny0) === undefined) {
        item.progress = 0;
        continue;
      }

      item.progress += advance;

      let shouldConsume = false;
      while (item.progress >= 1) {
        const { dcol: dc, drow: dr } = directionToDelta(item.direction);
        const nextCol = item.col + dc;
        const nextRow = item.row + dr;
        const sink = this.getSink?.(nextCol, nextRow);

        if (sink !== undefined) {
          // Item arrives at a sink — notify and mark for removal.
          item.col = nextCol;
          item.row = nextRow;
          item.progress = 0;
          this.onItemConsumed?.(item, nextCol, nextRow);
          shouldConsume = true;
          break;
        }

        const nextDir = this.getBelt(nextCol, nextRow);
        if (nextDir === undefined) {
          item.progress = 0;
          break;
        }

        item.col = nextCol;
        item.row = nextRow;
        item.direction = nextDir;
        item.progress -= 1;

        // Machine transform: re-colour the item on arrival at a machine cell.
        const machine = this.getMachine?.(nextCol, nextRow);
        if (machine !== undefined && item.color === machine.input) {
          item.color = machine.output;
        }
      }

      if (shouldConsume) consumed.push(i);
    }

    // Remove consumed items in reverse index order to preserve earlier indices.
    for (let i = consumed.length - 1; i >= 0; i--) {
      this.items.splice(consumed[i], 1);
    }
  }
}
