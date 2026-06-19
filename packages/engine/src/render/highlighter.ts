import * as THREE from 'three';
import { cellToWorld } from '../ecs/grid.js';
import type { GridCoord } from '../ecs/grid.js';
import type { Renderer } from './renderer.js';

export interface HighlighterOptions {
  cellSize: number;
  /** Highlight colour. Defaults to semi-transparent yellow (#ffff00 @ 50%). */
  color?: number;
  /** Opacity 0–1. Defaults to 0.5. */
  opacity?: number;
}

/**
 * A single-cell hover highlight that can be repositioned over the grid.
 *
 * Rendered as an unlit quad at y ≈ 0.01 above the floor to prevent
 * z-fighting.  Initially hidden; call {@link Highlighter.moveTo} to
 * show it, {@link Highlighter.hide} to hide it again.
 */
export class Highlighter {
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly cellSize: number;

  constructor(renderer: Renderer, opts: HighlighterOptions) {
    const { cellSize, color = 0xffff00, opacity = 0.5 } = opts;
    this.cellSize = cellSize;

    this.geometry = new THREE.PlaneGeometry(cellSize * 0.95, cellSize * 0.95);
    this.material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Rotate from XY (default) to XZ plane
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.01; // just above floor
    this.mesh.visible = false;

    renderer.scene.add(this.mesh);
  }

  /**
   * Move the highlight to the given cell and make it visible.
   * Uses {@link cellToWorld} so it stays consistent with the grid math.
   */
  moveTo(coord: GridCoord): void {
    const { x, z } = cellToWorld(coord.col, coord.row, this.cellSize);
    this.mesh.position.x = x;
    this.mesh.position.z = z;
    this.mesh.visible = true;
  }

  /** Hide the highlight without disposing it. */
  hide(): void {
    this.mesh.visible = false;
  }

  /** Remove from scene and free GPU memory. */
  dispose(): void {
    this.mesh.parent?.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
