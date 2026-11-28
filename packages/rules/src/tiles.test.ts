import { describe, expect, it } from 'vitest';
import { TERRAINS, TERRAIN_COUNTS } from './board';
import { createRandom } from './random';
import { CLASSIC_BACKS, TILE_KINDS, allocateBacks, type BackCounts } from './tiles';

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const sample = (index: number) => allocateBacks('bounded', createRandom([index, 7, 7, 7]));

describe('板塊背面', () => {
  it('PART-4：原版分配每種地形的片數正確，共 40 片', () => {
    for (const terrain of TERRAINS) {
      expect(sum(Object.values(CLASSIC_BACKS[terrain]))).toBe(TERRAIN_COUNTS[terrain]);
    }
    const total = (kind: (typeof TILE_KINDS)[number]) =>
      sum(TERRAINS.map((terrain) => CLASSIC_BACKS[terrain][kind]));
    expect(Object.fromEntries(TILE_KINDS.map((kind) => [kind, total(kind)]))).toEqual({
      shark: 6,
      whale: 5,
      boat: 4,
      whirlpool: 6,
      volcano: 1,
      dolphin: 4,
      boatMove: 2,
      serpentDive: 2,
      whaleDive: 2,
      sharkDive: 2,
      sharkDefense: 3,
      whaleDefense: 3,
    });
  });

  it('ROOM-2：原版固定照表', () => {
    expect(allocateBacks('classic', createRandom([1, 2, 3, 4]))).toEqual(CLASSIC_BACKS);
  });

  it('ROOM-1：限制內隨機的四條限制在大量抽樣下都成立', () => {
    for (let i = 0; i < 500; i++) {
      const backs: BackCounts = sample(i);
      for (const terrain of TERRAINS) {
        expect(sum(Object.values(backs[terrain]))).toBe(TERRAIN_COUNTS[terrain]);
        for (const kind of TILE_KINDS) {
          expect(backs[terrain][kind]).toBeGreaterThanOrEqual(0);
          expect(Math.abs(backs[terrain][kind] - CLASSIC_BACKS[terrain][kind])).toBeLessThanOrEqual(
            1,
          );
        }
      }
      for (const kind of TILE_KINDS) {
        expect(sum(TERRAINS.map((t) => backs[t][kind]))).toBe(
          sum(TERRAINS.map((t) => CLASSIC_BACKS[t][kind])),
        );
      }
      expect(backs.mountain.volcano).toBe(1);
      expect(backs.beach.whirlpool).toBeLessThanOrEqual(1);
    }
  });

  it('ROOM-1：每種允許的數量都抽得到，不會只停在原版附近', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const backs = sample(i);
      for (const terrain of TERRAINS) {
        for (const kind of TILE_KINDS) {
          seen.add(`${terrain}:${kind}:${backs[terrain][kind] - CLASSIC_BACKS[terrain][kind]}`);
        }
      }
    }
    for (const entry of [
      'beach:shark:-1',
      'beach:shark:1',
      'mountain:whale:1',
      'beach:whirlpool:1',
    ]) {
      expect(seen).toContain(entry);
    }
  });
});
