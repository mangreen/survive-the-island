import { describe, expect, it } from 'vitest';
import { PALETTE } from './palette';
import { boat, explorer, shark, tile } from './pieces';
import { createRng } from './random';
import { SURFACES, createSurfaceData, type Surface } from './surfaces';

const SIZE = 512;
const data = createSurfaceData(SIZE);
const at = (channel: number, x: number, y: number) => data[(y * SIZE + x) * 4 + channel]!;

/** 相鄰兩行（或兩列）的平均亮度差 */
function step(channel: number, a: number, b: number, axis: 'x' | 'y'): number {
  let sum = 0;
  for (let i = 0; i < SIZE; i++) {
    sum +=
      axis === 'x'
        ? Math.abs(at(channel, a, i) - at(channel, b, i))
        : Math.abs(at(channel, i, a) - at(channel, i, b));
  }
  return sum / SIZE;
}

describe('地面紙紋', () => {
  it.each(SURFACES.map((name, channel) => [name, channel] as const))(
    '%s：平均亮度不變、看得出起伏、拼接沒有接縫',
    (_, channel) => {
      let sum = 0;
      let squares = 0;
      for (let i = channel; i < data.length; i += 4) {
        sum += data[i]!;
        squares += data[i]! ** 2;
      }
      const mean = sum / (SIZE * SIZE);
      expect(Math.abs(mean - 128)).toBeLessThan(3);
      const deviation = Math.sqrt(squares / (SIZE * SIZE) - mean ** 2);
      expect(deviation).toBeGreaterThan(25);
      expect(deviation).toBeLessThan(50);
      // 接縫處的落差不能超出貼圖內部相鄰兩行的正常範圍。沒接好的話兩行毫不相關，會高出很多
      for (const axis of ['x', 'y'] as const) {
        const inner = Array.from({ length: SIZE - 1 }, (_, i) => step(channel, i, i + 1, axis));
        inner.sort((a, b) => a - b);
        expect(step(channel, SIZE - 1, 0, axis)).toBeLessThan(inner[Math.floor(SIZE * 0.99)]!);
        // 對照組：隔半張貼圖的兩行互不相關，必須被判定為接縫
        expect(step(channel, SIZE / 2, 0, axis)).toBeGreaterThan(inner[Math.floor(SIZE * 0.99)]!);
      }
    },
  );

  it('每次產生的結果相同', () => {
    expect(createSurfaceData(64)).toEqual(createSurfaceData(64));
  });
});

/** 幾何裡用到了哪些紙紋 */
function used(geometry: ReturnType<typeof boat>): Surface[] {
  const attribute = geometry.getAttribute('surface');
  return SURFACES.filter((_, channel) => {
    for (let i = 0; i < attribute.count; i++) {
      if (attribute.getComponent(i, channel) > 0) return true;
    }
    return false;
  });
}

describe('紙紋標記', () => {
  const rng = createRng(3);

  it('各地形板塊用到對應的紙紋', () => {
    expect(used(tile('beach', rng))).toEqual(['sand']);
    expect(used(tile('forest', rng))).toEqual(['sand', 'grass']);
    expect(used(tile('mountain', rng))).toEqual(['sand', 'grass', 'rock']);
  });

  it('棋子和船維持素面，才能從地面跳出來', () => {
    expect(used(explorer(PALETTE.cream))).toEqual([]);
    expect(used(boat())).toEqual([]);
  });

  it('生物腳下的水面跟海用同一種紙紋', () => {
    expect(used(shark())).toEqual(['water']);
  });
});
