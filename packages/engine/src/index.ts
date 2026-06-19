// Public API — the only surface games may import from @arcade/engine
export { world, cellToWorld, worldToCell } from './ecs/index.js';
export type { Entity, Transform, Renderable, GridCoord, WorldPos } from './ecs/index.js';
export { Renderer, GameLoop } from './render/index.js';
export type { RendererOptions, UpdateFn } from './render/index.js';
export { PointerSystem } from './input/index.js';
export type { GridPointerEvent } from './input/index.js';
export { AssetLoader } from './assets/index.js';
