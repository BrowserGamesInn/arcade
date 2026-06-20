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
import type { BeltTile, MachineTile, SinkTile, SinkState, Item, GridFloor } from '@arcade/engine';
import { LEVELS } from './levels.js';
import type { Level } from './levels.js';
import { playSpawn, playConsume, playWin } from './audio.js';

type Phase = 'planning' | 'running' | 'won';

const ITEM_COLOR_HEX = { a: 0xff8800, b: 0x00ccff } as const;
const SPAWN_INTERVAL = 1.2;
const ITEM_SPEED = 1.5;
const MAX_ITEMS = 256;

export interface GameCallbacks {
  /** Fired when the player delivers all items for a level. */
  onLevelComplete: (index: number) => void;
  /** Fired when the player navigates back to the level selector. */
  onNavigateLevels: () => void;
  /** Fired when the player advances to the next level inside the game screen. */
  onNavigateNext: (nextIndex: number) => void;
}

export interface GameController {
  enterGame(levelIndex: number): void;
  exitGame(): void;
}

export function mountGame(canvas: HTMLCanvasElement, callbacks: GameCallbacks): GameController {
  // ── DOM references (must exist in index.html) ──────────────────────────────
  const levelCode = document.getElementById('level-code') as HTMLSpanElement;
  const levelTitle = document.getElementById('level-title') as HTMLSpanElement;
  const statusLamp = document.getElementById('status-lamp') as HTMLSpanElement;
  const sinkGauge = document.getElementById('sink-gauge') as HTMLSpanElement;
  const btnRun = document.getElementById('btn-run') as HTMLButtonElement;
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
  const btnBack = document.getElementById('btn-back') as HTMLButtonElement;
  const winOverlay = document.getElementById('win-overlay') as HTMLDivElement;
  const winMessage = document.getElementById('win-message') as HTMLParagraphElement;
  const btnNextLevel = document.getElementById('btn-next-level') as HTMLButtonElement;
  const btnLevelSel = document.getElementById('btn-level-select') as HTMLButtonElement;
  const btnPlayAgain = document.getElementById('btn-play-again') as HTMLButtonElement;

  // ── One-time engine setup ──────────────────────────────────────────────────
  const renderer = new Renderer({ canvas, width: window.innerWidth, height: window.innerHeight });
  window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight));

  // All current levels use cellSize: 1 — safe to fix here.
  const itemRenderer = new ItemRenderer(renderer, { maxItems: MAX_ITEMS, cellSize: 1 });
  const highlighter = new Highlighter(renderer, { cellSize: 1 });
  const pointer = createPointerSystem(renderer, { cellSize: 1 });

  // ── Mutable per-level state ────────────────────────────────────────────────
  const belts = new Map<string, BeltTile>();
  const fixedCells = new Set<string>();
  let machineTiles: MachineTile[] = [];
  let sinkTiles: SinkTile[] = [];
  let sinkStates: SinkState[] = [];
  let movement!: MovementSystem;
  let gridFloor: GridFloor | null = null;
  let phase: Phase = 'planning';
  let spawnAccum = 0;
  let currentLevel = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function buildMovementSystem(level: Level): MovementSystem {
    return new MovementSystem({
      speed: ITEM_SPEED,
      getBelt: (col, row) => belts.get(`${col},${row}`)?.direction,
      getMachine: (col, row) => {
        const m = level.machines.find((m) => m.col === col && m.row === row);
        return m ? { input: m.input, output: m.output } : undefined;
      },
      getSink: (col, row) => {
        const s = level.sinks.find((s) => s.col === col && s.row === row);
        return s ? { requiredColor: s.requiredColor, required: s.required } : undefined;
      },
      onItemConsumed: (_item: Item, sc: number, sr: number) => {
        const s = sinkStates.find((x) => x.col === sc && x.row === sr);
        if (s) s.consumed++;
        updateSinkGauge();
        playConsume();
      },
    });
  }

  function updateSinkGauge(): void {
    const total = sinkStates.reduce((n, s) => n + s.required, 0);
    const done = sinkStates.reduce((n, s) => n + s.consumed, 0);
    sinkGauge.textContent = `${done} / ${total}`;
  }

  function setPhase(p: Phase): void {
    phase = p;
    const LAMP: Record<Phase, string> = {
      planning: 'PLANNING',
      running: 'RUNNING',
      won: 'DELIVERED',
    };
    statusLamp.textContent = LAMP[p];
    statusLamp.dataset.phase = p;
    btnRun.disabled = p !== 'planning';
    btnReset.disabled = p === 'planning';
    winOverlay.classList.toggle('win-overlay--visible', p === 'won');
    winOverlay.setAttribute('aria-hidden', p === 'won' ? 'false' : 'true');
    if (p === 'won') {
      playWin();
      const isLast = currentLevel === LEVELS.length - 1;
      winMessage.textContent = isLast ? 'All levels complete!' : 'All items delivered.';
      btnNextLevel.style.display = isLast ? 'none' : '';
      callbacks.onLevelComplete(currentLevel);
    }
  }

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

    movement = buildMovementSystem(level);
    movement.clear();
    spawnAccum = 0;

    sinkStates = level.sinks.map((s) => ({
      col: s.col,
      row: s.row,
      requiredColor: s.requiredColor,
      required: s.required,
      consumed: 0,
    }));

    for (const b of level.belts) {
      const tile = createBeltTile(renderer, {
        col: b.col,
        row: b.row,
        direction: b.direction,
        cellSize: level.grid.cellSize,
      });
      belts.set(`${b.col},${b.row}`, tile);
    }

    for (const m of level.machines) {
      machineTiles.push(
        createMachineTile(renderer, { col: m.col, row: m.row, cellSize: level.grid.cellSize }),
      );
      fixedCells.add(`${m.col},${m.row}`);
    }

    for (const s of level.sinks) {
      sinkTiles.push(
        createSinkTile(renderer, {
          col: s.col,
          row: s.row,
          cellSize: level.grid.cellSize,
          color: ITEM_COLOR_HEX[s.requiredColor],
        }),
      );
      fixedCells.add(`${s.col},${s.row}`);
    }

    fixedCells.add(`${level.source.col},${level.source.row}`);

    // HUD text.
    const num = String(index + 1).padStart(2, '0');
    levelCode.textContent = `LV.${num}`;
    levelTitle.textContent = level.title;
    updateSinkGauge();
    setPhase('planning');
  }

  function doReset(): void {
    const level = LEVELS[currentLevel];
    const fixedKeys = new Set(level.belts.map((b) => `${b.col},${b.row}`));
    for (const [key, tile] of belts) {
      if (!fixedKeys.has(key)) {
        tile.dispose();
        belts.delete(key);
      }
    }
    movement.clear();
    sinkStates = level.sinks.map((s) => ({
      col: s.col,
      row: s.row,
      requiredColor: s.requiredColor,
      required: s.required,
      consumed: 0,
    }));
    spawnAccum = 0;
    updateSinkGauge();
    setPhase('planning');
  }

  // ── Pointer handlers ───────────────────────────────────────────────────────
  pointer.onGridHover((c) => {
    if (cellInBounds(c, LEVELS[currentLevel].grid)) highlighter.moveTo(c);
    else highlighter.hide();
  });

  pointer.onGridClick((c) => {
    if (phase !== 'planning') return;
    const level = LEVELS[currentLevel];
    if (!cellInBounds(c, level.grid)) return;
    const key = `${c.col},${c.row}`;
    if (fixedCells.has(key) || belts.has(key)) return;
    belts.set(
      key,
      createBeltTile(renderer, {
        col: c.col,
        row: c.row,
        direction: 'east',
        cellSize: level.grid.cellSize,
      }),
    );
  });

  pointer.onGridRotate((c) => {
    if (phase !== 'planning') return;
    const belt = belts.get(`${c.col},${c.row}`);
    if (belt) belt.setDirection(rotateCW(belt.direction));
  });

  // ── Button wiring ──────────────────────────────────────────────────────────
  btnRun.addEventListener('click', () => setPhase('running'));
  btnReset.addEventListener('click', doReset);
  btnBack.addEventListener('click', () => callbacks.onNavigateLevels());
  btnPlayAgain.addEventListener('click', doReset);
  btnLevelSel.addEventListener('click', () => callbacks.onNavigateLevels());
  btnNextLevel.addEventListener('click', () => {
    if (currentLevel < LEVELS.length - 1) callbacks.onNavigateNext(currentLevel + 1);
  });

  // ── Game loop ──────────────────────────────────────────────────────────────
  const loop = new GameLoop((dt) => {
    if (phase === 'running') {
      const level = LEVELS[currentLevel];
      const source = level.source;
      spawnAccum += dt;
      while (spawnAccum >= SPAWN_INTERVAL && movement.items.length < MAX_ITEMS) {
        const sourceBelt = belts.get(`${source.col},${source.row}`);
        if (sourceBelt) {
          movement.add({
            col: source.col,
            row: source.row,
            direction: sourceBelt.direction,
            progress: 0,
            color: 'a',
          });
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

  // ── Public controller ──────────────────────────────────────────────────────
  return {
    enterGame(levelIndex: number): void {
      // Replace scene geometry for the new level (dispose old floor first).
      gridFloor?.dispose();
      gridFloor = createGridFloor(renderer, LEVELS[levelIndex].grid);
      setIsometricView(renderer, LEVELS[levelIndex].grid);
      loadLevel(levelIndex);
      loop.start();
    },
    exitGame(): void {
      loop.stop();
    },
  };
}
