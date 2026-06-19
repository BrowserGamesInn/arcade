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
import type { BeltTile, MachineTile, SinkTile, SinkState, Item } from '@arcade/engine';
import { LEVELS } from './levels.js';
import type { Level } from './levels.js';
import { playSpawn, playConsume, playWin } from './audio.js';

type Phase = 'planning' | 'running' | 'won';

const ITEM_COLOR_HEX = { a: 0xff8800, b: 0x00ccff } as const;
const SPAWN_INTERVAL = 1.2;
const ITEM_SPEED     = 1.5;
const MAX_ITEMS      = 256;

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas, width: window.innerWidth, height: window.innerHeight });
window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight));

// ── HUD elements ──────────────────────────────────────────────────────────────
const levelDisplay  = document.getElementById('level-display')   as HTMLSpanElement;
const levelTitle    = document.getElementById('level-title')     as HTMLSpanElement;
const phaseLabel    = document.getElementById('phase-label')     as HTMLSpanElement;
const sinkCounter   = document.getElementById('sink-counter')    as HTMLSpanElement;
const btnRun        = document.getElementById('btn-run')         as HTMLButtonElement;
const btnReset      = document.getElementById('btn-reset')       as HTMLButtonElement;
const winOverlay    = document.getElementById('win-overlay')     as HTMLDivElement;
const winMessage    = document.getElementById('win-message')     as HTMLParagraphElement;
const btnNextLevel  = document.getElementById('btn-next-level')  as HTMLButtonElement;
const btnPlayAgain  = document.getElementById('btn-play-again')  as HTMLButtonElement;

// ── Scene ─────────────────────────────────────────────────────────────────────
createGridFloor(renderer, LEVELS[0].grid);
setIsometricView(renderer, LEVELS[0].grid);

// ── Mutable per-level state ───────────────────────────────────────────────────
const belts        = new Map<string, BeltTile>();
const fixedCells   = new Set<string>();   // cells the player cannot place belts on
let machineTiles : MachineTile[] = [];
let sinkTiles    : SinkTile[]    = [];
let sinkStates   : SinkState[]   = [];
let movement     = buildMovementSystem(LEVELS[0]);
let phase        : Phase         = 'planning';
let spawnAccum   = 0;
let currentLevel = 0;

const itemRenderer = new ItemRenderer(renderer, { maxItems: MAX_ITEMS, cellSize: LEVELS[0].grid.cellSize });

function buildMovementSystem(level: Level): MovementSystem {
  return new MovementSystem({
    speed: ITEM_SPEED,
    getBelt   : (col, row) => belts.get(`${col},${row}`)?.direction,
    getMachine: (col, row) => {
      const m = level.machines.find(m => m.col === col && m.row === row);
      return m ? { input: m.input, output: m.output } : undefined;
    },
    getSink: (col, row) => {
      const s = level.sinks.find(s => s.col === col && s.row === row);
      return s ? { requiredColor: s.requiredColor, required: s.required } : undefined;
    },
    onItemConsumed: (_item: Item, sc: number, sr: number) => {
      const s = sinkStates.find(x => x.col === sc && x.row === sr);
      if (s) s.consumed++;
      updateSinkCounter();
      playConsume();
    },
  });
}

function updateSinkCounter(): void {
  const total = sinkStates.reduce((n, s) => n + s.required, 0);
  const done  = sinkStates.reduce((n, s) => n + s.consumed, 0);
  sinkCounter.textContent = `${done} / ${total}`;
}

// ── Phase ─────────────────────────────────────────────────────────────────────
function setPhase(p: Phase): void {
  phase = p;
  phaseLabel.textContent  = p === 'planning' ? 'Planning' : p === 'running' ? 'Running' : 'Won';
  btnRun.disabled         = p !== 'planning';
  btnReset.disabled       = p === 'planning';
  winOverlay.style.display = p === 'won' ? 'flex' : 'none';
  if (p === 'won') {
    playWin();
    const isLast = currentLevel === LEVELS.length - 1;
    winMessage.textContent = isLast ? 'All levels complete!' : 'All items delivered.';
    btnNextLevel.style.display = isLast ? 'none' : '';
  }
}

// ── Level loading ─────────────────────────────────────────────────────────────
function loadLevel(index: number): void {
  const level = LEVELS[index];
  currentLevel = index;

  // Dispose previous tiles.
  for (const belt of belts.values()) belt.dispose();
  belts.clear();
  fixedCells.clear();
  for (const t of machineTiles) t.dispose();
  machineTiles = [];
  for (const t of sinkTiles) t.dispose();
  sinkTiles = [];

  // Rebuild movement system with new level's lookups.
  movement = buildMovementSystem(level);
  movement.clear();
  spawnAccum = 0;

  // Sink states.
  sinkStates = level.sinks.map(s => ({
    col: s.col, row: s.row, requiredColor: s.requiredColor, required: s.required, consumed: 0,
  }));

  // Pre-placed (fixed) belts.
  for (const b of level.belts) {
    const key = `${b.col},${b.row}`;
    const tile = createBeltTile(renderer, { col: b.col, row: b.row, direction: b.direction, cellSize: level.grid.cellSize });
    belts.set(key, tile);
  }

  // Machine tiles + mark as fixed.
  for (const m of level.machines) {
    machineTiles.push(createMachineTile(renderer, { col: m.col, row: m.row, cellSize: level.grid.cellSize }));
    fixedCells.add(`${m.col},${m.row}`);
  }

  // Sink tiles + mark as fixed.
  for (const s of level.sinks) {
    sinkTiles.push(createSinkTile(renderer, {
      col: s.col, row: s.row, cellSize: level.grid.cellSize,
      color: ITEM_COLOR_HEX[s.requiredColor],
    }));
    fixedCells.add(`${s.col},${s.row}`);
  }

  // Mark source cell as fixed (player can't replace it).
  fixedCells.add(`${level.source.col},${level.source.row}`);

  // HUD.
  levelDisplay.textContent = `Level ${index + 1} / ${LEVELS.length}`;
  levelTitle.textContent   = level.title;
  updateSinkCounter();
  setPhase('planning');
}

function doReset(): void {
  // Clear player-placed belts that are not pre-placed.
  const level = LEVELS[currentLevel];
  const fixedKeys = new Set(level.belts.map(b => `${b.col},${b.row}`));
  for (const [key, tile] of belts) {
    if (!fixedKeys.has(key)) {
      tile.dispose();
      belts.delete(key);
    }
  }
  movement.clear();
  sinkStates = level.sinks.map(s => ({
    col: s.col, row: s.row, requiredColor: s.requiredColor, required: s.required, consumed: 0,
  }));
  spawnAccum = 0;
  updateSinkCounter();
  setPhase('planning');
}

btnRun.addEventListener('click', () => setPhase('running'));
btnReset.addEventListener('click', doReset);
btnPlayAgain.addEventListener('click', doReset);
btnNextLevel.addEventListener('click', () => {
  if (currentLevel < LEVELS.length - 1) loadLevel(currentLevel + 1);
});

// ── Interaction ───────────────────────────────────────────────────────────────
const highlighter = new Highlighter(renderer, { cellSize: LEVELS[0].grid.cellSize });
const pointer     = createPointerSystem(renderer, { cellSize: LEVELS[0].grid.cellSize });

pointer.onGridHover((c) => {
  const level = LEVELS[currentLevel];
  if (cellInBounds(c, level.grid)) highlighter.moveTo(c);
  else highlighter.hide();
});

pointer.onGridClick((c) => {
  if (phase !== 'planning') return;
  const level = LEVELS[currentLevel];
  if (!cellInBounds(c, level.grid)) return;
  const key = `${c.col},${c.row}`;
  if (fixedCells.has(key)) return;
  if (belts.has(key)) return;
  const tile = createBeltTile(renderer, { col: c.col, row: c.row, direction: 'east', cellSize: level.grid.cellSize });
  belts.set(key, tile);
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
    const level  = LEVELS[currentLevel];
    const source = level.source;
    spawnAccum += dt;
    while (spawnAccum >= SPAWN_INTERVAL && movement.items.length < MAX_ITEMS) {
      const sourceBelt = belts.get(`${source.col},${source.row}`);
      if (sourceBelt) {
        movement.add({ col: source.col, row: source.row, direction: sourceBelt.direction, progress: 0, color: 'a' });
        playSpawn();
      }
      spawnAccum -= SPAWN_INTERVAL;
    }
    movement.tick(dt);
    if (isWon(sinkStates)) setPhase('won');
  }
  itemRenderer.sync(movement.items);
  renderer.render();
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
loadLevel(0);
loop.start();

