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
} from '@arcade/engine';
import type { BeltTile } from '@arcade/engine';

// ── Board constants ───────────────────────────────────────────────────────────
const GRID = { cols: 10, rows: 10, cellSize: 1 } as const;

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
  const key = `${c.col},${c.row}`;
  if (belts.has(key)) return;
  const tile = createBeltTile(renderer, {
    col: c.col,
    row: c.row,
    direction: 'east',
    cellSize: GRID.cellSize,
  });
  belts.set(key, tile);
});

pointer.onGridRotate((c) => {
  const key = `${c.col},${c.row}`;
  const belt = belts.get(key);
  if (belt) belt.setDirection(rotateCW(belt.direction));
});

// ── Game loop ─────────────────────────────────────────────────────────────────
const loop = new GameLoop((_dt) => {
  renderer.render();
});
loop.start();
