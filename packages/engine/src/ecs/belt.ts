/**
 * Belt direction — pure domain, no Three.js dependency.
 *
 * Grid convention: col increases along +X (east), row increases along +Z (south).
 */
export type BeltDirection = 'north' | 'east' | 'south' | 'west';

const CW_NEXT: Record<BeltDirection, BeltDirection> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};

/** Return the direction obtained by rotating 90° clockwise (viewed from above). */
export function rotateCW(dir: BeltDirection): BeltDirection {
  return CW_NEXT[dir];
}

/**
 * Y-axis rotation (radians) to apply to a mesh whose base geometry points toward +Z (south).
 *
 * Derivation: rotation.y θ maps local +Z to world (sin θ, 0, cos θ).
 * - south (+Z): θ = 0
 * - east  (+X): θ = π/2
 * - north (−Z): θ = π
 * - west  (−X): θ = −π/2
 */
export function directionToRadians(dir: BeltDirection): number {
  switch (dir) {
    case 'south': return 0;
    case 'east':  return Math.PI / 2;
    case 'north': return Math.PI;
    case 'west':  return -Math.PI / 2;
  }
}

/** Grid-cell step for one hop in the given direction (col increases +X/east, row increases +Z/south). */
export function directionToDelta(dir: BeltDirection): { dcol: number; drow: number } {
  switch (dir) {
    case 'east':  return { dcol:  1, drow:  0 };
    case 'west':  return { dcol: -1, drow:  0 };
    case 'south': return { dcol:  0, drow:  1 };
    case 'north': return { dcol:  0, drow: -1 };
  }
}
