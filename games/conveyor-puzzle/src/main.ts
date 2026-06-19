import {
  Renderer,
  GameLoop,
  createGridFloor,
  setIsometricView,
  Highlighter,
  createPointerSystem,
  cellInBounds,
  createBeltTile,
  rotateCW,
  MovementSystem,
  ItemRenderer,
} from '@arcade/engine';
import type { BeltTile } from '@arcade/engine';

// ── Board constants ───────────────────────────────────────────────────────────
const GRID = { cols: 10, rows: 10, cellSize: 1 } as const;
const SOURCE = { col: 0, row: 0 } as const;
const SPAWN_INTERVAL = 1.2; // seconds between item spawns
const ITEM_SPEED = 1.5;     // cells per second
const MAX_ITEMS = 256;

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas, width: window.innerWidth, height: window.innerHeight });

window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight);
});

// ── Scene setup ───────────────────────────────────────────────────────────────
setIsometricView(renderer, GRID);
createGridFloor(renderer, GRID);

// ── Belt state ────────────────────────────────────────────────────────────────
const belts = new Map<string, BeltTile>();

function placeBelt(col: number, row: number, direction: BeltTile['direction']): void {
  const key = `${col},${row}`;
  if (belts.has(key)) return;
  const tile = createBeltTile(renderer, { col, row, direction, cellSize: GRID.cellSize });
  belts.set(key, tile);
}

// Auto-place starting belt at the source so items move immediately on load.
placeBelt(SOURCE.col, SOURCE.row, 'east');

// ── Movement + rendering ──────────────────────────────────────────────────────
const movement = new MovementSystem({
  speed: ITEM_SPEED,
  getBelt: (col, row) => belts.get(`${col},${row}`)?.direction,
});

const itemRenderer = new ItemRenderer(renderer, { maxItems: MAX_ITEMS, cellSize: GRID.cellSize });

// ── Interaction ───────────────────────────────────────────────────────────────
const highlighter = new Highlighter(renderer, { cellSize: GRID.cellSize });
const pointer = createPointerSystem(renderer, { cellSize: GRID.cellSize });

pointer.onGridHover((c) => {
  if (cellInBounds(c, GRID)) {
    highlighter.moveTo(c);
  } else {
    highlighter.hide();
  }
});

pointer.onGridClick((c) => {
  if (!cellInBounds(c, GRID)) return;
  placeBelt(c.col, c.row, 'east');
});

pointer.onGridRotate((c) => {
  const key = `${c.col},${c.row}`;
  const belt = belts.get(key);
  if (belt) belt.setDirection(rotateCW(belt.direction));
});

// ── Game loop ─────────────────────────────────────────────────────────────────
let spawnAccum = 0;

const loop = new GameLoop((dt) => {
  // Spawn items at the source on a timer.
  spawnAccum += dt;
  while (spawnAccum >= SPAWN_INTERVAL && movement.items.length < MAX_ITEMS) {
    const sourceBelt = belts.get(`${SOURCE.col},${SOURCE.row}`);
    if (sourceBelt) {
      movement.add({ col: SOURCE.col, row: SOURCE.row, direction: sourceBelt.direction, progress: 0, color: 'a' });
    }
    spawnAccum -= SPAWN_INTERVAL;
  }

  movement.tick(dt);
  itemRenderer.sync(movement.items);
  renderer.render();
});
loop.start();
