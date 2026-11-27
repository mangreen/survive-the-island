import { describe, expect, it } from 'vitest';
import {
  CELLS,
  ISLAND_CELLS,
  SAFE_ISLES,
  SERPENT_STARTS,
  TERRAIN_COUNTS,
  hexKey,
  toWorld,
} from './atlantis';

const keys = new Set(CELLS.map(hexKey));

describe('Atlantis 棋盤', () => {
  it('共 133 格、沒有重複，且符合倍寬座標的奇偶規則', () => {
    expect(CELLS).toHaveLength(133);
    expect(keys.size).toBe(133);
    expect(CELLS.every(({ c, r }) => Math.abs(c - r) % 2 === 0)).toBe(true);
  });

  it('左右、上下對稱', () => {
    for (const { c, r } of CELLS) {
      expect(keys.has(hexKey({ c: -c, r }))).toBe(true);
      expect(keys.has(hexKey({ c, r: -r }))).toBe(true);
    }
  });

  it('島嶼 40 格，對應 16 沙灘、16 森林、8 山地，中央是海', () => {
    expect(ISLAND_CELLS).toHaveLength(40);
    expect(Object.values(TERRAIN_COUNTS).reduce((a, b) => a + b)).toBe(40);
    expect(ISLAND_CELLS.map(hexKey)).not.toContain('0,0');
  });

  it('安全島與海蛇起點都在棋盤上，且不在島嶼上', () => {
    const island = new Set(ISLAND_CELLS.map(hexKey));
    for (const hex of [...SAFE_ISLES.flat(), ...SERPENT_STARTS]) {
      expect(keys.has(hexKey(hex))).toBe(true);
      expect(island.has(hexKey(hex))).toBe(false);
    }
  });

  it('相鄰格的中心距離一致', () => {
    const origin = toWorld({ c: 0, r: 0 });
    for (const neighbour of [
      { c: 2, r: 0 },
      { c: 1, r: 1 },
      { c: -1, r: -1 },
    ]) {
      const p = toWorld(neighbour);
      expect(Math.hypot(p.x - origin.x, p.z - origin.z)).toBeCloseTo(2);
    }
  });
});
