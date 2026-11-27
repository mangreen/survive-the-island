/**
 * 原型用的示範擺法，只為了看畫面和量效能，不是規則。
 * 真正的開局由 M1 的規則引擎決定。
 */
import {
  CELLS,
  ISLAND_CELLS,
  SAFE_ISLES,
  SERPENT_STARTS,
  TERRAIN_COUNTS,
  hexKey,
  toWorld,
  type Hex,
  type Terrain,
} from '../board/atlantis';
import { createRng, type Rng } from '../paper/random';

/** start：接近開局的數量；full：所有棋子都上場的壓力情境（不是合法盤面） */
export type Load = 'start' | 'full';

export interface DemoLayout {
  readonly tiles: readonly { hex: Hex; terrain: Terrain }[];
  /** player 為 0 起算的玩家編號；onTile 表示站在板塊上，否則漂在海面 */
  readonly explorers: readonly { hex: Hex; player: number; onTile: boolean }[];
  readonly boats: readonly Hex[];
  readonly serpents: readonly Hex[];
  readonly sharks: readonly Hex[];
  readonly whales: readonly Hex[];
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function demoLayout(load: Load, seed: number): DemoLayout {
  const rng = createRng(seed);
  const terrains = shuffle(
    (Object.entries(TERRAIN_COUNTS) as [Terrain, number][]).flatMap(([terrain, count]) =>
      Array<Terrain>(count).fill(terrain),
    ),
    rng,
  );
  const tiles = ISLAND_CELLS.map((hex, i) => ({ hex, terrain: terrains[i]! }));

  const reserved = new Set([...ISLAND_CELLS, ...SERPENT_STARTS, ...SAFE_ISLES.flat()].map(hexKey));
  const sea = shuffle(
    CELLS.filter((hex) => !reserved.has(hexKey(hex))),
    rng,
  );
  // 船優先擺在靠近島嶼的海面
  const distance = (hex: Hex) => Math.hypot(toWorld(hex).x, toWorld(hex).z);
  const boatCount = load === 'full' ? 12 : 8;
  const boats = [...sea].sort((a, b) => distance(a) - distance(b)).slice(0, boatCount);
  const used = new Set(boats.map(hexKey));
  const open = sea.filter((hex) => !used.has(hexKey(hex)));
  const take = (count: number) => open.splice(0, count);

  const playerCount = load === 'full' ? 6 : 4;
  const explorers = shuffle(ISLAND_CELLS, rng).map((hex, i) => ({
    hex,
    player: i % playerCount,
    onTile: true,
  }));
  if (load === 'full') {
    explorers.push(...take(20).map((hex, i) => ({ hex, player: i % playerCount, onTile: false })));
  }

  return {
    tiles,
    explorers,
    boats,
    serpents: [...SERPENT_STARTS],
    sharks: load === 'full' ? take(6) : [],
    whales: load === 'full' ? take(5) : [],
  };
}
