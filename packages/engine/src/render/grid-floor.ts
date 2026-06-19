import * as THREE from 'three';
import type { Renderer } from './renderer.js';

export interface GridFloorOptions {
  cols: number;
  rows: number;
  cellSize: number;
  /** Base colour of the floor plane. Defaults to a dark grey (#1a1a1a). */
  color?: number;
  /** Colour of the grid lines. Defaults to mid-grey (#444444). */
  lineColor?: number;
}

/** Handle returned by {@link createGridFloor}. Call `.dispose()` to remove from scene. */
export interface GridFloor {
  dispose(): void;
}

/**
 * Add a flat grid floor to the renderer's scene.
 *
 * Uses unlit materials (MeshBasicMaterial) — no lights are required in M1.
 * Cell (0,0) corner sits at world origin; columns run +X, rows run +Z,
 * matching {@link cellToWorld} / {@link worldToCell} conventions.
 * Works correctly for non-square grids (cols !== rows).
 *
 * @returns A dispose handle that removes the floor and frees GPU memory.
 */
export function createGridFloor(renderer: Renderer, opts: GridFloorOptions): GridFloor {
  const { cols, rows, cellSize, color = 0x1a1a1a, lineColor = 0x444444 } = opts;

  const totalW = cols * cellSize;
  const totalD = rows * cellSize;

  // ── Floor plane ──────────────────────────────────────────────────────────
  const planeGeo = new THREE.PlaneGeometry(totalW, totalD);
  const planeMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  // PlaneGeometry lies in XY by default; rotate to XZ.
  planeMesh.rotation.x = -Math.PI / 2;
  // Shift so the (0,0) corner aligns with world origin.
  planeMesh.position.set(totalW / 2, 0, totalD / 2);

  // ── Grid lines as LineSegments ────────────────────────────────────────────
  // Build vertex pairs manually so non-square (cols !== rows) grids work.
  const verts: number[] = [];
  const LINE_Y = 0.002; // just above the floor plane to avoid z-fighting

  // Lines parallel to Z axis (one per column boundary, i.e. cols+1 lines)
  for (let c = 0; c <= cols; c++) {
    const x = c * cellSize;
    verts.push(x, LINE_Y, 0, x, LINE_Y, totalD);
  }
  // Lines parallel to X axis (one per row boundary, i.e. rows+1 lines)
  for (let r = 0; r <= rows; r++) {
    const z = r * cellSize;
    verts.push(0, LINE_Y, z, totalW, LINE_Y, z);
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: lineColor });
  const lines = new THREE.LineSegments(lineGeo, lineMat);

  renderer.scene.add(planeMesh, lines);

  return {
    dispose(): void {
      renderer.scene.remove(planeMesh, lines);
      planeGeo.dispose();
      planeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    },
  };
}
