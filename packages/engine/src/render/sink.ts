import * as THREE from 'three';
import { cellToWorld } from '../ecs/grid.js';
import type { Renderer } from './renderer.js';

export interface SinkTileOptions {
  col: number;
  row: number;
  cellSize: number;
  /** Fill colour of the sink tile. Should match the required item colour. */
  color: number;
}

export interface SinkTile {
  dispose(): void;
}

/**
 * Renders a sink cell as a coloured square.
 * Sits at y=0.003 — below belt tiles (0.005), visible since sinks have no belt tile.
 * The colour should indicate which item type this sink accepts.
 */
export function createSinkTile(renderer: Renderer, opts: SinkTileOptions): SinkTile {
  const { col, row, cellSize, color } = opts;
  const { x, z } = cellToWorld(col, row, cellSize);
  const s = cellSize * 0.88;

  const geometry = new THREE.BoxGeometry(s, 0.01, s);
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0.003, z);
  renderer.scene.add(mesh);

  return {
    dispose() {
      renderer.scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
