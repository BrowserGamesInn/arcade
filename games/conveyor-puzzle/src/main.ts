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
  createMachineTile,
  createSinkTile,
  isWon,
} from '@arcade/engine';
import type { BeltTile, SinkState, Item } from '@arcade/engine';

type Phase = 'planning' | 'running' | 'won';

// ── Board constants ───────────────────────────────────────────────────────────
const GRID = { cols: 10, rows: 10, cellSize: 1 } as const;
const SPAWN_INTERVAL = 1.2;
const ITEM_SPEED = 1.5;
const MAX_ITEMS = 256;

// Level layout: source → [player fills] → machine → [player fills] → sink
const SOURCE       = { col: 0, row: 0 } as const;
const MACHINE_CELL = { col: 3, row: 0 } as const;
const SINK_CELL    = { col: 6, row: 0, requiredColor: 'b' as const, required: 3 } as const;

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas, width: window.innerWidth, height: window.innerHeight });
window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight));

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

// Fixed puzzle cells: source belt and the machine-cell belt are pre-placed.
placeBelt(SOURCE.col, SOURCE.row, 'east');
placeBelt(MACHINE_CELL.col, MACHINE_CELL.row, 'east');

// ── Machine + sink tiles ──────────────────────────────────────────────────────
createMachineTile(renderer, { col: MACHINE_CELL.col, row: MACHINE_CELL.row, cellSize: GRID.cellSize });
createSinkTile(renderer, {
  col: SINK_CELL.col, row: SINK_CELL.row, cellSize: GRID.cellSize,
  color: 0x00ccff,
});

// ── Sink state ────────────────────────────────────────────────────────────────
let sinkStates: SinkState[] = makeSinkStates();

function makeSinkStates(): SinkState[] {
  return [{ col: SINK_CELL.col, row: SINK_CELL.row, requiredColor: SINK_CELL.requiredColor, required: SINK_CELL.required, consumed: 0 }];
}

// ── Movement system ───────────────────────────────────────────────────────────
const movement = new MovementSystem({
  speed: ITEM_SPEED,
  getBelt: (col, row) => belts.get(`${col},${row}`)?.direction,
  getMachine: (col, row) =>
    col === MACHINE_CELL.col && row === MACHINE_CELL.row
      ? { input: 'a' as const, output: 'b' as const }
      : undefined,
  getSink: (col, row) =>
    col === SINK_CELL.col && row === SINK_CELL.row
      ? { requiredColor: SINK_CELL.requiredColor, required: SINK_CELL.required }
      : undefined,
  onItemConsumed: (_item: Item, sc: number, sr: number) => {
    const s = sinkStates.find(x => x.col === sc && x.row === sr);
    if (s) s.consumed++;
    updateHud();
  },
});

const itemRenderer = new ItemRenderer(renderer, { maxItems: MAX_ITEMS, cellSize: GRID.cellSize });

// ── HUD ───────────────────────────────────────────────────────────────────────
const phaseLabel  = document.getElementById('phase-label')   as HTMLSpanElement;
const sinkCounter = document.getElementById('sink-counter')  as HTMLSpanElement;
const btnRun      = document.getElementById('btn-run')       as HTMLButtonElement;
const btnReset    = document.getElementById('btn-reset')     as HTMLButtonElement;
const winOverlay  = document.getElementById('win-overlay')   as HTMLDivElement;
const btnPlayAgain = document.getElementById('btn-play-again') as HTMLButtonElement;

function updateHud(): void {
  const s = sinkStates[0];
  sinkCounter.textContent = `${s.consumed} / ${s.required}`;
}

// ── Phase state machine ───────────────────────────────────────────────────────
let phase: Phase = 'planning';
let spawnAccum = 0;

function setPhase(p: Phase): void {
  phase = p;
  phaseLabel.textContent = p === 'planning' ? 'Planning' : p === 'running' ? 'Running' : 'Won';
  btnRun.disabled   = p !== 'planning';
  btnReset.disabled = p === 'planning';
  winOverlay.style.display = p === 'won' ? 'flex' : 'none';
}

function doReset(): void {
  movement.clear();
  sinkStates = makeSinkStates();
  spawnAccum = 0;
  updateHud();
  setPhase('planning');
}

btnRun.addEventListener('click', () => setPhase('running'));
btnReset.addEventListener('click', doReset);
btnPlayAgain.addEventListener('click', doReset);

setPhase('planning');
updateHud();

// ── Interaction ───────────────────────────────────────────────────────────────
const highlighter = new Highlighter(renderer, { cellSize: GRID.cellSize });
const pointer = createPointerSystem(renderer, { cellSize: GRID.cellSize });

pointer.onGridHover((c) => {
  if (cellInBounds(c, GRID)) highlighter.moveTo(c);
  else highlighter.hide();
});

pointer.onGridClick((c) => {
  if (phase !== 'planning') return;
  if (!cellInBounds(c, GRID)) return;
  // Block placement on fixed puzzle cells.
  if (c.col === MACHINE_CELL.col && c.row === MACHINE_CELL.row) return;
  if (c.col === SINK_CELL.col    && c.row === SINK_CELL.row)    return;
  placeBelt(c.col, c.row, 'east');
});

pointer.onGridRotate((c) => {
  if (phase !== 'planning') return;
  const key = `${c.col},${c.row}`;
  const belt = belts.get(key);
  if (belt) belt.setDirection(rotateCW(belt.direction));
});

// ── Game loop ─────────────────────────────────────────────────────────────────
const loop = new GameLoop((dt) => {
  if (phase === 'running') {
    spawnAccum += dt;
    while (spawnAccum >= SPAWN_INTERVAL && movement.items.length < MAX_ITEMS) {
      const sourceBelt = belts.get(`${SOURCE.col},${SOURCE.row}`);
      if (sourceBelt) {
        movement.add({ col: SOURCE.col, row: SOURCE.row, direction: sourceBelt.direction, progress: 0, color: 'a' });
      }
      spawnAccum -= SPAWN_INTERVAL;
    }
    movement.tick(dt);
    if (isWon(sinkStates)) setPhase('won');
  }
  itemRenderer.sync(movement.items);
  renderer.render();
});
loop.start();
