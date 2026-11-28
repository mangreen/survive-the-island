/** 隱藏資訊的唯一出口：只挑看得到的欄位組出畫面資料，新增狀態欄位時預設不外流。 */
import type { CellKey, Terrain } from './board';
import type { TileKind } from './tiles';
import type { GameSettings, GameState, Phase, Piece, PlayerId } from './types';

export interface PlayerView {
  readonly you: PlayerId;
  readonly settings: GameSettings;
  readonly phase: Phase;
  readonly tiles: readonly { readonly cell: CellKey; readonly terrain: Terrain }[];
  readonly explorers: readonly {
    readonly id: number;
    readonly owner: PlayerId;
    readonly cell: CellKey;
  }[];
  /** 自己還沒放上場的分值 */
  readonly unplacedValues: readonly number[];
  readonly unplacedCounts: readonly number[];
  readonly boatsToPlace: readonly number[];
  readonly boats: readonly Piece[];
  readonly serpents: readonly Piece[];
  readonly sharks: readonly Piece[];
  readonly whales: readonly Piece[];
  /** 自己的手牌 */
  readonly hand: readonly TileKind[];
  readonly handCounts: readonly number[];
}

const copyPieces = (pieces: readonly Piece[]): Piece[] =>
  pieces.map(({ id, cell }) => ({ id, cell }));

export function viewFor(state: GameState, player: PlayerId): PlayerView {
  const hand = state.hands[player];
  if (!hand) throw new Error(`沒有這位玩家：${player}`);
  return {
    you: player,
    settings: { ...state.settings },
    phase: { ...state.phase },
    tiles: Object.entries(state.tiles).map(([cell, { terrain }]) => ({ cell, terrain })),
    explorers: state.explorers.map(({ id, owner, cell }) => ({ id, owner, cell })),
    unplacedValues: [...state.supply[player]!],
    unplacedCounts: state.supply.map((values) => values.length),
    boatsToPlace: [...state.boatsToPlace],
    boats: copyPieces(state.boats),
    serpents: copyPieces(state.serpents),
    sharks: copyPieces(state.sharks),
    whales: copyPieces(state.whales),
    hand: [...hand],
    handCounts: state.hands.map((cards) => cards.length),
  };
}
