/** 開局：鋪地形、放人物、放船。 */
import {
  CELLS,
  ISLAND_CELLS,
  SERPENT_STARTS,
  TERRAINS,
  TERRAIN_COUNTS,
  hexKey,
  isCell,
  neighbors,
  type CellKey,
  type Terrain,
} from './board';
import { createRandom, type Seed } from './random';
import { TILE_KINDS, allocateBacks, type TileKind } from './tiles';
import type {
  Action,
  ActionResult,
  GameSettings,
  GameState,
  PlayerId,
  RejectReason,
  Tile,
} from './types';

const FULL_VALUES = [1, 1, 1, 2, 2, 3, 3, 4, 5, 6] as const;

/** 5、6 人時每色要拿掉的分值 */
const REMOVED_VALUES: Readonly<Record<number, readonly number[]>> = { 5: [1, 3], 6: [1, 2, 3] };

/** 依人數列出每位玩家要放的船數 */
const BOATS_PER_PLAYER: Readonly<Record<number, readonly number[]>> = {
  2: [2, 2],
  3: [2, 2, 2],
  4: [2, 2, 2, 2],
  5: [1, 1, 2, 2, 2],
  6: [1, 1, 1, 1, 2, 2],
};

function startingValues(playerCount: number): number[] {
  const values: number[] = [...FULL_VALUES];
  for (const removed of REMOVED_VALUES[playerCount] ?? []) {
    values.splice(values.indexOf(removed), 1);
  }
  return values;
}

export function createGame(settings: GameSettings, seed: Seed): GameState {
  const boatsToPlace = BOATS_PER_PLAYER[settings.playerCount];
  if (!boatsToPlace) throw new Error(`不支援的人數：${settings.playerCount}`);
  const random = createRandom(seed);

  const terrains = random.shuffle(
    TERRAINS.flatMap((terrain) => Array<Terrain>(TERRAIN_COUNTS[terrain]).fill(terrain)),
  );
  const counts = allocateBacks(settings.tileBacks, random);
  const backs = Object.fromEntries(
    TERRAINS.map((terrain) => [
      terrain,
      random.shuffle(
        TILE_KINDS.flatMap((kind) => Array<TileKind>(counts[terrain][kind]).fill(kind)),
      ),
    ]),
  ) as Record<Terrain, TileKind[]>;
  const tiles: Record<CellKey, Tile> = {};
  ISLAND_CELLS.forEach((hex, i) => {
    const terrain = terrains[i]!;
    tiles[hexKey(hex)] = { terrain, back: backs[terrain].pop()! };
  });

  const players = Array.from({ length: settings.playerCount }, (_, i) => i);
  return {
    settings: { ...settings },
    rng: random.state(),
    phase: { kind: 'placeExplorers', player: 0 },
    tiles,
    explorers: [],
    supply: players.map(() => startingValues(settings.playerCount)),
    boatsToPlace: [...boatsToPlace],
    boats: [],
    serpents: SERPENT_STARTS.map((hex, id) => ({ id, cell: hexKey(hex) })),
    sharks: [],
    whales: [],
    hands: players.map(() => []),
  };
}

/** 從 from 的下一位開始，找第一位還有東西要放的玩家 */
function nextWith(
  from: PlayerId,
  playerCount: number,
  has: (player: PlayerId) => boolean,
): PlayerId | undefined {
  for (let step = 1; step <= playerCount; step++) {
    const player = (from + step) % playerCount;
    if (has(player)) return player;
  }
  return undefined;
}

const hasEmptyTile = (state: GameState): boolean =>
  Object.keys(state.tiles).length > new Set(state.explorers.map((e) => e.cell)).size;

/** 能不能把 player 的人物放到這格；可以就回傳 null */
function explorerCellProblem(
  state: GameState,
  player: PlayerId,
  cell: CellKey,
): RejectReason | null {
  if (!(cell in state.tiles)) return 'no-tile';
  const occupants = state.explorers.filter((e) => e.cell === cell);
  if (hasEmptyTile(state)) return occupants.length > 0 ? 'tile-occupied' : null;
  // 板塊放滿之後只會剩 6 人局的最後兩人
  return occupants.some((e) => e.owner === player) ? 'own-color-on-tile' : null;
}

export function placeExplorer(
  state: GameState,
  action: Extract<Action, { type: 'placeExplorer' }>,
): ActionResult {
  const { player, cell, value } = action;
  const problem = explorerCellProblem(state, player, cell);
  if (problem) return { ok: false, reason: problem };
  const remaining = [...state.supply[player]!];
  const index = remaining.indexOf(value);
  if (index < 0) return { ok: false, reason: 'value-unavailable' };
  remaining.splice(index, 1);

  const id = state.explorers.length;
  const supply = state.supply.map((values, i) => (i === player ? remaining : values));
  const next = nextWith(player, state.settings.playerCount, (p) => supply[p]!.length > 0);
  return {
    ok: true,
    state: {
      ...state,
      supply,
      explorers: [...state.explorers, { id, owner: player, value, cell }],
      phase:
        next === undefined
          ? { kind: 'placeBoats', player: 0 }
          : { kind: 'placeExplorers', player: next },
    },
    events: [{ type: 'explorerPlaced', cause: 'setup', player, explorerId: id, cell }],
  };
}

function boatCellProblem(state: GameState, cell: CellKey): RejectReason | null {
  if (!isCell(cell)) return 'unknown-cell';
  if (cell in state.tiles) return 'not-sea';
  if ([...state.boats, ...state.serpents].some((piece) => piece.cell === cell)) {
    return 'space-blocked';
  }
  return neighbors(cell).some((other) => other in state.tiles) ? null : 'not-coast';
}

export function placeBoat(
  state: GameState,
  action: Extract<Action, { type: 'placeBoat' }>,
): ActionResult {
  const { player, cell } = action;
  const problem = boatCellProblem(state, cell);
  if (problem) return { ok: false, reason: problem };

  const id = state.boats.length;
  const boatsToPlace = state.boatsToPlace.map((count, i) => (i === player ? count - 1 : count));
  const next = nextWith(player, state.settings.playerCount, (p) => boatsToPlace[p]! > 0);
  return {
    ok: true,
    state: {
      ...state,
      boatsToPlace,
      boats: [...state.boats, { id, cell }],
      phase:
        next === undefined ? { kind: 'turn', player: 0 } : { kind: 'placeBoats', player: next },
    },
    events: [{ type: 'boatPlaced', cause: 'setup', player, boatId: id, cell }],
  };
}

/** 布置階段目前所有合法的動作 */
export function setupActions(state: GameState): Action[] {
  const { phase } = state;
  if (phase.kind === 'placeExplorers') {
    const { player } = phase;
    const values = [...new Set(state.supply[player])];
    return Object.keys(state.tiles)
      .filter((cell) => explorerCellProblem(state, player, cell) === null)
      .flatMap((cell) =>
        values.map((value): Action => ({ type: 'placeExplorer', player, cell, value })),
      );
  }
  if (phase.kind === 'placeBoats') {
    return CELLS.map(hexKey)
      .filter((cell) => boatCellProblem(state, cell) === null)
      .map((cell): Action => ({ type: 'placeBoat', player: phase.player, cell }));
  }
  return [];
}
