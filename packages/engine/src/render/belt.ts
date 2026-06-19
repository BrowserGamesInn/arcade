import * as THREE from 'three';
import { cellToWorld } from '../ecs/grid.js';
import { directionToRadians } from '../ecs/belt.js';
import type { BeltDirection } from '../ecs/belt.js';
import type { Renderer } from './renderer.js';

export interface BeltTileOptions {
  col: number;
  row: number;
  direction: BeltDirection;
  cellSize: number;
  /** Fill colour. Defaults to a warm conveyor grey (#888866). */
  color?: number;
}

/** Handle returned by {@link createBeltTile}. */
export interface BeltTile {
  /** The direction the belt currently faces. */
  readonly direction: BeltDirection;
  /** Rotate the belt tile in place to face a new direction. */
  setDirection(d: BeltDirection): void;
  /** Remove from scene and free GPU memory. */
  dispose(): void;
}

/**
 * Add an asymmetric arrow (home-plate pentagon) tile to the renderer's scene.
 *
 * The base geometry points toward +Z (south); {@link directionToRadians} maps each
 * {@link BeltDirection} to the correct Y-axis rotation so the arrowhead encodes direction.
 *
 * Layering (Y heights): floor=0, grid-lines=0.002, belt-tiles=0.005, highlighter=0.01.
 */
export function createBeltTile(renderer: Renderer, opts: BeltTileOptions): BeltTile {
  const { col, row, cellSize, color = 0x888866 } = opts;
  let currentDirection: BeltDirection = opts.direction;

  // ── Asymmetric pentagon geometry (XZ plane, pointing toward +Z) ──────────
  const s = cellSize * 0.9;   // tile footprint
  const h = s / 2;            // half-size
  const sh = s * 0.15;        // shoulder inset from tip (z = h - sh)

  // 5 vertices of the home-plate arrow, laid directly in XZ (y = 0 in local space):
  // 0: bottom-left, 1: left-shoulder, 2: tip (+Z), 3: right-shoulder, 4: bottom-right
  const verts = new Float32Array([
    -h, 0, -h,       // 0 bottom-left
    -h, 0,  h - sh,  // 1 left-shoulder
     0, 0,  h,       // 2 tip (pointing +Z)
     h, 0,  h - sh,  // 3 right-shoulder
     h, 0, -h,       // 4 bottom-right
  ]);

  // Fan triangulation from vertex 0 (convex polygon, CCW from +Y = front face up)
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);

  // Position at cell centre; sit just above the grid lines (y=0.005)
  const { x, z } = cellToWorld(col, row, cellSize);
  mesh.position.set(x, 0.005, z);
  mesh.rotation.y = directionToRadians(currentDirection);

  renderer.scene.add(mesh);

  return {
    get direction(): BeltDirection {
      return currentDirection;
    },
    setDirection(d: BeltDirection): void {
      currentDirection = d;
      mesh.rotation.y = directionToRadians(d);
    },
    dispose(): void {
      renderer.scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
