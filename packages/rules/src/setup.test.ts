import { describe, expect, it } from 'vitest';
import { ISLAND_CELLS, SERPENT_STARTS, TERRAINS, hexKey, neighbors } from './board';
import { applyAction, createGame, legalActions, replay } from './game';
import { PLAYER_COUNTS, act, newGame, playSetup, settings } from './testing';
import type { Action, GameState } from './types';

const sorted = (values: readonly number[]) => [...values].sort((a, b) => a - b);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('開局', () => {
  it('SET-1：5 隻海蛇在起點，場上沒有鯊魚、鯨魚和船', () => {
    const state = newGame(4);
    expect(state.serpents.map((s) => s.cell).sort()).toEqual(SERPENT_STARTS.map(hexKey).sort());
    expect([state.sharks, state.whales, state.boats]).toEqual([[], [], []]);
  });

  it('SET-2：40 片地形鋪在島嶼格，位置隨種子改變', () => {
    const a = newGame(4, [1, 1, 1, 1]);
    const b = newGame(4, [2, 2, 2, 2]);
    expect(Object.keys(a.tiles).sort()).toEqual(ISLAND_CELLS.map(hexKey).sort());
    const terrains = (state: GameState) => Object.values(state.tiles).map((t) => t.terrain);
    for (const terrain of TERRAINS) {
      expect(terrains(a).filter((t) => t === terrain)).toHaveLength(
        { beach: 16, forest: 16, mountain: 8 }[terrain],
      );
    }
    expect(a.tiles).not.toEqual(b.tiles);
  });

  it.each([
    [2, [1, 1, 1, 2, 2, 3, 3, 4, 5, 6]],
    [4, [1, 1, 1, 2, 2, 3, 3, 4, 5, 6]],
  ])('PART-3：%i 人時每色 10 人，分值合計 28', (players, values) => {
    for (const supply of newGame(players).supply) expect(sorted(supply)).toEqual(values);
  });

  it('SET-5：5 人時每色拿掉一個 1 和一個 3', () => {
    for (const supply of newGame(5).supply) {
      expect(sorted(supply)).toEqual([1, 1, 2, 2, 3, 4, 5, 6]);
    }
  });

  it('SET-6：6 人時每色拿掉 1、2、3 各一個', () => {
    for (const supply of newGame(6).supply) {
      expect(sorted(supply)).toEqual([1, 1, 2, 3, 4, 5, 6]);
    }
  });

  it('SET-3：從起始玩家順時針輪流放，只能放自己還有的分值、放在空板塊上', () => {
    let state = newGame(3);
    const [first, second] = Object.keys(state.tiles) as [string, string];
    const reject = (action: Action) => applyAction(state, action);

    expect(reject({ type: 'placeExplorer', player: 1, cell: first, value: 1 })).toEqual({
      ok: false,
      reason: 'not-your-turn',
    });
    expect(reject({ type: 'placeExplorer', player: 0, cell: '0,0', value: 1 })).toEqual({
      ok: false,
      reason: 'no-tile',
    });
    expect(reject({ type: 'placeExplorer', player: 0, cell: first, value: 7 })).toEqual({
      ok: false,
      reason: 'value-unavailable',
    });
    expect(reject({ type: 'placeBoat', player: 0, cell: '0,0' })).toEqual({
      ok: false,
      reason: 'wrong-phase',
    });

    state = act(state, { type: 'placeExplorer', player: 0, cell: first, value: 6 });
    expect(state.phase).toEqual({ kind: 'placeExplorers', player: 1 });
    expect(reject({ type: 'placeExplorer', player: 1, cell: first, value: 1 })).toEqual({
      ok: false,
      reason: 'tile-occupied',
    });
    state = act(state, { type: 'placeExplorer', player: 1, cell: second, value: 1 });
    expect(state.supply[0]).toHaveLength(9);
    expect(sorted(state.supply[0]!)).not.toContain(6);
  });

  it.each(PLAYER_COUNTS)('SET-4：%i 人放完後，每人的人物都在板塊上', (players) => {
    const state = playSetup(newGame(players), 'explorers').state;
    const each = ({ 5: 8, 6: 7 } as Record<number, number>)[players] ?? 10;
    expect(state.explorers).toHaveLength(each * players);
    for (let player = 0; player < players; player++) {
      expect(state.explorers.filter((e) => e.owner === player)).toHaveLength(each);
    }
    expect(new Set(state.explorers.map((e) => e.cell)).size).toBe(Math.min(40, each * players));
    expect(state.phase).toEqual({ kind: 'placeBoats', player: 0 });
  });

  it('SET-6：6 人的最後兩人要放在已有人、且沒有自己顏色的板塊上', () => {
    for (let seed = 0; seed < 20; seed++) {
      const state = playSetup(newGame(6, [seed, 3, 3, 3]), 'explorers', seed).state;
      const extras = state.explorers.slice(40);
      expect(extras.map((e) => e.owner)).toEqual([4, 5]);
      for (const extra of extras) {
        const mates = state.explorers.filter((e) => e.cell === extra.cell && e.id !== extra.id);
        expect(mates.length).toBeGreaterThan(0);
        expect(mates.map((e) => e.owner)).not.toContain(extra.owner);
      }
    }
  });

  it('SET-6：沒有空板塊時，放到有自己顏色的板塊會被拒絕', () => {
    let state = newGame(6);
    while (state.explorers.length < 40) state = act(state, legalActions(state)[0]!);
    const own = state.explorers.find((e) => e.owner === 4)!.cell;
    const value = state.supply[4]![0]!;
    expect(applyAction(state, { type: 'placeExplorer', player: 4, cell: own, value })).toEqual({
      ok: false,
      reason: 'own-color-on-tile',
    });
  });

  it('SET-7：船只能放在鄰接地形、沒有船和海蛇的海格', () => {
    let state = playSetup(newGame(4), 'explorers').state;
    const boat = (cell: string) => applyAction(state, { type: 'placeBoat', player: 0, cell });
    const land = Object.keys(state.tiles)[0]!;
    expect(boat(land)).toEqual({ ok: false, reason: 'not-sea' });
    expect(boat('99,99')).toEqual({ ok: false, reason: 'unknown-cell' });
    // 中央有海蛇
    expect(boat('0,0')).toEqual({ ok: false, reason: 'space-blocked' });
    const offshore = '0,-6';
    expect(neighbors(offshore).some((n) => n in state.tiles)).toBe(false);
    expect(boat(offshore)).toEqual({ ok: false, reason: 'not-coast' });

    const first = legalActions(state)[0] as Extract<Action, { type: 'placeBoat' }>;
    state = act(state, first);
    expect(applyAction(state, { ...first, player: 1 })).toEqual({
      ok: false,
      reason: 'space-blocked',
    });
  });

  it.each([
    [2, [2, 2], [0, 1, 0, 1]],
    [3, [2, 2, 2], [0, 1, 2, 0, 1, 2]],
    [4, [2, 2, 2, 2], [0, 1, 2, 3, 0, 1, 2, 3]],
    [5, [1, 1, 2, 2, 2], [0, 1, 2, 3, 4, 2, 3, 4]],
    [6, [1, 1, 1, 1, 2, 2], [0, 1, 2, 3, 4, 5, 4, 5]],
  ])('SET-8：%i 人的船數與放置順序', (players, perPlayer, order) => {
    const start = playSetup(newGame(players), 'explorers').state;
    expect(start.boatsToPlace).toEqual(perPlayer);
    const { state, actions } = playSetup(start, 'boats');
    expect(actions.map((a) => a.player)).toEqual(order);
    expect(state.boats).toHaveLength(order.length);
    expect(state.phase).toEqual({ kind: 'turn', player: 0 });
  });

  it.each([1, 7, 2.5])('拒絕不支援的人數 %s', (playerCount) => {
    expect(() => createGame({ ...settings(4), playerCount }, [1, 2, 3, 4])).toThrow();
  });
});

describe('引擎要求', () => {
  it('ENG-1：套用動作不會改到原本的狀態', () => {
    let state = newGame(4);
    for (let i = 0; i < 48; i++) state = act(deepFreeze(state), legalActions(state)[0]!);
    expect(state.phase.kind).toBe('turn');
  });

  it.each(PLAYER_COUNTS)('ENG-2：%i 人的設定＋種子＋動作日誌能重建同一個狀態', (players) => {
    for (let seed = 0; seed < 10; seed++) {
      const words = [seed, players, 5, 5] as const;
      const { state, actions } = playSetup(newGame(players, words), 'all', seed);
      const log = JSON.parse(JSON.stringify(actions)) as Action[];
      expect(replay(settings(players), words, log)).toEqual(state);
    }
  });

  it('ENG-2：日誌裡有不合法的動作時，重播直接失敗', () => {
    const bad: Action = { type: 'placeBoat', player: 0, cell: '0,0' };
    expect(() => replay(settings(4), [1, 2, 3, 4], [bad])).toThrow(/wrong-phase/);
  });

  it('ENG-3：狀態可以整份存成 JSON 再接續', () => {
    const state = playSetup(newGame(5), 'explorers').state;
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    expect(playSetup(restored, 'boats', 3).state).toEqual(playSetup(state, 'boats', 3).state);
  });

  it('ENG-4：事件附原因代碼', () => {
    const state = newGame(4);
    const result = applyAction(state, legalActions(state)[0]!);
    expect(result.ok && result.events).toEqual([
      expect.objectContaining({ type: 'explorerPlaced', player: 0, cause: 'setup' }),
    ]);
  });
});
