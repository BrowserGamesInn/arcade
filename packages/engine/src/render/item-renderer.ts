import * as THREE from 'three';
import { cellToWorld } from '../ecs/grid.js';
import { directionToDelta } from '../ecs/belt.js';
import type { BeltDirection } from '../ecs/belt.js';
import type { ItemColor } from '../ecs/machine.js';
import type { Renderer } from './renderer.js';

export interface ItemRendererOptions {
  /** Maximum number of simultaneously rendered items per colour (sets InstancedMesh capacity). */
  maxItems: number;
  cellSize: number;
  /** Hex colour for 'a' items. Defaults to orange (#ff8800). */
  colorA?: number;
  /** Hex colour for 'b' items. Defaults to cyan (#00ccff). */
  colorB?: number;
}

/**
 * Renders live items as two instanced draw calls — one per item colour.
 *
 * Call {@link sync} every frame with the current item list.
 *
 * Layering (Y heights): floor=0, grid-lines=0.002, sink=0.003, belt-tiles=0.005,
 * machine=0.007, highlighter=0.01, items=0.05.
 */
export class ItemRenderer {
  private readonly meshA: THREE.InstancedMesh;
  private readonly meshB: THREE.InstancedMesh;
  private readonly geometry: THREE.BoxGeometry;
  private readonly scratch = new THREE.Object3D();
  private readonly cellSize: number;

  constructor(
    private readonly renderer: Renderer,
    opts: ItemRendererOptions,
  ) {
    const { maxItems, cellSize, colorA = 0xff8800, colorB = 0x00ccff } = opts;
    this.cellSize = cellSize;

    const side = cellSize * 0.3;
    this.geometry = new THREE.BoxGeometry(side, side, side);
    this.meshA = this.makeMesh(colorA, maxItems);
    this.meshB = this.makeMesh(colorB, maxItems);
  }

  private makeMesh(color: number, maxItems: number): THREE.InstancedMesh {
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.InstancedMesh(this.geometry, material, maxItems);
    mesh.count = 0;
    this.renderer.scene.add(mesh);
    return mesh;
  }

  /** Update instance matrices to match the given item positions. Must be called each frame. */
  sync(
    items: readonly { col: number; row: number; direction: BeltDirection; progress: number; color: ItemColor }[],
  ): void {
    let countA = 0;
    let countB = 0;

    for (const item of items) {
      const isA = item.color !== 'b';
      const mesh = isA ? this.meshA : this.meshB;
      const idx = isA ? countA++ : countB++;
      this.placeAt(mesh, idx, item);
    }

    this.meshA.count = countA;
    this.meshA.instanceMatrix.needsUpdate = true;
    this.meshB.count = countB;
    this.meshB.instanceMatrix.needsUpdate = true;
  }

  private placeAt(
    mesh: THREE.InstancedMesh,
    idx: number,
    item: { col: number; row: number; direction: BeltDirection; progress: number },
  ): void {
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
    mesh.setMatrixAt(idx, this.scratch.matrix);
  }

  dispose(): void {
    this.renderer.scene.remove(this.meshA);
    this.renderer.scene.remove(this.meshB);
    (this.meshA.material as THREE.Material).dispose();
    (this.meshB.material as THREE.Material).dispose();
    this.geometry.dispose();
  }
}
