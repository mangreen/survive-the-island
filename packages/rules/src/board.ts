/**
 * Atlantis 棋盤幾何（尖頂六角格，倍寬座標：同列相鄰差 c±2，鄰列差 c±1、r±1）。
 * 依棋盤實物照片比對；照片是第三方素材，不收進 repo。
 */
export interface Hex {
  readonly c: number;
  readonly r: number;
}

/** 格子的字串代號 `c,r`；狀態、動作和事件都用它指格子 */
export type CellKey = string;

/** 每一列（以 |r| 索引）最外側的 |c| */
const ROW_HALF_WIDTH = [10, 11, 10, 9, 10, 9, 6] as const;

const ISLAND_COLUMNS: Readonly<Record<number, readonly number[]>> = {
  0: [2, 4, 6],
  1: [1, 3, 5, 7],
  2: [0, 2, 4],
  3: [1, 3],
};

export const hexKey = ({ c, r }: Hex): CellKey => `${c},${r}`;

export const CELLS: readonly Hex[] = ROW_HALF_WIDTH.flatMap((_, row) =>
  (row === 0 ? [0] : [-row, row]).flatMap((r) => rowCells(r)),
).sort((a, b) => a.r - b.r || a.c - b.c);

function rowCells(r: number): Hex[] {
  const half = ROW_HALF_WIDTH[Math.abs(r)] ?? 0;
  const cells: Hex[] = [];
  for (let c = -half; c <= half; c += 2) cells.push({ c, r });
  return cells;
}

const NEIGHBOR_OFFSETS = [
  [-2, 0],
  [2, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

const NEIGHBORS: ReadonlyMap<CellKey, readonly CellKey[]> = (() => {
  const onBoard = new Set(CELLS.map(hexKey));
  return new Map(
    CELLS.map(({ c, r }) => [
      hexKey({ c, r }),
      NEIGHBOR_OFFSETS.map(([dc, dr]) => hexKey({ c: c + dc, r: r + dr })).filter((key) =>
        onBoard.has(key),
      ),
    ]),
  );
})();

export const isCell = (key: CellKey): boolean => NEIGHBORS.has(key);

export const neighbors = (key: CellKey): readonly CellKey[] => NEIGHBORS.get(key) ?? [];

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

export type Terrain = 'beach' | 'forest' | 'mountain';

/** 沉沒順序 */
export const TERRAINS: readonly Terrain[] = ['beach', 'forest', 'mountain'];

export const TERRAIN_COUNTS: Readonly<Record<Terrain, number>> = {
  beach: 16,
  forest: 16,
  mountain: 8,
};
