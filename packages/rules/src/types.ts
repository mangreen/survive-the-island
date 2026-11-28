import type { CellKey, Terrain } from './board';
import type { RandomState } from './random';
import type { TileBacksMode, TileKind } from './tiles';

/** 座位編號，0 是起始玩家，依順時針遞增 */
export type PlayerId = number;

export interface GameSettings {
  readonly playerCount: number;
  readonly tileBacks: TileBacksMode;
  readonly creatures: 'player' | 'nature';
  readonly sinking: 'player' | 'nature';
}

export type Phase =
  | { readonly kind: 'placeExplorers'; readonly player: PlayerId }
  | { readonly kind: 'placeBoats'; readonly player: PlayerId }
  | { readonly kind: 'turn'; readonly player: PlayerId };

export interface Tile {
  readonly terrain: Terrain;
  /** 隱藏：沉沒前沒有人看得到 */
  readonly back: TileKind;
}

export interface Explorer {
  readonly id: number;
  readonly owner: PlayerId;
  /** 隱藏：放下後沒有人看得到 */
  readonly value: number;
  readonly cell: CellKey;
}

/** 船和生物 */
export interface Piece {
  readonly id: number;
  readonly cell: CellKey;
}

/** 完整遊戲狀態，可直接存成 JSON。含隱藏資訊，給畫面前一定要經過 viewFor。 */
export interface GameState {
  readonly settings: GameSettings;
  readonly rng: RandomState;
  readonly phase: Phase;
  /** 還沒沉的地形板塊 */
  readonly tiles: Readonly<Record<CellKey, Tile>>;
  readonly explorers: readonly Explorer[];
  /** 每位玩家還沒放上場的分值 */
  readonly supply: readonly (readonly number[])[];
  readonly boatsToPlace: readonly number[];
  readonly boats: readonly Piece[];
  readonly serpents: readonly Piece[];
  readonly sharks: readonly Piece[];
  readonly whales: readonly Piece[];
  readonly hands: readonly (readonly TileKind[])[];
}

export type Action =
  | {
      readonly type: 'placeExplorer';
      readonly player: PlayerId;
      readonly cell: CellKey;
      readonly value: number;
    }
  | { readonly type: 'placeBoat'; readonly player: PlayerId; readonly cell: CellKey };

export type RejectReason =
  | 'wrong-phase'
  | 'not-your-turn'
  | 'unknown-cell'
  | 'no-tile'
  | 'tile-occupied'
  | 'own-color-on-tile'
  | 'value-unavailable'
  | 'not-sea'
  | 'space-blocked'
  | 'not-coast';

/** 事件發生的原因，之後的提示與教學要用 */
export type Cause = 'setup';

/** 事件會給所有人看，不可放隱藏資訊 */
export type GameEvent =
  | {
      readonly type: 'explorerPlaced';
      readonly cause: Cause;
      readonly player: PlayerId;
      readonly explorerId: number;
      readonly cell: CellKey;
    }
  | {
      readonly type: 'boatPlaced';
      readonly cause: Cause;
      readonly player: PlayerId;
      readonly boatId: number;
      readonly cell: CellKey;
    };

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly reason: RejectReason };
