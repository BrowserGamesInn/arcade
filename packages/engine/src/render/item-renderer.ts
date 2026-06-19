import * as THREE from 'three';
import { cellToWorld } from '../ecs/grid.js';
import { directionToDelta } from '../ecs/belt.js';
import type { BeltDirection } from '../ecs/belt.js';
import type { Renderer } from './renderer.js';

export interface ItemRendererOptions {
  /** Maximum number of simultaneously rendered items (sets InstancedMesh capacity). */
  maxItems: number;
  cellSize: number;
  /** Fill colour. Defaults to a vibrant item orange (#ff8800). */
  color?: number;
}

/**
 * Renders up to `maxItems` items as a single instanced draw call.
 *
 * Call {@link sync} every frame with the current item list; the mesh count and
 * instance matrices are updated in-place so only live items are drawn.
 *
 * Layering (Y heights): floor=0, grid-lines=0.002, belt-tiles=0.005,
 * highlighter=0.01, items=0.05.
 */
export class ItemRenderer {
  private readonly mesh: THREE.InstancedMesh;
  private readonly cellSize: number;
  private readonly scratch = new THREE.Object3D();

  constructor(
    private readonly renderer: Renderer,
    opts: ItemRendererOptions,
  ) {
    const { maxItems, cellSize, color = 0xff8800 } = opts;
    this.cellSize = cellSize;

    const side = cellSize * 0.3;
    const geometry = new THREE.BoxGeometry(side, side, side);
    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.InstancedMesh(geometry, material, maxItems);
    this.mesh.count = 0;
    renderer.scene.add(this.mesh);
  }

  /** Update instance matrices to match the given item positions. Must be called each frame. */
  sync(
    items: readonly { col: number; row: number; direction: BeltDirection; progress: number }[],
  ): void {
    const count = items.length;
    for (let i = 0; i < count; i++) {
      const item = items[i];
      const from = cellToWorld(item.col, item.row, this.cellSize);
      const { dcol, drow } = directionToDelta(item.direction);
      const to = cellToWorld(item.col + dcol, item.row + drow, this.cellSize);
      const t = item.progress;
      this.scratch.position.set(
        from.x + (to.x - from.x) * t,
        0.05,
        from.z + (to.z - from.z) * t,
      );
      this.scratch.updateMatrix();
      this.mesh.setMatrixAt(i, this.scratch.matrix);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.renderer.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
