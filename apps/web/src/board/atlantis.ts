/**
 * Atlantis 棋盤幾何（尖頂六角格，倍寬座標：同列相鄰差 c±2，鄰列差 c±1、r±1）。
 * 依棋盤實物照片比對；照片是第三方素材，不收進 repo。
 * M1 建立規則套件時移過去。
 */
export interface Hex {
  readonly c: number;
  readonly r: number;
}

/** 每一列（以 |r| 索引）最外側的 |c| */
const ROW_HALF_WIDTH = [10, 11, 10, 9, 10, 9, 6] as const;

const ISLAND_COLUMNS: Readonly<Record<number, readonly number[]>> = {
  0: [2, 4, 6],
  1: [1, 3, 5, 7],
  2: [0, 2, 4],
  3: [1, 3],
};

export const hexKey = ({ c, r }: Hex): string => `${c},${r}`;

export const CELLS: readonly Hex[] = ROW_HALF_WIDTH.flatMap((_, row) =>
  (row === 0 ? [0] : [-row, row]).flatMap((r) => rowCells(r)),
).sort((a, b) => a.r - b.r || a.c - b.c);

function rowCells(r: number): Hex[] {
  const half = ROW_HALF_WIDTH[Math.abs(r)] ?? 0;
  const cells: Hex[] = [];
  for (let c = -half; c <= half; c += 2) cells.push({ c, r });
  return cells;
}

/** 開局放島嶼板塊的 40 格；中央 (0,0) 是海 */
export const ISLAND_CELLS: readonly Hex[] = CELLS.filter(({ c, r }) =>
  ISLAND_COLUMNS[Math.abs(r)]?.includes(Math.abs(c)),
);

/** 四個安全島，各有 2 格可上岸 */
export const SAFE_ISLES: readonly (readonly [Hex, Hex])[] = (
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const
).map(([sx, sz]) => [
  { c: 9 * sx, r: 5 * sz },
  { c: 10 * sx, r: 4 * sz },
]);

/** 開局的 5 隻海蛇位置 */
export const SERPENT_STARTS: readonly Hex[] = [
  { c: -9, r: -5 },
  { c: 10, r: -4 },
  { c: -10, r: 4 },
  { c: 9, r: 5 },
  { c: 0, r: 0 },
];

/** 棧橋畫在每座安全島沒有海蛇的那一格（順序同 SAFE_ISLES） */
export const PIERS: readonly Hex[] = SAFE_ISLES.map((docks) =>
  docks.find((dock) => !SERPENT_STARTS.some((s) => hexKey(s) === hexKey(dock)))!,
);

export type Terrain = 'beach' | 'forest' | 'mountain';

export const TERRAIN_COUNTS: Readonly<Record<Terrain, number>> = {
  beach: 16,
  forest: 16,
  mountain: 8,
};

/** 世界座標：六角格寬度為 2，x 向右、z 向下（靠近鏡頭） */
export const HEX_RADIUS = 2 / Math.sqrt(3);
export const toWorld = ({ c, r }: Hex): { x: number; z: number } => ({
  x: c,
  z: r * Math.sqrt(3),
});
