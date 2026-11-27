/** 本遊戲的紙藝模型。全部由程式剪出，尺寸以六角格寬度 2 為準。原型品質，M6 再細做。 */
import type * as THREE from 'three';
import {
  card,
  cross,
  edgeOf,
  ellipse,
  hexagon,
  jitter,
  merge,
  place,
  slab,
  type Point,
} from './cut';
import { PALETTE } from './palette';
import { between, type Rng } from './random';
import { HEX_RADIUS, type Terrain } from '../board/atlantis';

/** 各地形板塊的紙層頂面高度，棋子站在這上面 */
export const TILE_TOP: Readonly<Record<Terrain, number>> = {
  beach: 0.24,
  forest: 0.4,
  mountain: 0.58,
};

/** 圓齒邊的樹冠輪廓 */
function scallop(cx: number, cy: number, r: number, lobes: number, rng: Rng): Point[] {
  return Array.from({ length: lobes * 3 }, (_, i): Point => {
    const angle = (i / (lobes * 3)) * Math.PI * 2;
    const bump = i % 3 === 0 ? 0.82 : 1.04;
    const radius = r * bump * between(rng, 0.95, 1.05);
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 1.1];
  });
}

export function tree(height: number, rng: Rng): THREE.BufferGeometry {
  const r = height * 0.34;
  const cy = height - r * 1.1;
  const trunk = cross(
    [
      [-0.05, 0],
      [0.05, 0],
      [0.03, cy],
      [-0.03, cy],
    ],
    PALETTE.trunk,
  );
  const crown = cross(scallop(0, cy, r, 7, rng), PALETTE.leafDark, 0.035);
  // 內層較亮、稍厚，兩面都露出來，形成疊紙感
  const inner = cross(scallop(0, cy + r * 0.12, r * 0.68, 6, rng), PALETTE.leaf, 0.055);
  return merge([trunk, crown, inner]);
}

/**
 * 板塊不旋轉：人物站前半部（+z，靠鏡頭那側），樹和山固定在後半部。
 * 畫面變化靠多剪幾個版本。
 */
export const TILE_YAW = 0;

/** 人物站在板塊上的位置（相對板塊中心）與大小；yawRange 是左右轉動的最大角度 */
export const EXPLORER_ON_TILE = { offsetZ: 0.38, scale: 1.38, yawRange: 0.35 } as const;

/** 正面朝鏡頭的疊層山形紙片（像立體書的一層層山景），不往前後延伸，才不會擋到人 */
function mountainPeak(height: number, rng: Rng): THREE.BufferGeometry {
  // 隨機左右鏡射：矮峰在其中一側
  const side = rng() < 0.5 ? -1 : 1;
  const shape = (points: readonly Point[]): Point[] =>
    points.map(([x, y]): Point => [side * x, y * height]);
  const layer = (points: Point[], color: string, thickness: number, z: number) => {
    const geometry = card(points, color, thickness);
    geometry.translate(0, 0, z);
    return geometry;
  };
  const ridge = shape([
    [0.02, 0],
    [0.74, 0],
    [0.44, 0.76],
    [0.3, 0.6],
    [0.2, 0.66],
  ]);
  const body = shape([
    [-0.7, 0],
    [0.5, 0],
    [0.24, 0.5],
    [0.12, 0.56],
    [-0.14, 1],
    [-0.36, 0.6],
    [-0.46, 0.62],
  ]);
  // 背光面讓兩座山峰分得開
  const shade = shape([
    [-0.14, 0.98],
    [0.12, 0.55],
    [0.24, 0.49],
    [0.49, 0.01],
    [0.08, 0.01],
    [-0.04, 0.5],
  ]);
  const snow = shape([
    [-0.14, 1.02],
    [0.07, 0.66],
    [-0.04, 0.73],
    [-0.13, 0.6],
    [-0.21, 0.74],
    [-0.33, 0.64],
  ]);
  return merge([
    layer(jitter(ridge, 0.02, rng, 2), PALETTE.rockDark, 0.05, -0.13),
    layer(jitter(body, 0.022, rng, 2), PALETTE.rock, 0.07, 0),
    layer(shade, PALETTE.rockShade, 0.02, 0.04),
    layer(snow, PALETTE.cream, 0.03, 0.065),
  ]);
}

export function tile(terrain: Terrain, rng: Rng): THREE.BufferGeometry {
  const layer = (radius: number, color: string, y: number, thickness: number) =>
    slab(jitter(hexagon(radius), 0.035, rng), color, y, thickness);
  const parts = [layer(HEX_RADIUS * 0.93, PALETTE.sand, 0.02, 0.15)];
  const scatter = (radius: number) => {
    const angle = rng() * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  };

  if (terrain === 'beach') {
    parts.push(layer(HEX_RADIUS * 0.7, PALETTE.sandLight, 0.17, 0.07));
    for (let i = 0; i < 4; i++) {
      const [x, z] = scatter(between(rng, 0.55, 0.75));
      parts.push(slab(ellipse(x, z, 0.09, 0.05, 7), PALETTE.sandDark, 0.17, 0.03));
    }
  } else if (terrain === 'forest') {
    parts.push(layer(HEX_RADIUS * 0.82, PALETTE.grass, 0.17, 0.23));
    // 左後、正後、右後各一棵（俯視角度 270 度是正後方）
    for (const degrees of [200, 270, 340]) {
      const angle = ((degrees + between(rng, -8, 8)) * Math.PI) / 180;
      const radius = between(rng, 0.58, 0.66);
      parts.push(
        place(
          tree(between(rng, 0.62, 0.85), rng),
          Math.cos(angle) * radius,
          TILE_TOP.forest,
          Math.sin(angle) * radius,
          rng() * Math.PI,
        ),
      );
    }
  } else {
    parts.push(layer(HEX_RADIUS * 0.84, PALETTE.grass, 0.17, 0.15));
    parts.push(layer(HEX_RADIUS * 0.68, PALETTE.rockLight, 0.32, 0.26));
    parts.push(
      place(
        mountainPeak(between(rng, 1, 1.15), rng),
        between(rng, -0.08, 0.08),
        TILE_TOP.mountain,
        between(rng, -0.4, -0.3),
        between(rng, -0.22, 0.22),
      ),
    );
  }
  return merge(parts);
}

export function explorer(color: string): THREE.BufferGeometry {
  // 奶油色外圈讓棋子在任何地形上都看得出來
  const base = merge([
    slab(ellipse(0, 0, 0.23, 0.23, 14), PALETTE.cream, 0, 0.035, PALETTE.ink),
    slab(ellipse(0, 0, 0.17, 0.17, 14), color, 0.035, 0.03),
  ]);
  const body = cross(
    [
      [-0.12, 0],
      [-0.03, 0],
      [0, 0.1],
      [0.03, 0],
      [0.12, 0],
      [0.09, 0.2],
      [0.18, 0.2],
      [0.1, 0.36],
      [-0.1, 0.36],
      [-0.18, 0.2],
      [-0.09, 0.2],
    ],
    color,
    0.05,
  );
  body.translate(0, 0.06, 0);
  const head = cross(ellipse(0, 0.52, 0.11, 0.11, 10), PALETTE.skin, 0.05);
  const hat = cross(
    [
      [-0.15, 0.58],
      [0.15, 0.58],
      [0.07, 0.62],
      [0.04, 0.69],
      [-0.04, 0.69],
      [-0.07, 0.62],
    ],
    color,
    0.07,
  );
  return merge([base, body, head, hat]);
}

const HULL: readonly Point[] = [
  [-0.72, -0.2],
  [-0.45, -0.34],
  [0.3, -0.34],
  [0.76, 0],
  [0.3, 0.34],
  [-0.45, 0.34],
  [-0.72, 0.2],
];

export function boat(): THREE.BufferGeometry {
  const bottom = slab(HULL, PALETTE.woodDark, 0, 0.08);
  const parts = [bottom];
  // 船舷：沿船身輪廓立起一圈紙片
  HULL.forEach((a, i) => {
    const b = HULL[(i + 1) % HULL.length]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const wall = card(
      [
        [-length / 2, 0],
        [length / 2, 0],
        [length / 2, 0.22],
        [-length / 2, 0.22],
      ],
      PALETTE.wood,
    );
    parts.push(
      place(
        wall,
        (a[0] + b[0]) / 2,
        0.04,
        (a[1] + b[1]) / 2,
        -Math.atan2(b[1] - a[1], b[0] - a[0]),
      ),
    );
  });
  for (const x of [-0.42, -0.04, 0.34]) {
    parts.push(
      slab(
        [
          [x - 0.07, -0.31],
          [x + 0.07, -0.31],
          [x + 0.07, 0.31],
          [x - 0.07, 0.31],
        ],
        PALETTE.sandDark,
        0.13,
        0.05,
      ),
    );
  }
  return merge(parts);
}

function ripple(rx: number, rz: number): THREE.BufferGeometry {
  return slab(ellipse(0, 0, rx, rz, 16), PALETTE.seaLight, 0, 0.025, PALETTE.seaFoam);
}

export function serpent(): THREE.BufferGeometry {
  const hump = (x: number, r: number) => {
    const points: Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      points.push([x + Math.cos(a) * r, Math.sin(a) * r]);
    }
    for (let i = 8; i >= 0; i--) {
      const a = (i / 8) * Math.PI;
      points.push([x + Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45]);
    }
    return card(points, PALETTE.serpent, 0.1);
  };
  const neck: Point[] = [
    [0.32, 0],
    [0.55, 0],
    [0.52, 0.45],
    [0.62, 0.66],
    [0.82, 0.68],
    [0.8, 0.8],
    [0.58, 0.86],
    [0.54, 1],
    [0.46, 0.85],
    [0.34, 0.74],
    [0.3, 0.45],
  ];
  return merge([
    ripple(0.82, 0.42),
    hump(-0.55, 0.22),
    hump(-0.07, 0.32),
    cross(
      neck.map(([x, y]): Point => [x - 0.45, y]),
      PALETTE.serpent,
      0.06,
    ).translate(0.45, 0, 0),
    card(ellipse(0.62, 0.76, 0.035, 0.035, 8), PALETTE.serpentBelly, 0.13),
  ]);
}

export function shark(): THREE.BufferGeometry {
  const fin = card(
    [
      [-0.3, 0],
      [0.32, 0],
      [0.12, 0.28],
      [-0.12, 0.58],
      [-0.16, 0.3],
    ],
    PALETTE.shark,
    0.09,
  );
  const tail = card(
    [
      [-0.72, 0],
      [-0.52, 0],
      [-0.6, 0.16],
      [-0.78, 0.34],
      [-0.7, 0.14],
    ],
    PALETTE.shark,
    0.07,
  );
  return merge([ripple(0.78, 0.36), fin, tail]);
}

export function whale(): THREE.BufferGeometry {
  const profile = card(
    [
      [-0.9, 0.5],
      [-0.72, 0.34],
      [-0.55, 0.22],
      [-0.4, 0],
      [0.55, 0],
      [0.76, 0.2],
      [0.7, 0.42],
      [0.42, 0.56],
      [0, 0.54],
      [-0.42, 0.34],
      [-0.62, 0.38],
      [-0.68, 0.56],
      [-0.76, 0.46],
    ],
    PALETTE.whale,
    0.2,
    edgeOf(PALETTE.whale),
  );
  const belly = card(ellipse(0.26, 0.13, 0.36, 0.1, 12), PALETTE.belly, 0.23);
  const eye = card(ellipse(0.52, 0.3, 0.035, 0.035, 8), PALETTE.ink, 0.25);
  const spout = cross(
    [
      [0.28, 0.5],
      [0.34, 0.5],
      [0.46, 0.8],
      [0.34, 0.72],
      [0.31, 0.86],
      [0.28, 0.72],
      [0.16, 0.8],
    ],
    PALETTE.seaFoam,
    0.03,
  );
  return merge([ripple(0.9, 0.45), profile, belly, eye, spout]);
}
