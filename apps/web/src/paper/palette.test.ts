/** 回歸：灰白人物看起來像停用、綠色人物和海蛇跟森林分不開。用 OKLab 色差把關。 */
import { describe, expect, it } from 'vitest';
import { PALETTE, PLAYER_COLORS } from './palette';

function oklab(hex: string): readonly number[] {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** 0 表示同色，黑白之間是 100 */
const distance = (a: string, b: string) =>
  100 * Math.hypot(...oklab(a).map((value, i) => value - oklab(b)[i]!));

const closest = (color: string, others: readonly string[]) =>
  Math.min(...others.map((other) => distance(color, other)));

const FOREST = [PALETTE.grass, PALETTE.leaf, PALETTE.leafDark];
const SEA = [PALETTE.sea, PALETTE.seaDeep];
/** 人物會站上去或漂在上面的底色 */
const GROUND = [...FOREST, ...SEA, PALETTE.sand, PALETTE.sandLight, PALETTE.rockLight];

describe('配色辨識度', () => {
  it('六位玩家彼此分得開', () => {
    PLAYER_COLORS.forEach((color, i) => {
      const others = PLAYER_COLORS.filter((_, j) => j !== i);
      expect(closest(color, others), color).toBeGreaterThanOrEqual(14);
    });
  });

  it.each([...PLAYER_COLORS])('玩家色 %s 和地面、海面分得開', (color) => {
    expect(closest(color, GROUND)).toBeGreaterThanOrEqual(11);
  });

  it('海上生物和海面分得開', () => {
    for (const color of [PALETTE.serpent, PALETTE.shark, PALETTE.whale]) {
      expect(closest(color, SEA), color).toBeGreaterThanOrEqual(14);
    }
  });

  it('海蛇不會跟森林混在一起', () => {
    expect(closest(PALETTE.serpent, FOREST)).toBeGreaterThanOrEqual(20);
  });
});
