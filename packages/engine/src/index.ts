// Public API — the only surface games may import from @arcade/engine
export { world, cellToWorld, worldToCell, cellInBounds } from './ecs/index.js';
export type { Entity, Transform, Renderable, GridCoord, WorldPos } from './ecs/index.js';
export { Renderer, GameLoop, createGridFloor, setIsometricView, Highlighter } from './render/index.js';
export type {
  RendererOptions,
  UpdateFn,
  GridFloor,
  GridFloorOptions,
  IsometricViewOptions,
  HighlighterOptions,
} from './render/index.js';
export { PointerSystem, createPointerSystem } from './input/index.js';
export type { GridPointerEvent } from './input/index.js';
export { AssetLoader } from './assets/index.js';
