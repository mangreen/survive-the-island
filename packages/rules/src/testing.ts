/** 測試共用：快速開局、隨機走完布置。 */
import { applyAction, createGame, legalActions } from './game';
import { createRandom, type Seed } from './random';
import type { Action, GameSettings, GameState } from './types';

export const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const;

export const settings = (playerCount: number): GameSettings => ({
  playerCount,
  tileBacks: 'bounded',
  creatures: 'player',
  sinking: 'player',
});

export const newGame = (playerCount: number, seed: Seed = [1, 2, 3, 4]): GameState =>
  createGame(settings(playerCount), seed);

export function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`測試動作被拒絕：${result.reason}`);
  return result.state;
}

/** 隨機挑合法動作，走完指定的布置階段（all 是兩個都走完） */
export function playSetup(
  start: GameState,
  stage: 'explorers' | 'boats' | 'all',
  choiceSeed = 0,
): { state: GameState; actions: Action[] } {
  const stages = { explorers: ['placeExplorers'], boats: ['placeBoats'] };
  const active: string[] = stage === 'all' ? [...stages.explorers, ...stages.boats] : stages[stage];
  const random = createRandom([choiceSeed, 8, 8, 8]);
  const actions: Action[] = [];
  let state = start;
  while (active.includes(state.phase.kind)) {
    const options = legalActions(state);
    const action = options[random.int(options.length)];
    if (!action) throw new Error('布置階段沒有合法動作');
    state = act(state, action);
    actions.push(action);
  }
  return { state, actions };
}
