import * as THREE from 'three';
import { worldToCell } from '../ecs/grid.js';
import type { Renderer } from '../render/renderer.js';

export interface GridPointerEvent {
  col: number;
  row: number;
}

/**
 * Translates raw DOM pointer events into grid-cell events via raycasting
 * against an infinite XZ ground plane.
 *
 * Construct directly when you need full control over the camera and plane,
 * or use the {@link createPointerSystem} factory which derives them from a
 * {@link Renderer} so game code never touches Three.js objects.
 */
export class PointerSystem {
  private raycaster = new THREE.Raycaster();
  private ndcPointer = new THREE.Vector2();
  private clickListeners: Array<(e: GridPointerEvent) => void> = [];
  private hoverListeners: Array<(e: GridPointerEvent) => void> = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: THREE.Camera,
    private plane: THREE.Plane,
    private cellSize: number,
  ) {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
  }

  /** Register a callback fired on every grid cell click. Returns an unsubscribe fn. */
  onGridClick(fn: (e: GridPointerEvent) => void): () => void {
    this.clickListeners.push(fn);
    return () => {
      this.clickListeners = this.clickListeners.filter((l) => l !== fn);
    };
  }

  /** Register a callback fired as the pointer moves over the grid. Returns an unsubscribe fn. */
  onGridHover(fn: (e: GridPointerEvent) => void): () => void {
    this.hoverListeners.push(fn);
    return () => {
      this.hoverListeners = this.hoverListeners.filter((l) => l !== fn);
    };
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
  }

  /** Shared NDC→ray→plane→cell conversion used by both click and move handlers. */
  private hitCell(e: PointerEvent): GridPointerEvent | null {
    const rect = this.canvas.getBoundingClientRect();
    this.ndcPointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndcPointer, this.camera);
    const target = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, target)) return null;
    return worldToCell(target.x, target.z, this.cellSize);
  }

  private onPointerDown = (e: PointerEvent): void => {
    const evt = this.hitCell(e);
    if (evt) this.clickListeners.forEach((l) => l(evt));
  };

  private onPointerMove = (e: PointerEvent): void => {
    const evt = this.hitCell(e);
    if (evt) this.hoverListeners.forEach((l) => l(evt));
  };
}

/**
 * Factory that builds a {@link PointerSystem} from a {@link Renderer},
 * so game code never needs to construct Three.js objects directly.
 *
 * The ground plane is the infinite XZ plane at y = 0, matching the grid floor.
 */
export function createPointerSystem(
  renderer: Renderer,
  opts: { cellSize: number },
): PointerSystem {
  // y-normal plane at y=0 (the grid floor)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  return new PointerSystem(renderer.domElement, renderer.camera, groundPlane, opts.cellSize);
}
