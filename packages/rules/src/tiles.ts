/** 板塊背面的內容與分配。 */
import { TERRAINS, type Terrain } from './board';
import type { Random } from './random';

export const TILE_KINDS = [
  'shark',
  'whale',
  'boat',
  'whirlpool',
  'volcano',
  'dolphin',
  'boatMove',
  'serpentDive',
  'whaleDive',
  'sharkDive',
  'sharkDefense',
  'whaleDefense',
] as const;

export type TileKind = (typeof TILE_KINDS)[number];

export type BackCounts = Readonly<Record<Terrain, Readonly<Record<TileKind, number>>>>;

export type TileBacksMode = 'bounded' | 'classic';

/** 依 TILE_KINDS 的順序列出各地形的片數 */
const row = (...counts: number[]): Record<TileKind, number> =>
  Object.fromEntries(TILE_KINDS.map((kind, i) => [kind, counts[i]!])) as Record<TileKind, number>;

export const CLASSIC_BACKS: BackCounts = {
  beach: row(3, 3, 1, 0, 0, 3, 2, 1, 1, 1, 1, 0),
  forest: row(2, 2, 3, 2, 0, 1, 0, 1, 1, 1, 1, 2),
  mountain: row(1, 0, 0, 4, 1, 0, 0, 0, 0, 0, 1, 1),
};

/** 交換次數遠大於可能的偏移量，結果和原版起點無關 */
const SHUFFLE_STEPS = 4000;

/**
 * 限制內隨機：反覆提議「兩種地形各交換一片不同內容」，不合限制就放棄。
 * 交換保持每種地形的片數和每種內容的總數。提議是對稱的，走得夠久就接近在合法分配中均勻抽樣。
 */
function boundedCounts(random: Random): BackCounts {
  const counts = structuredCounts(CLASSIC_BACKS);
  const allowed = (terrain: Terrain, kind: TileKind, value: number) =>
    value >= 0 &&
    Math.abs(value - CLASSIC_BACKS[terrain][kind]) <= 1 &&
    !(terrain === 'beach' && kind === 'whirlpool' && value > 1);
  // 火山固定在山，不參與交換
  const movable = TILE_KINDS.filter((kind) => kind !== 'volcano');

  for (let step = 0; step < SHUFFLE_STEPS; step++) {
    const a = TERRAINS[random.int(TERRAINS.length)]!;
    const b = TERRAINS[random.int(TERRAINS.length)]!;
    const x = movable[random.int(movable.length)]!;
    const y = movable[random.int(movable.length)]!;
    if (a === b || x === y) continue;
    // x 從 a 到 b，y 從 b 到 a
    const changes = [
      [a, x, -1],
      [b, x, 1],
      [b, y, -1],
      [a, y, 1],
    ] as const;
    if (changes.every(([t, k, delta]) => allowed(t, k, counts[t][k] + delta))) {
      for (const [t, k, delta] of changes) counts[t][k] += delta;
    }
  }
  return counts;
}

function structuredCounts(source: BackCounts): Record<Terrain, Record<TileKind, number>> {
  return {
    beach: { ...source.beach },
    forest: { ...source.forest },
    mountain: { ...source.mountain },
  };
}

export function allocateBacks(mode: TileBacksMode, random: Random): BackCounts {
  return mode === 'classic' ? CLASSIC_BACKS : boundedCounts(random);
}
