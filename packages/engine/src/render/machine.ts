import * as THREE from 'three';
import { cellToWorld } from '../ecs/grid.js';
import type { Renderer } from './renderer.js';

export interface MachineTileOptions {
  col: number;
  row: number;
  cellSize: number;
  /** Colour of the input (left) half. Defaults to orange-ish (#cc6600). */
  colorIn?: number;
  /** Colour of the output (right) half. Defaults to cyan-ish (#0088cc). */
  colorOut?: number;
}

export interface MachineTile {
  dispose(): void;
}

/**
 * Renders a machine cell as two coloured half-squares side by side (input/output).
 * Sits at y=0.007 — above belt tiles (0.005) so it peeks out visually.
 */
export function createMachineTile(renderer: Renderer, opts: MachineTileOptions): MachineTile {
  const { col, row, cellSize, colorIn = 0xcc6600, colorOut = 0x0088cc } = opts;
  const { x, z } = cellToWorld(col, row, cellSize);
  const half = cellSize * 0.44;
  const depth = cellSize * 0.88;
  const y = 0.007;

  const geomIn = new THREE.BoxGeometry(half, 0.01, depth);
  const matIn = new THREE.MeshBasicMaterial({ color: colorIn });
  const meshIn = new THREE.Mesh(geomIn, matIn);
  meshIn.position.set(x - half / 2, y, z);
  renderer.scene.add(meshIn);

  const geomOut = new THREE.BoxGeometry(half, 0.01, depth);
  const matOut = new THREE.MeshBasicMaterial({ color: colorOut });
  const meshOut = new THREE.Mesh(geomOut, matOut);
  meshOut.position.set(x + half / 2, y, z);
  renderer.scene.add(meshOut);

  return {
    dispose() {
      renderer.scene.remove(meshIn);
      renderer.scene.remove(meshOut);
      geomIn.dispose();
      geomOut.dispose();
      matIn.dispose();
      matOut.dispose();
    },
  };
}
