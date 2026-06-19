import * as THREE from 'three';
import type { Renderer } from './renderer.js';

export interface IsometricViewOptions {
  cols: number;
  rows: number;
  cellSize: number;
  /**
   * Camera distance scalar.  The camera is placed at
   * `distance` units away from the board centre along the iso diagonal.
   * Defaults to `Math.max(cols, rows) * cellSize * 1.2` so the whole board
   * fits inside the default 60° FOV.
   */
  distance?: number;
}

/**
 * Position the renderer's PerspectiveCamera at a classic isometric-style
 * angle above the grid and make it look at the board centre.
 *
 * The camera sits at equal X and Z offsets above the board centre at a
 * 45° yaw and ~35° pitch — matching the ISO 5:4 screen ratio convention.
 * The board centre is at `(cols*cellSize/2, 0, rows*cellSize/2)`.
 *
 * This mutates `renderer.camera` in place; the existing `Renderer.resize()`
 * continues to manage the aspect ratio automatically.
 */
export function setIsometricView(renderer: Renderer, opts: IsometricViewOptions): void {
  const { cols, rows, cellSize } = opts;

  const totalW = cols * cellSize;
  const totalD = rows * cellSize;
  const dist = opts.distance ?? Math.max(totalW, totalD) * 1.2;

  // Board centre on XZ plane
  const center = new THREE.Vector3(totalW / 2, 0, totalD / 2);

  // Iso offset: equal X and Z distance, elevated to ~35° above horizon.
  // Using the 1:1:1 diagonal gives a ~35.26° elevation angle.
  const offset = new THREE.Vector3(dist, dist, dist);

  renderer.camera.position.copy(center).add(offset);
  renderer.camera.lookAt(center);
  renderer.camera.updateProjectionMatrix();
}
