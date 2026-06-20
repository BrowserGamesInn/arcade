type ScreenId = 'landing' | 'levels' | 'game';

interface ScreenHooks {
  onEnter?: () => void;
  onExit?: () => void;
}

const hooks: Record<ScreenId, ScreenHooks> = {
  landing: {},
  levels: {},
  game: {},
};

let current: ScreenId | null = null;

export function registerHooks(id: ScreenId, h: ScreenHooks): void {
  hooks[id] = h;
}

export function show(id: ScreenId): void {
  if (current === id) return;

  if (current !== null) {
    hooks[current].onExit?.();
    document.getElementById(`screen-${current}`)?.classList.remove('screen--active');
  }

  current = id;
  document.getElementById(`screen-${id}`)?.classList.add('screen--active');
  hooks[id].onEnter?.();
}
