import { LEVELS } from '../levels.js';
import { getCompleted, isUnlocked } from './progress.js';

export interface LevelSelectHandle {
  refresh(): void;
}

/**
 * Builds the routing-map level selector inside `container` and returns a handle
 * to refresh it after progress changes.
 *
 * Snake layout (8 levels, 4+4):
 *   Row 1 (L→R):  LV.01  →  LV.02  →  LV.03  →  LV.04
 *                                                     ↓
 *   Row 2 (R→L):  LV.08  ←  LV.07  ←  LV.06  ←  LV.05
 *
 * CSS Grid: 7 columns × 3 rows
 *   Odd  cols (1,3,5,7) → station cards
 *   Even cols (2,4,6)   → horizontal connectors
 *   Row 2, col 7        → vertical connector (the right-side turn)
 */
export function mountLevelSelect(
  container: HTMLElement,
  onSelect: (index: number) => void,
): LevelSelectHandle {
  function render(): void {
    const completed = getCompleted();
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'routing-grid';

    function place(el: HTMLElement, col: number, row: number): void {
      el.style.gridColumn = String(col);
      el.style.gridRow = String(row);
      grid.appendChild(el);
    }

    // ── Row 1: levels 0–3 left-to-right ─────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const stationCol = i * 2 + 1; // 1, 3, 5, 7
      place(buildStation(i, completed, onSelect), stationCol, 1);
      if (i < 3) {
        place(buildConnector(i, i + 1, completed, 'right'), stationCol + 1, 1);
      }
    }

    // ── Row 2: vertical turn connector (col 7) ───────────────────────────────
    place(buildConnector(3, 4, completed, 'down'), 7, 2);

    // ── Row 3: levels 4–7 right-to-left ─────────────────────────────────────
    // Level 4 is at col 7, level 7 is at col 1.
    for (let i = 4; i < 8; i++) {
      const stationCol = (7 - i) * 2 + 1; // i=4→7, i=5→5, i=6→3, i=7→1
      place(buildStation(i, completed, onSelect), stationCol, 3);
      if (i < 7) {
        // Connector column is to the right of the next station card
        // (between col of level i+1 and col of level i)
        const connCol = (7 - i) * 2; // i=4→6, i=5→4, i=6→2
        place(buildConnector(i, i + 1, completed, 'left'), connCol, 3);
      }
    }

    container.appendChild(grid);
  }

  render();
  return { refresh: render };
}

// ── Station card ─────────────────────────────────────────────────────────────

function buildStation(
  index: number,
  completed: Set<number>,
  onSelect: (i: number) => void,
): HTMLButtonElement {
  const level = LEVELS[index];
  const isDone = completed.has(index);
  const unlocked = isUnlocked(index);
  const num = String(index + 1).padStart(2, '0');

  const machineCount = level.machines.length;
  const sinkTotal = level.sinks.reduce((n, s) => n + s.required, 0);
  const sinkColors = [...new Set(level.sinks.map((s) => s.requiredColor))];

  const state = isDone ? ' station--done' : !unlocked ? ' station--locked' : '';
  const btn = document.createElement('button');
  btn.className = `station${state}`;
  btn.disabled = !unlocked;
  btn.setAttribute(
    'aria-label',
    `Level ${index + 1}: ${level.title}${isDone ? ' (completed)' : !unlocked ? ' (locked)' : ''}`,
  );

  const dotsHtml = sinkColors
    .map((c) => `<span class="material-dot material-dot--${c}" aria-hidden="true"></span>`)
    .join('');

  const machineSpec =
    machineCount > 0
      ? `<span class="station__spec">${machineCount === 1 ? '1 machine' : `${machineCount} machines`}</span>`
      : '';

  btn.innerHTML = `
    <span class="station__code">LV.${num}</span>
    <span class="station__name">${level.title}</span>
    <div class="station__specs">
      <span class="station__spec">${level.grid.cols}&times;${level.grid.rows}</span>
      ${machineSpec}
      <span class="station__spec">${dotsHtml} ${sinkTotal} items</span>
    </div>
    ${isDone ? '<span class="station__stamp">DELIVERED</span>' : ''}
    ${!unlocked ? '<span class="station__lock" aria-hidden="true">&#128274;</span>' : ''}
  `;

  btn.addEventListener('click', () => onSelect(index));
  return btn;
}

// ── Connector segment ─────────────────────────────────────────────────────────

function buildConnector(
  fromIndex: number,
  toIndex: number,
  completed: Set<number>,
  direction: 'right' | 'left' | 'down',
): HTMLDivElement {
  const lowerIndex = Math.min(fromIndex, toIndex);
  const isEnergized = completed.has(lowerIndex);
  const div = document.createElement('div');
  div.className = `connector connector--${direction}${isEnergized ? ' connector--energized' : ''}`;
  div.setAttribute('aria-hidden', 'true');
  return div;
}
