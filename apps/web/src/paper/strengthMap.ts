/**
 * 紙紋濃淡分布圖（俯視）。不能移動的地方和已經放了東西的格子接近完整強度，
 * 空格子較淡，間接提示哪裡有空位。目前只看格子上有沒有東西；
 * 「能不能走到」要等 M1 的規則引擎。
 */
import { hexKey, toWorld, type Hex } from '../board/atlantis';
import { createRng } from './random';
import { valueNoise } from './surfaces';

export const MASK_SIZE = 256;
/** 貼圖涵蓋世界座標 -MASK_HALF 到 MASK_HALF，含四角的安全島 */
export const MASK_HALF = 16;

const FULL_STRENGTH = 1;
const EMPTY_STRENGTH = 0.66;
/** 各區域內再往下起伏的幅度，看起來才不像兩個平板的色塊 */
const VARIATION = 0.14;
/** 交界扭曲的幅度（世界單位；一格寬 2） */
const WARP_BROAD = 1;
const WARP_FINE = 0.4;

const ROW = Math.sqrt(3);

/** 離 (x, z) 最近的格子座標。倍寬座標裡，欄與列的奇偶性相同 */
function nearestCell(x: number, z: number): Hex {
  const candidates = [Math.floor(z / ROW), Math.floor(z / ROW) + 1].map((r) => {
    const parity = Math.abs(r) % 2;
    return { c: 2 * Math.round((x - parity) / 2) + parity, r };
  });
  const gap = (hex: Hex) => Math.hypot(toWorld(hex).x - x, toWorld(hex).z - z);
  const [a, b] = candidates as [Hex, Hex];
  return gap(a) <= gap(b) ? a : b;
}

/** 方框模糊：橫向、直向各做一次，邊緣沿用最外側的值 */
function blur(field: Float32Array, radius: number): Float32Array {
  const clamp = (v: number) => Math.min(MASK_SIZE - 1, Math.max(0, v));
  const pass = (source: Float32Array, stepX: number, stepY: number) =>
    source.map((_, i) => {
      const x = i % MASK_SIZE;
      const y = Math.floor(i / MASK_SIZE);
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        sum += source[clamp(y + k * stepY) * MASK_SIZE + clamp(x + k * stepX)]!;
      }
      return sum / (radius * 2 + 1);
    });
  return pass(pass(field, 1, 0), 0, 1);
}

const noise = (cells: number, seed: number) => valueNoise(MASK_SIZE, cells, cells, createRng(seed));

// 雜訊只跟地點有關、跟盤面無關，棋子移動時紋理的邊緣不會整片跳動
let fields: ReturnType<typeof createFields> | undefined;
const createFields = () => ({
  broadX: noise(14, 311),
  broadZ: noise(14, 312),
  fineX: noise(38, 313),
  fineZ: noise(38, 314),
  shade: noise(11, 315),
  speckle: noise(29, 316),
});

/** cells 是可以放棋子的格子；occupied 是其中已經放了東西的格子（hexKey） */
export function createStrengthData(cells: readonly Hex[], occupied: ReadonlySet<string>) {
  const { broadX, broadZ, fineX, fineZ, shade, speckle } = (fields ??= createFields());
  const playable = new Set(cells.map(hexKey));
  const texel = (MASK_HALF * 2) / MASK_SIZE;
  const world = (index: number) => (index + 0.5) * texel - MASK_HALF;

  const heavy = new Float32Array(MASK_SIZE * MASK_SIZE);
  for (let i = 0; i < heavy.length; i++) {
    const x =
      world(i % MASK_SIZE) + (broadX[i]! - 0.5) * WARP_BROAD + (fineX[i]! - 0.5) * WARP_FINE;
    const z =
      world(Math.floor(i / MASK_SIZE)) +
      (broadZ[i]! - 0.5) * WARP_BROAD +
      (fineZ[i]! - 0.5) * WARP_FINE;
    const key = hexKey(nearestCell(x, z));
    heavy[i] = playable.has(key) && !occupied.has(key) ? 0 : 1;
  }
  const soft = blur(blur(heavy, 2), 2);

  const data = new Uint8Array(heavy.length);
  for (let i = 0; i < data.length; i++) {
    const x = world(i % MASK_SIZE);
    const z = world(Math.floor(i / MASK_SIZE));
    // 靠近貼圖邊緣時收掉起伏，超出範圍沿用邊緣值才不會拉出條紋
    const fromEdge = MASK_HALF - texel - Math.max(Math.abs(x), Math.abs(z));
    const inside = Math.min(1, Math.max(0, fromEdge / 1.5));
    const dip = Math.min(1, Math.max(0, (shade[i]! * 0.7 + speckle[i]! * 0.3 - 0.2) / 0.6));
    const base = EMPTY_STRENGTH + (FULL_STRENGTH - EMPTY_STRENGTH) * soft[i]!;
    const strength = fromEdge <= 0 ? FULL_STRENGTH : base - VARIATION * dip * inside;
    data[i] = Math.round(strength * 255);
  }
  return data;
}
