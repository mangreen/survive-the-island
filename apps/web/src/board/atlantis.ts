/** 畫棋盤用的資料。棋盤幾何本身在規則套件，這裡只加上和畫面有關的部分。 */
import { SAFE_ISLES, SERPENT_STARTS, hexKey, type Hex } from '@sti/rules';

export {
  CELLS,
  ISLAND_CELLS,
  SAFE_ISLES,
  SERPENT_STARTS,
  TERRAIN_COUNTS,
  hexKey,
  type Hex,
  type Terrain,
} from '@sti/rules';

/** 棧橋畫在每座安全島沒有海蛇的那一格（順序同 SAFE_ISLES） */
export const PIERS: readonly Hex[] = SAFE_ISLES.map((docks) =>
  docks.find((dock) => !SERPENT_STARTS.some((s) => hexKey(s) === hexKey(dock)))!,
);

/** 世界座標：六角格寬度為 2，x 向右、z 向下（靠近鏡頭） */
export const HEX_RADIUS = 2 / Math.sqrt(3);
export const toWorld = ({ c, r }: Hex): { x: number; z: number } => ({
  x: c,
  z: r * Math.sqrt(3),
});
