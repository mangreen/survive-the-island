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

/** 彩度與色相角（度） */
const chroma = (hex: string) => Math.hypot(oklab(hex)[1]!, oklab(hex)[2]!);
const hue = (hex: string) =>
  ((Math.atan2(oklab(hex)[2]!, oklab(hex)[1]!) * 180) / Math.PI + 360) % 360;

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

  it.each([
    ['海蛇背鰭的紅線', PALETTE.serpentStripe, 15, 35],
    ['鯨魚水柱的藍線', PALETTE.whaleStripe, 225, 270],
  ])('%s夠鮮豔，畫在白底上清楚', (_, stripe, hueFrom, hueTo) => {
    expect(chroma(stripe)).toBeGreaterThanOrEqual(0.18);
    expect(hue(stripe)).toBeGreaterThanOrEqual(hueFrom);
    expect(hue(stripe)).toBeLessThanOrEqual(hueTo);
    expect(distance(stripe, PALETTE.finWhite)).toBeGreaterThanOrEqual(35);
  });

  it('背鰭和水柱的白底在海面、身體上都跳得出來', () => {
    expect(closest(PALETTE.finWhite, SEA)).toBeGreaterThanOrEqual(30);
    expect(distance(PALETTE.finWhite, PALETTE.serpent)).toBeGreaterThanOrEqual(40);
    expect(distance(PALETTE.finWhite, PALETTE.whale)).toBeGreaterThanOrEqual(40);
  });

  it('鯊魚的反光是亮綠色，在灰綠皮膚上看得出來', () => {
    expect(chroma(PALETTE.sharkSheen)).toBeGreaterThanOrEqual(0.15);
    expect(hue(PALETTE.sharkSheen)).toBeGreaterThanOrEqual(125);
    expect(hue(PALETTE.sharkSheen)).toBeLessThanOrEqual(165);
    expect(distance(PALETTE.sharkSheen, PALETTE.shark)).toBeGreaterThanOrEqual(15);
    expect(distance(PALETTE.sharkSheen, PALETTE.sharkBack)).toBeGreaterThanOrEqual(25);
  });

  it('紅色人物不會跟海蛇混淆', () => {
    const red = PLAYER_COLORS[0];
    expect(distance(red, PALETTE.serpent)).toBeGreaterThanOrEqual(25);
    expect(distance(red, PALETTE.serpentStripe)).toBeGreaterThanOrEqual(14);
  });

  it('藍色人物不會跟鯨魚混淆', () => {
    const blue = PLAYER_COLORS[1];
    expect(distance(blue, PALETTE.whale)).toBeGreaterThanOrEqual(22);
    expect(distance(blue, PALETTE.finWhite)).toBeGreaterThanOrEqual(20);
  });

  it('紫色人物夠亮', () => {
    expect(oklab(PLAYER_COLORS[4])[0]).toBeGreaterThanOrEqual(0.6);
  });

  it('鯊魚是看得出綠色、但不鮮豔的灰綠', () => {
    // 彩度太低就只是灰色，太高就像玩具；OKLab 的綠色色相大約在 125 到 165 度
    expect(chroma(PALETTE.shark)).toBeGreaterThanOrEqual(0.035);
    expect(chroma(PALETTE.shark)).toBeLessThanOrEqual(0.07);
    expect(hue(PALETTE.shark)).toBeGreaterThanOrEqual(125);
    expect(hue(PALETTE.shark)).toBeLessThanOrEqual(165);
  });

  it('海蛇不會跟森林混在一起', () => {
    expect(closest(PALETTE.serpent, FOREST)).toBeGreaterThanOrEqual(20);
  });
});
