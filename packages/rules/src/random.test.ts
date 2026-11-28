import { describe, expect, it } from 'vitest';
import { createRandom, type Seed } from './random';

const take = (seed: Seed, count: number) => {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random.int(1000));
};

describe('規則用亂數', () => {
  it('ENG-2：同一個種子得到同一串結果', () => {
    expect(take([1, 2, 3, 4], 20)).toEqual(take([1, 2, 3, 4], 20));
  });

  it('ENG-6：128 位元的每一段都會影響結果', () => {
    const base = take([1, 2, 3, 4], 20);
    for (const seed of [
      [9, 2, 3, 4],
      [1, 9, 3, 4],
      [1, 2, 9, 4],
      [1, 2, 3, 9],
    ] as const) {
      expect(take(seed, 20)).not.toEqual(base);
    }
  });

  it('從存下的狀態接續，等於一路跑下去', () => {
    const whole = createRandom([5, 6, 7, 8]);
    const first = [whole.int(100), whole.int(100)];
    const resumed = createRandom([5, 6, 7, 8]);
    resumed.int(100);
    resumed.int(100);
    const continued = createRandom.resume(resumed.state());
    expect(first).toHaveLength(2);
    expect(continued.int(100)).toBe(whole.int(100));
  });

  it.each([[[1, 2, 3]], [[1, 2, 3, -1]], [[1, 2, 3, 2 ** 32]], [[1, 2, 3, 0.5]]])(
    'ENG-6：拒絕不是四個 32 位元整數的種子 %j',
    (seed) => {
      expect(() => createRandom(seed as unknown as Seed)).toThrow();
    },
  );

  it('int(n) 落在 0 到 n-1，而且大致平均', () => {
    const random = createRandom([11, 22, 33, 44]);
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5000; i++) counts[random.int(5)]!++;
    expect(counts).toHaveLength(5);
    for (const count of counts) expect(Math.abs(count - 1000)).toBeLessThan(120);
  });

  it('洗牌不改原陣列，內容不增不減', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = createRandom([1, 1, 1, 1]).shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual(items);
  });
});
