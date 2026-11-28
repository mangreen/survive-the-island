import { describe, expect, it } from 'vitest';
import { CELLS, hexKey, toWorld, type Hex } from '../board/atlantis';
import { MASK_HALF, MASK_SIZE, createStrengthData } from './strengthMap';

/** 世界座標 (x, z) 的紙紋強度（0–1），取最近的取樣點 */
function sample(data: Uint8Array, x: number, z: number): number {
  const index = (v: number) => Math.floor(((v + MASK_HALF) / (MASK_HALF * 2)) * MASK_SIZE);
  return data[index(z) * MASK_SIZE + index(x)]! / 255;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const deviation = (values: number[]) => Math.sqrt(mean(values.map((v) => (v - mean(values)) ** 2)));

/** 每三格放一個東西，空格和有東西的格子交錯 */
const occupied = new Set(CELLS.filter((_, i) => i % 3 === 0).map(hexKey));
const data = createStrengthData(CELLS, occupied);
const centers = (hexes: readonly Hex[]) =>
  hexes.map((hex) => sample(data, toWorld(hex).x, toWorld(hex).z));
const full = centers(CELLS.filter((hex) => occupied.has(hexKey(hex))));
const empty = centers(CELLS.filter((hex) => !occupied.has(hexKey(hex))));

describe('紙紋濃淡分布', () => {
  it('有東西的格子接近完整強度，空格子較淡', () => {
    expect(mean(full)).toBeGreaterThanOrEqual(0.8);
    expect(mean(empty)).toBeLessThanOrEqual(0.68);
    expect(mean(full) - mean(empty)).toBeGreaterThanOrEqual(0.22);
  });

  it('空格子仍然看得到紋理，整片平均偏向完整強度', () => {
    expect(Math.min(...data) / 255).toBeGreaterThanOrEqual(0.45);
    expect(mean(empty)).toBeGreaterThanOrEqual(0.52);
    expect(mean([...data]) / 255).toBeGreaterThanOrEqual(0.75);
  });

  it('棋盤外不能移動的地方維持濃紋理，貼圖邊緣固定為完整強度', () => {
    expect(sample(data, 0, 14)).toBeGreaterThanOrEqual(0.8);
    expect(sample(data, -14.5, 0)).toBeGreaterThanOrEqual(0.8);
    // 超出貼圖的地方會沿用邊緣值，邊緣不一致就會拉出條紋
    for (let i = 0; i < MASK_SIZE; i++) {
      for (const at of [
        i,
        (MASK_SIZE - 1) * MASK_SIZE + i,
        i * MASK_SIZE,
        i * MASK_SIZE + MASK_SIZE - 1,
      ]) {
        expect(data[at]).toBe(255);
      }
    }
  });

  it('同一類格子之間也有自然的深淺變化', () => {
    expect(deviation(empty)).toBeGreaterThan(0.02);
    expect(deviation(full)).toBeGreaterThan(0.02);
  });

  it('濃淡之間是漸變，沒有硬邊', () => {
    let steepest = 0;
    for (let y = 0; y < MASK_SIZE - 1; y++) {
      for (let x = 0; x < MASK_SIZE - 1; x++) {
        const here = data[y * MASK_SIZE + x]!;
        steepest = Math.max(
          steepest,
          Math.abs(here - data[y * MASK_SIZE + x + 1]!),
          Math.abs(here - data[(y + 1) * MASK_SIZE + x]!),
        );
      }
    }
    expect(steepest).toBeLessThan(28);
  });

  it('交界不是整齊的六角形', () => {
    // 只有一格有東西，往四周量出濃紋理延伸到多遠；正六角形各方向只差約 0.15
    const lone: Hex = { c: 0, r: 0 };
    const single = createStrengthData(CELLS, new Set([hexKey(lone)]));
    const reach = Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2;
      let radius = 0;
      while (
        radius < 2.5 &&
        sample(single, Math.cos(angle) * radius, Math.sin(angle) * radius) > 0.74
      )
        radius += 0.05;
      return radius;
    });
    expect(Math.min(...reach)).toBeGreaterThan(0.3);
    expect(Math.max(...reach)).toBeLessThan(2.2);
    expect(Math.max(...reach) - Math.min(...reach)).toBeGreaterThan(0.35);
  });

  it('同樣的盤面得到同樣的結果，東西移走後那一格變淡', () => {
    expect(createStrengthData(CELLS, occupied)).toEqual(data);
    const hex = CELLS.find((cell) => cell.c === 0 && cell.r === 0)!;
    const before = createStrengthData(CELLS, new Set([hexKey(hex)]));
    const after = createStrengthData(CELLS, new Set());
    expect(sample(before, 0, 0) - sample(after, 0, 0)).toBeGreaterThanOrEqual(0.25);
  });
});
