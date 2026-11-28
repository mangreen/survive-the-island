import { describe, expect, it } from 'vitest';
import { PIERS, SAFE_ISLES, SERPENT_STARTS, hexKey, toWorld } from './atlantis';

describe('棋盤畫面資料', () => {
  // 回歸：棧橋曾經和海蛇起點畫在同一格（左上、右下）
  it('每座安全島的兩格中，一格放海蛇、棧橋在另一格', () => {
    const serpents = new Set(SERPENT_STARTS.map(hexKey));
    SAFE_ISLES.forEach((docks, i) => {
      expect(docks.filter((hex) => serpents.has(hexKey(hex)))).toHaveLength(1);
      expect(docks.map(hexKey)).toContain(hexKey(PIERS[i]!));
      expect(serpents.has(hexKey(PIERS[i]!))).toBe(false);
    });
    // 依實物棋盤：左上、右上、左下、右下
    expect(PIERS.map(hexKey)).toEqual(['-10,-4', '9,-5', '-9,5', '10,4']);
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
