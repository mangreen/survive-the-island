/** 引擎入口：套用動作、列出合法動作、重播。 */
import type { Seed } from './random';
import { createGame, placeBoat, placeExplorer, setupActions } from './setup';
import type { Action, ActionResult, GameSettings, GameState } from './types';

export { createGame };

const PHASE_OF = { placeExplorer: 'placeExplorers', placeBoat: 'placeBoats' } as const;

/** 不合法的動作回傳原因，原本的狀態不變 */
export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.phase.kind !== PHASE_OF[action.type]) return { ok: false, reason: 'wrong-phase' };
  if (state.phase.player !== action.player) return { ok: false, reason: 'not-your-turn' };
  return action.type === 'placeExplorer' ? placeExplorer(state, action) : placeBoat(state, action);
}

/** 目前所有合法動作；機器人和隨機對局測試用。回合階段的動作還沒實作。 */
export const legalActions = (state: GameState): Action[] => setupActions(state);

export function replay(settings: GameSettings, seed: Seed, actions: readonly Action[]): GameState {
  return actions.reduce(
    (state, action, index) => {
      const result = applyAction(state, action);
      if (!result.ok) throw new Error(`第 ${index} 個動作不合法：${result.reason}`);
      return result.state;
    },
    createGame(settings, seed),
  );
}
