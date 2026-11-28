/** 隱藏資訊：只改看不到的內容，viewFor 的輸出必須完全一樣。 */
import { describe, expect, it } from 'vitest';
import { applyAction, legalActions } from './game';
import { PLAYER_COUNTS, newGame, playSetup } from './testing';
import type { GameState } from './types';
import { viewFor } from './view';

/** 把 viewer 看不到的內容全部換掉 */
function scrambleHidden(state: GameState, viewer: number): GameState {
  const next = JSON.parse(JSON.stringify(state)) as {
    rng: number[];
    tiles: Record<string, { back: string }>;
    supply: number[][];
    explorers: { value: number }[];
    hands: string[][];
  };
  next.rng = [9, 9, 9, 9];
  for (const tile of Object.values(next.tiles)) tile.back = 'volcano';
  for (const explorer of next.explorers) explorer.value = 99;
  next.supply = next.supply.map((values, player) =>
    player === viewer ? values : values.map(() => 99),
  );
  next.hands = next.hands.map((hand, player) =>
    player === viewer ? hand : hand.map(() => 'volcano'),
  );
  return next as unknown as GameState;
}

/** 布置途中與布置完的各個時間點，另外塞入手牌 */
function snapshots(players: number): GameState[] {
  const states: GameState[] = [];
  let state = newGame(players, [players, 4, 4, 4]);
  for (let step = 0; ; step++) {
    if (step % 7 === 0 || state.phase.kind === 'turn') {
      states.push({
        ...state,
        hands: state.hands.map((_, i) =>
          i % 2 === 0 ? ['dolphin', 'sharkDefense'] : ['whaleDive'],
        ),
      });
    }
    if (state.phase.kind === 'turn') return states;
    const result = applyAction(state, legalActions(state)[0]!);
    if (!result.ok) throw new Error(result.reason);
    state = result.state;
  }
}

describe('viewFor', () => {
  it.each(PLAYER_COUNTS)('HID-1～4：%i 人時，看不到的內容怎麼變都不影響輸出', (players) => {
    for (const state of snapshots(players)) {
      for (let viewer = 0; viewer < players; viewer++) {
        expect(viewFor(scrambleHidden(state, viewer), viewer)).toEqual(viewFor(state, viewer));
      }
    }
  });

  it('HID-2：自己看得到手牌內容，別人的只看得到張數', () => {
    const state = snapshots(4).at(-1)!;
    const view = viewFor(state, 1);
    expect(view.hand).toEqual(['whaleDive']);
    expect(view.handCounts).toEqual([2, 1, 2, 1]);
  });

  it('HID-3：自己只看得到還沒放的分值', () => {
    const { state } = playSetup(newGame(4), 'all');
    const view = viewFor(state, 0);
    expect(view.unplacedValues).toEqual([]);
    for (const explorer of view.explorers) {
      expect(Object.keys(explorer).sort()).toEqual(['cell', 'id', 'owner']);
    }
    expect(viewFor(newGame(4), 2).unplacedValues).toHaveLength(10);
  });

  it('HID-5：地形種類與棋子位置公開', () => {
    const { state } = playSetup(newGame(4), 'all');
    const view = viewFor(state, 3);
    expect(view.tiles).toHaveLength(40);
    expect(view.tiles[0]).toEqual({ cell: expect.any(String), terrain: expect.any(String) });
    expect(view.boats).toEqual(state.boats);
    expect(view.serpents).toEqual(state.serpents);
  });

  it('輸出是獨立的複本，改它不會改到遊戲狀態', () => {
    const { state } = playSetup(newGame(4), 'all');
    const view = viewFor(state, 0);
    (view.boats as unknown as { cell: string }[])[0]!.cell = 'x';
    expect(state.boats[0]!.cell).not.toBe('x');
  });

  it.each([-1, 4, 1.5])('拒絕不存在的玩家 %s', (viewer) => {
    expect(() => viewFor(newGame(4), viewer)).toThrow();
  });
});
