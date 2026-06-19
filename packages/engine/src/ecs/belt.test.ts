import { describe, it, expect } from 'vitest';
import { rotateCW, directionToRadians } from './belt.js';
import type { BeltDirection } from './belt.js';

describe('rotateCW', () => {
  it('cycles through all four directions and returns to the start', () => {
    const start: BeltDirection = 'north';
    expect(rotateCW(start)).toBe('east');
    expect(rotateCW('east')).toBe('south');
    expect(rotateCW('south')).toBe('west');
    expect(rotateCW('west')).toBe('north');
  });

  it('returns to the original direction after 4 rotations', () => {
    const dirs: BeltDirection[] = ['north', 'east', 'south', 'west'];
    for (const start of dirs) {
      let d = start;
      for (let i = 0; i < 4; i++) d = rotateCW(d);
      expect(d).toBe(start);
    }
  });
});

describe('directionToRadians', () => {
  it('south maps to 0', () => {
    expect(directionToRadians('south')).toBe(0);
  });

  it('east maps to π/2', () => {
    expect(directionToRadians('east')).toBeCloseTo(Math.PI / 2);
  });

  it('north maps to π', () => {
    expect(directionToRadians('north')).toBeCloseTo(Math.PI);
  });

  it('west maps to −π/2', () => {
    expect(directionToRadians('west')).toBeCloseTo(-Math.PI / 2);
  });

  it('each cardinal direction yields a distinct angle', () => {
    const angles = ['north', 'east', 'south', 'west'].map((d) =>
      directionToRadians(d as BeltDirection),
    );
    const unique = new Set(angles.map((a) => Math.round(a * 1000)));
    expect(unique.size).toBe(4);
  });
});
