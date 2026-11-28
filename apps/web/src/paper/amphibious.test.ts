/** 兩棲棋子在陸上和海裡各有一種外形：海裡的下半身沉在水中，只露出上半身和水波。 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { explorerForms } from './pieces';
import { PLAYER_COLORS } from './palette';
import { SURFACES } from './surfaces';

function bounds(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

function hasWater(geometry: THREE.BufferGeometry): boolean {
  const surface = geometry.getAttribute('surface');
  const channel = SURFACES.indexOf('water');
  return Array.from({ length: surface.count }).some((_, i) => surface.getComponent(i, channel) > 0);
}

/** 高過指定高度的頂點裡，有沒有這個紙色 */
function showsAbove(geometry: THREE.BufferGeometry, color: string, y: number): boolean {
  const position = geometry.getAttribute('position');
  const colors = geometry.getAttribute('color');
  const want = new THREE.Color(color);
  return Array.from({ length: position.count }).some(
    (_, i) =>
      position.getY(i) > y &&
      Math.abs(colors.getX(i) - want.r) < 1e-4 &&
      Math.abs(colors.getY(i) - want.g) < 1e-4 &&
      Math.abs(colors.getZ(i) - want.b) < 1e-4,
  );
}

describe('人物的陸上與海中外形', () => {
  it.each(PLAYER_COLORS)('%s：海中下半身沉入水裡，露出的高度明顯比陸上矮', (color) => {
    const { land, sea } = explorerForms(color);
    expect(bounds(sea).max.y).toBeLessThan(bounds(land).max.y * 0.75);
    // 水波下方不能露出身體
    expect(bounds(sea).min.y).toBeGreaterThanOrEqual(-0.02);
  });

  it.each(PLAYER_COLORS)('%s：海中仍看得出是哪位玩家', (color) => {
    expect(showsAbove(explorerForms(color).sea, color, 0.1)).toBe(true);
  });

  it('只有海中外形帶水波', () => {
    const { land, sea } = explorerForms(PLAYER_COLORS[0]);
    expect(hasWater(sea)).toBe(true);
    expect(hasWater(land)).toBe(false);
  });

  it('海中外形張開手臂划水，比陸上寬，但不超出一格', () => {
    const { land, sea } = explorerForms(PLAYER_COLORS[0]);
    const width = (geometry: THREE.BufferGeometry) =>
      bounds(geometry).max.x - bounds(geometry).min.x;
    expect(width(sea)).toBeGreaterThan(width(land) * 1.5);
    // 板塊上的人物放大 1.38 倍，一格寬 2
    expect(width(sea) * 1.38).toBeLessThan(1.5);
  });
});
