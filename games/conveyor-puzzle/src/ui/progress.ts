const KEY = 'conveyor:progress:v1';

function load(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function save(completed: number[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(completed));
  } catch {
    // ignore storage errors (private mode, quota exceeded, etc.)
  }
}

export function getCompleted(): Set<number> {
  return new Set(load());
}

export function markComplete(index: number): void {
  const completed = load();
  if (!completed.includes(index)) {
    completed.push(index);
    save(completed);
  }
}

/** Level 0 is always unlocked; all others require the previous level completed. */
export function isUnlocked(index: number): boolean {
  if (index === 0) return true;
  return getCompleted().has(index - 1);
}
