import { describe, expect, it } from 'vitest';
import { hexKey } from '../board/atlantis';
import { demoLayout } from './demoLayout';

describe('demoLayout', () => {
  it('同一個種子得到同樣的擺法', () => {
    expect(demoLayout('full', 3)).toEqual(demoLayout('full', 3));
  });

  it('40 片板塊的地形數量固定，位置隨種子改變', () => {
    const a = demoLayout('start', 1);
    const b = demoLayout('start', 2);
    for (const layout of [a, b]) {
      const count = (terrain: string) => layout.tiles.filter((x) => x.terrain === terrain).length;
      expect([count('beach'), count('forest'), count('mountain')]).toEqual([16, 16, 8]);
    }
    expect(a.tiles).not.toEqual(b.tiles);
  });

  it('壓力情境擺滿全部棋子，海上物件不重疊', () => {
    const layout = demoLayout('full', 5);
    expect(layout.explorers).toHaveLength(60);
    expect([
      layout.boats.length,
      layout.serpents.length,
      layout.sharks.length,
      layout.whales.length,
    ]).toEqual([12, 5, 6, 5]);
    const occupied = [
      ...layout.boats,
      ...layout.serpents,
      ...layout.sharks,
      ...layout.whales,
      ...layout.explorers.filter((x) => !x.onTile).map((x) => x.hex),
    ].map(hexKey);
    expect(new Set(occupied).size).toBe(occupied.length);
  });
});
