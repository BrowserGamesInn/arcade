import {
  Renderer,
  GameLoop,
  createGridFloor,
  setIsometricView,
  Highlighter,
  createPointerSystem,
  cellInBounds,
} from '@arcade/engine';

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
  if (cellInBounds(c, GRID)) {
    console.log('clicked cell', c);
  }
});

// ── Game loop ─────────────────────────────────────────────────────────────────
const loop = new GameLoop((_dt) => {
  renderer.render();
});
loop.start();
