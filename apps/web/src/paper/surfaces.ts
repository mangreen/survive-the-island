/**
 * 高畫質用的地面紙紋。全部由程式產生，不使用任何外部圖片。
 * 一張 RGBA 資料貼圖，每個色版是一種紙紋的明暗（128 表示不變），所以不會改掉原本的配色。
 */
import { between, createRng, type Rng } from './random';

export const SURFACES = ['sand', 'grass', 'rock', 'water'] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_SIZE = 512;

type Field = Float32Array;

const wrap = (value: number, size: number) => ((value % size) + size) % size;

// 這裡每張貼圖要算幾百萬次距離，Math.hypot 太慢
const length = (x: number, y: number) => Math.sqrt(x * x + y * y);

/** 畫一條兩端漸細的短線，超出邊界就從另一側接回來 */
function stroke(
  field: Field,
  size: number,
  from: readonly [number, number],
  to: readonly [number, number],
  width: number,
  ink: number,
): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lengthSq = dx * dx + dy * dy || 1;
  const pad = width + 1;
  for (
    let y = Math.floor(Math.min(from[1], to[1]) - pad);
    y <= Math.max(from[1], to[1]) + pad;
    y++
  ) {
    for (
      let x = Math.floor(Math.min(from[0], to[0]) - pad);
      x <= Math.max(from[0], to[0]) + pad;
      x++
    ) {
      const t = Math.min(1, Math.max(0, ((x - from[0]) * dx + (y - from[1]) * dy) / lengthSq));
      const distance = length(x - from[0] - dx * t, y - from[1] - dy * t);
      const radius = width * (1 - 0.6 * Math.abs(t - 0.5) * 2);
      const cover = Math.min(1, Math.max(0, radius + 0.5 - distance));
      if (cover > 0) {
        const i = wrap(y, size) * size + wrap(x, size);
        field[i] = field[i]! + (ink - field[i]!) * cover;
      }
    }
  }
}

/** 週期性的平滑雜訊，cellsX × cellsY 個格子剛好鋪滿一張貼圖 */
function valueNoise(size: number, cellsX: number, cellsY: number, rng: Rng): Field {
  const lattice = Array.from({ length: cellsX * cellsY }, () => rng());
  const at = (x: number, y: number) => lattice[wrap(y, cellsY) * cellsX + wrap(x, cellsX)]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = (y / size) * cellsY;
    const y0 = Math.floor(v);
    const ty = smooth(v - y0);
    for (let x = 0; x < size; x++) {
      const u = (x / size) * cellsX;
      const x0 = Math.floor(u);
      const tx = smooth(u - x0);
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      field[y * size + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return field;
}

/** 沙礫：細顆粒底，加上帶影子的小石粒 */
function sand(size: number, rng: Rng): Field {
  const mottle = valueNoise(size, 14, 14, rng);
  const grain = valueNoise(size, 170, 170, rng);
  const field = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) field[i] = mottle[i]! * 0.35 + grain[i]! * 0.65;
  for (let n = 0; n < size * 4.5; n++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = between(rng, 1.1, 3.4);
    stroke(field, size, [x + r * 0.6, y + r * 0.7], [x + r * 0.6, y + r * 0.7], r, 0.08);
    stroke(field, size, [x, y], [x, y], r, between(rng, 0.55, 1));
  }
  return field;
}

/** 草叢：長纖維打底，上面是一叢叢往上翹的短草 */
function grass(size: number, rng: Rng): Field {
  const mottle = valueNoise(size, 11, 11, rng);
  const field = mottle.map((value) => 0.3 + value * 0.3);
  for (let n = 0; n < size * 3; n++) {
    const x = rng() * size;
    const y = rng() * size;
    const angle = between(rng, -0.6, 0.6);
    const reach = between(rng, 10, 30);
    stroke(
      field,
      size,
      [x, y],
      [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach],
      between(rng, 0.7, 1.3),
      between(rng, 0.1, 0.8),
    );
  }
  for (let n = 0; n < size * 1.1; n++) {
    const x = rng() * size;
    const y = rng() * size;
    for (let blade = -1; blade <= 1; blade++) {
      // 貼圖的 -y 對應棋盤的遠端，草尖朝那邊看起來像往上長
      const tip: [number, number] = [x + blade * between(rng, 3, 7), y - between(rng, 8, 17)];
      stroke(field, size, [x + blade, y], tip, 1.6, blade === 0 ? 1 : 0.82);
      stroke(field, size, [x + blade + 2, y + 1], [tip[0] + 2, tip[1] + 2], 1, 0.08);
    }
  }
  return field;
}

/** 皺紙的一層摺面：每個多邊形是一個斜面，照左上方的光決定明暗 */
function facets(size: number, cells: number, rng: Rng): Field {
  const step = size / cells;
  const seeds = Array.from({ length: cells * cells }, () => ({
    dx: between(rng, 0.1, 0.9),
    dy: between(rng, 0.1, 0.9),
    slopeX: between(rng, -1, 1),
    slopeY: between(rng, -1, 1),
  }));
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / step);
      const cy = Math.floor(y / step);
      let best = Infinity;
      let second = Infinity;
      let shade = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const seed = seeds[wrap(cy + oy, cells) * cells + wrap(cx + ox, cells)]!;
          const px = x - (cx + ox + seed.dx) * step;
          const py = y - (cy + oy + seed.dy) * step;
          const distance = length(px, py);
          if (distance < best) {
            second = best;
            best = distance;
            shade =
              (seed.slopeX + seed.slopeY) * 0.5 +
              (px * seed.slopeY - py * seed.slopeX) / (step * 2.5);
          } else if (distance < second) {
            second = distance;
          }
        }
      }
      const crease = Math.max(0, 1 - (second - best) / 2.2);
      field[y * size + x] = shade + crease * 0.55;
    }
  }
  return field;
}

function rock(size: number, rng: Rng): Field {
  const large = facets(size, 9, rng);
  const small = facets(size, 21, rng);
  const grain = valueNoise(size, 150, 150, rng);
  return large.map((value, i) => value * 0.65 + small[i]! * 0.35 + (grain[i]! - 0.5) * 0.35);
}

/** 海面：橫向拉長的摺痕，用高度差打出浮雕般的受光面與背光面 */
function water(size: number, rng: Rng): Field {
  const warp = valueNoise(size, 6, 6, rng);
  const octaves = [
    { noise: valueNoise(size, 9, 26, rng), weight: 1 },
    { noise: valueNoise(size, 19, 52, rng), weight: 0.45 },
    { noise: valueNoise(size, 44, 96, rng), weight: 0.2 },
  ];
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const shift = Math.round((warp[y * size + x]! - 0.5) * 70);
      let sum = 0;
      for (const { noise, weight } of octaves) {
        const value = noise[wrap(y + shift, size) * size + x]!;
        // 取脊線，讓起伏變成一道道摺痕而不是圓丘
        sum += (1 - Math.abs(value * 2 - 1)) ** 2 * weight;
      }
      height[y * size + x] = sum;
    }
  }
  return height.map((value, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    return value - height[wrap(y + 3, size) * size + wrap(x + 1, size)]! + value * 0.12;
  });
}

const GENERATORS: Readonly<Record<Surface, (size: number, rng: Rng) => Field>> = {
  sand,
  grass,
  rock,
  water,
};

/** 各紙紋的明暗起伏（標準差，0–255） */
const CONTRAST: Readonly<Record<Surface, number>> = { sand: 30, grass: 40, rock: 36, water: 28 };

export function createSurfaceData(size = SURFACE_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  SURFACES.forEach((surface, channel) => {
    const field = GENERATORS[surface](size, createRng(101 + channel));
    const mean = field.reduce((sum, v) => sum + v, 0) / field.length;
    const variance = field.reduce((sum, v) => sum + (v - mean) ** 2, 0) / field.length;
    const scale = CONTRAST[surface] / Math.sqrt(variance);
    field.forEach((value, i) => {
      data[i * 4 + channel] = Math.round(Math.min(255, Math.max(0, 128 + (value - mean) * scale)));
    });
  });
  return data;
}
