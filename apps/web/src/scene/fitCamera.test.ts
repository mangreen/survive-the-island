import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CELLS, HEX_RADIUS, toWorld } from '../board/atlantis';
import { fitCamera } from './fitCamera';

const points = CELLS.flatMap((hex) => {
  const { x, z } = toWorld(hex);
  return [
    new THREE.Vector3(x - 1, 0, z),
    new THREE.Vector3(x + 1, 0, z),
    new THREE.Vector3(x, 0, z - HEX_RADIUS),
    new THREE.Vector3(x, 0, z + HEX_RADIUS),
  ];
});

describe('fitCamera', () => {
  // 對應計畫的驗收尺寸比例
  it.each([
    ['手機直向', 390 / 700],
    ['手機橫向', 844 / 340],
    ['平板直向', 768 / 960],
    ['桌機', 1366 / 700],
  ])('%s：整個棋盤都在畫面內，且至少一個方向貼近邊緣', (_, aspect) => {
    const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 2000);
    fitCamera(camera, points, 56);
    let maxX = 0;
    let maxY = 0;
    for (const point of points) {
      const p = point.clone().project(camera);
      maxX = Math.max(maxX, Math.abs(p.x));
      maxY = Math.max(maxY, Math.abs(p.y));
    }
    expect(maxX).toBeLessThanOrEqual(1);
    expect(maxY).toBeLessThanOrEqual(1);
    expect(Math.max(maxX, maxY)).toBeGreaterThan(0.9);
  });
});
