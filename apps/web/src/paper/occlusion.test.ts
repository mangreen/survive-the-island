/**
 * 回歸：人物曾經被自己腳下的樹和山擋住。
 * 從人物表面往鏡頭方向射線，檢查有沒有打到板塊（自己腳下的，以及前一排的兩片）。
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Terrain } from '../board/atlantis';
import { EXPLORER_ON_TILE, TILE_TOP, TILE_YAW, explorer, tile } from './pieces';
import { createRng } from './random';

const TERRAINS: readonly Terrain[] = ['beach', 'forest', 'mountain'];
// 橫向畫面的俯角最低（56 度），遮擋最嚴重；左右偏角模擬棋盤兩側的透視
const ELEVATION = THREE.MathUtils.degToRad(56);
const TOWARDS_CAMERA = [-10, 0, 10].map((degrees) => {
  const azimuth = THREE.MathUtils.degToRad(degrees);
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(ELEVATION),
    Math.sin(ELEVATION),
    Math.cos(azimuth) * Math.cos(ELEVATION),
  );
});

const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

/** 人物底座以上的取樣點 */
function explorerSamples(): THREE.Vector3[] {
  const position = explorer('#ff0000').getAttribute('position');
  const unique = new Map<string, THREE.Vector3>();
  for (let i = 0; i < position.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, i);
    if (point.y < 0.08) continue;
    unique.set(
      point
        .toArray()
        .map((v) => v.toFixed(2))
        .join(),
      point,
    );
  }
  return [...unique.values()].filter((_, i) => i % 4 === 0);
}

function meshAt(geometry: THREE.BufferGeometry, x: number, z: number, yaw: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = yaw;
  mesh.updateMatrixWorld();
  return mesh;
}

/** 人物取樣點被擋住的比例，取各偏角、各轉向中最差的一個 */
function hiddenShare(standOn: Terrain, occluders: THREE.Mesh[]): number {
  const raycaster = new THREE.Raycaster();
  const samples = explorerSamples();
  const { offsetZ, scale, yawRange } = EXPLORER_ON_TILE;
  let worst = 0;
  for (const yaw of [-yawRange, 0, yawRange]) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(0, TILE_TOP[standOn], offsetZ),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      new THREE.Vector3(scale, scale, scale),
    );
    for (const direction of TOWARDS_CAMERA) {
      let hidden = 0;
      for (const sample of samples) {
        const origin = sample.clone().applyMatrix4(matrix).addScaledVector(direction, 0.002);
        raycaster.set(origin, direction);
        if (raycaster.intersectObjects(occluders, false).length > 0) hidden++;
      }
      worst = Math.max(worst, hidden / samples.length);
    }
  }
  return worst;
}

/** 多個種子，涵蓋隨機剪出來的各種形狀 */
function variants(terrain: Terrain): THREE.BufferGeometry[] {
  return [1, 5, 9, 13].flatMap((seed) => {
    const rng = createRng(seed);
    return [0, 1, 2].map(() => tile(terrain, rng));
  });
}

describe('人物遮擋', () => {
  it.each(TERRAINS)(
    '站在 %s 上不會被自己腳下的板塊裝飾擋住',
    (terrain) => {
      let worst = 0;
      for (const geometry of variants(terrain)) {
        worst = Math.max(worst, hiddenShare(terrain, [meshAt(geometry, 0, 0, TILE_YAW)]));
      }
      expect(worst).toBeLessThanOrEqual(0.03);
    },
    60_000,
  );

  it.each(TERRAINS)(
    '前一排的 %s 板塊不會擋住後面沙灘上的人物',
    (terrain) => {
      let worst = 0;
      for (const geometry of variants(terrain)) {
        for (const x of [-1, 1]) {
          const front = meshAt(geometry, x, Math.sqrt(3), TILE_YAW);
          worst = Math.max(worst, hiddenShare('beach', [front]));
        }
      }
      expect(worst).toBeLessThanOrEqual(0.03);
    },
    60_000,
  );
});
