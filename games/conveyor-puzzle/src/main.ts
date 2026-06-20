import './styles.css';
import { mountGame } from './game.js';
import type { GameController } from './game.js';
import { mountLevelSelect } from './ui/levelSelect.js';
import { show, registerHooks } from './ui/router.js';
import { markComplete } from './ui/progress.js';
import { LEVELS } from './levels.js';

// ── DOM refs ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
const levelsMap = document.getElementById('levels-map') as HTMLElement;
const railContext = document.getElementById('rail-context') as HTMLSpanElement;

// ── Helpers ────────────────────────────────────────────────────────────────────
function setRailLevel(index: number): void {
  const num = String(index + 1).padStart(2, '0');
  railContext.textContent = `LV.${num} · ${LEVELS[index].title.toUpperCase()}`;
}

// ── Level selector ─────────────────────────────────────────────────────────────
// Declared before `game` so the onExit hook can reference it.
const levelSelect = mountLevelSelect(levelsMap, (index) => {
  setRailLevel(index);
  show('game');
  game.enterGame(index);
});

// ── Game controller ────────────────────────────────────────────────────────────
// `game` is declared first so the levelSelect callback can close over the binding.
// It is assigned synchronously on the very next line; callbacks only fire on user action.
// eslint-disable-next-line prefer-const -- forward-reference cycle; assigned exactly once below
let game!: GameController;
game = mountGame(canvas, {
  onLevelComplete(index) {
    markComplete(index);
  },
  onNavigateLevels() {
    // Transitioning to 'levels' triggers the 'game' onExit hook, which stops
    // the loop, refreshes progress stamps, and clears the rail.
    show('levels');
  },
  onNavigateNext(nextIndex) {
    setRailLevel(nextIndex);
    game.enterGame(nextIndex);
  },
});

// ── Router hooks ───────────────────────────────────────────────────────────────
registerHooks('game', {
  onExit() {
    game.exitGame();
    levelSelect.refresh();
    railContext.textContent = '';
  },
});

registerHooks('levels', {
  onEnter() {
    railContext.textContent = `${LEVELS.length} LINES`;
  },
  onExit() {
    railContext.textContent = '';
  },
});

// ── Navigation wiring ──────────────────────────────────────────────────────────
btnStart.addEventListener('click', () => show('levels'));

// ── Boot ───────────────────────────────────────────────────────────────────────
show('landing');
