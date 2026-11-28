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
  textured,
  type Point,
} from './cut';
import { PALETTE } from './palette';
import { between, type Rng } from './random';
import type { Surface } from './surfaces';
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
  return merge([trunk, textured(crown, 'grass'), textured(inner, 'grass')]);
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
  const stone = (points: Point[], color: string, thickness: number, z: number) =>
    textured(layer(points, color, thickness, z), 'rock');
  return merge([
    stone(jitter(ridge, 0.02, rng, 2), PALETTE.rockDark, 0.05, -0.13),
    stone(jitter(body, 0.022, rng, 2), PALETTE.rock, 0.07, 0),
    stone(shade, PALETTE.rockShade, 0.02, 0.04),
    layer(snow, PALETTE.cream, 0.03, 0.065),
  ]);
}

export function tile(terrain: Terrain, rng: Rng): THREE.BufferGeometry {
  const layer = (radius: number, color: string, y: number, thickness: number, surface: Surface) =>
    textured(slab(jitter(hexagon(radius), 0.035, rng), color, y, thickness), surface);
  const parts = [layer(HEX_RADIUS * 0.93, PALETTE.sand, 0.02, 0.15, 'sand')];
  const scatter = (radius: number) => {
    const angle = rng() * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  };

  if (terrain === 'beach') {
    parts.push(layer(HEX_RADIUS * 0.7, PALETTE.sandLight, 0.17, 0.07, 'sand'));
    for (let i = 0; i < 4; i++) {
      const [x, z] = scatter(between(rng, 0.55, 0.75));
      parts.push(slab(ellipse(x, z, 0.09, 0.05, 7), PALETTE.sandDark, 0.17, 0.03));
    }
  } else if (terrain === 'forest') {
    parts.push(layer(HEX_RADIUS * 0.82, PALETTE.grass, 0.17, 0.23, 'grass'));
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
    parts.push(layer(HEX_RADIUS * 0.84, PALETTE.grass, 0.17, 0.15, 'grass'));
    parts.push(layer(HEX_RADIUS * 0.68, PALETTE.rockLight, 0.32, 0.26, 'rock'));
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

/**
 * 海上生物往後仰一點，俯視鏡頭才看得到足夠的側面。
 * 只適合正面大致朝鏡頭的擺法：要讓生物朝左時用左右鏡射，不要轉 180 度。
 */
function leanBack(figure: THREE.BufferGeometry): THREE.BufferGeometry {
  figure.rotateX(-0.42);
  figure.translate(0, 0, 0.1);
  return figure;
}

/** 沿折線剪出一條紙條，寬度從起點到終點漸漸收窄 */
function ribbon(path: readonly Point[], width: number, endWidth = width * 0.35): Point[] {
  const sides = path.map(([x, y], i) => {
    const before = path[Math.max(0, i - 1)]!;
    const after = path[Math.min(path.length - 1, i + 1)]!;
    const length = Math.hypot(after[0] - before[0], after[1] - before[1]);
    const half = (width + (endWidth - width) * (i / (path.length - 1))) / 2;
    const nx = (-(after[1] - before[1]) / length) * half;
    const ny = ((after[0] - before[0]) / length) * half;
    return { left: [x + nx, y + ny] as Point, right: [x - nx, y - ny] as Point };
  });
  return [...sides.map((side) => side.left), ...sides.map((side) => side.right).reverse()];
}

/** 貼在紙片上的彩色線條：比底紙厚一點，兩面都看得到；切邊同色才不會發黑 */
const stripe = (points: readonly Point[], color: string, thickness: number) =>
  card(points, color, thickness, color);

function ripple(rx: number, rz: number): THREE.BufferGeometry {
  const water = slab(ellipse(0, 0, rx, rz, 16), PALETTE.seaLight, 0, 0.025, PALETTE.seaFoam);
  return textured(water, 'water');
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
  /** 白底背鰭：在海面上最顯眼；紅線順著鰭的方向，一眼看出是紅色生物 */
  const fin = (points: Point[]) => card(points, PALETTE.finWhite, 0.06);
  const ray = (points: Point[]) => stripe(points, PALETTE.serpentStripe, 0.078);
  const humpSpikes = (x: number, r: number) =>
    [55, 90, 125].flatMap((degrees) => {
      const at = (offset: number, radius: number): Point => {
        const a = ((degrees + offset) * Math.PI) / 180;
        return [x + Math.cos(a) * radius, Math.sin(a) * radius];
      };
      return [
        fin([at(-15, r * 0.94), at(0, r + 0.17), at(15, r * 0.94)]),
        ray([at(-6.5, r * 0.94), at(0, r + 0.165), at(6.5, r * 0.94)]),
      ];
    });
  const figure = merge([
    ...humpSpikes(-0.55, 0.22),
    ...humpSpikes(-0.07, 0.32),
    // 頸後的扇形鰭
    fin([
      [0.33, 0.34],
      [0.07, 0.52],
      [0.21, 0.57],
      [0.05, 0.76],
      [0.22, 0.76],
      [0.15, 0.99],
      [0.43, 0.82],
      [0.33, 0.6],
    ]),
    ...(
      [
        [
          [0.32, 0.44],
          [0.085, 0.52],
        ],
        [
          [0.32, 0.6],
          [0.065, 0.755],
        ],
        [
          [0.35, 0.745],
          [0.165, 0.968],
        ],
      ] as Point[][]
    ).map((line) => ray(ribbon(line, 0.065, 0.014))),
    hump(-0.55, 0.22),
    hump(-0.07, 0.32),
    cross(
      neck.map(([x, y]): Point => [x - 0.45, y]),
      PALETTE.serpent,
      0.06,
    ).translate(0.45, 0, 0),
    card(ellipse(0.62, 0.76, 0.055, 0.055, 10), PALETTE.serpentEye, 0.13),
    card(ellipse(0.635, 0.76, 0.027, 0.027, 8), PALETTE.ink, 0.15),
  ]);
  return merge([ripple(0.82, 0.42), leanBack(figure)]);
}

/** 沿著嘴緣排一列尖牙；depth 是牙齒朝嘴內伸出的方向與長度 */
function teeth(from: Point, to: Point, count: number, depth: Point): THREE.BufferGeometry[] {
  const along = (t: number): Point => [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];
  return Array.from({ length: count }, (_, i) => {
    const tip = along((i + 0.5) / count);
    return card(
      [along(i / count), [tip[0] + depth[0], tip[1] + depth[1]], along((i + 1) / count)],
      PALETTE.cream,
      0.14,
    );
  });
}

/** 躍出水面、張著嘴的鯊魚頭，後面跟著尾鰭。朝 +x */
export function shark(): THREE.BufferGeometry {
  const flat = (points: Point[], color: string, thickness: number) =>
    card(points, color, thickness);
  const figure = merge([
    // 嘴內：比身體薄，只從張開的缺口露出來
    flat(
      [
        [0.14, 0.58],
        [0.56, 0.9],
        [0.66, 0.5],
      ],
      PALETTE.sharkMouth,
      0.06,
    ),
    flat(
      [
        [-0.44, 0],
        [-0.34, 0.34],
        [-0.14, 0.64],
        [0.12, 0.9],
        [0.42, 1.07],
        [0.74, 1.12],
        [0.66, 0.97],
        [0.16, 0.6],
        [0.74, 0.5],
        [0.6, 0.34],
        [0.4, 0.17],
        [0.36, 0],
      ],
      PALETTE.shark,
      0.12,
    ),
    // 淺色腹部和下顎
    flat(
      [
        [0.13, 0.55],
        [0.7, 0.475],
        [0.58, 0.34],
        [0.39, 0.17],
        [0.34, 0.01],
        [0, 0.01],
        [0.03, 0.3],
      ],
      PALETTE.sharkBelly,
      0.13,
    ),
    // 背部
    flat(
      [
        [-0.35, 0.33],
        [-0.14, 0.64],
        [0.12, 0.9],
        [0.42, 1.07],
        [0.74, 1.12],
        [0.66, 1.06],
        [0.43, 0.99],
        [0.16, 0.82],
        [-0.07, 0.57],
        [-0.25, 0.31],
      ],
      PALETTE.sharkBack,
      0.13,
    ),
    ...teeth([0.26, 0.675], [0.65, 0.965], 4, [0.045, -0.1]),
    ...teeth([0.28, 0.585], [0.71, 0.505], 4, [0.005, 0.1]),
    // 背鰭
    flat(
      [
        [-0.3, 0.3],
        [-0.74, 0.76],
        [-0.42, 0.72],
        [-0.1, 0.66],
      ],
      PALETTE.sharkBack,
      0.09,
    ),
    // 眼睛和壓低的眉毛
    flat(ellipse(0.34, 0.9, 0.075, 0.075, 12), PALETTE.cream, 0.15),
    flat(ellipse(0.365, 0.885, 0.037, 0.037, 8), PALETTE.ink, 0.17),
    flat(
      [
        [0.22, 1.02],
        [0.45, 0.93],
        [0.44, 0.975],
        [0.23, 1.065],
      ],
      PALETTE.ink,
      0.16,
    ),
    // 鰓
    ...[0, 1, 2].map((i) =>
      flat(
        [
          [-0.17 + i * 0.1, 0.34],
          [-0.14 + i * 0.1, 0.34],
          [-0.07 + i * 0.1, 0.52],
          [-0.1 + i * 0.1, 0.52],
        ],
        PALETTE.sharkBack,
        0.14,
      ),
    ),
    // 尾鰭
    flat(
      [
        [-0.98, 0],
        [-0.76, 0],
        [-0.8, 0.2],
        [-0.64, 0.46],
        [-0.86, 0.32],
        [-1.1, 0.5],
        [-1, 0.2],
      ],
      PALETTE.sharkBack,
      0.08,
    ),
    // 濕皮膚的亮綠反光：背脊、吻部、背鰭前緣、尾鰭上葉
    ...(
      [
        [
          [
            [-0.2, 0.46],
            [-0.06, 0.66],
            [0.11, 0.84],
            [0.2, 0.9],
          ],
          0.055,
          0.14,
        ],
        [
          [
            [0.47, 1.045],
            [0.6, 1.082],
            [0.7, 1.09],
          ],
          0.032,
          0.14,
        ],
        [
          [
            [-0.15, 0.628],
            [-0.42, 0.687],
            [-0.69, 0.742],
          ],
          0.05,
          0.105,
        ],
        [
          [
            [-0.97, 0.19],
            [-1.02, 0.31],
            [-1.075, 0.45],
          ],
          0.042,
          0.095,
        ],
      ] as [Point[], number, number][]
    ).map(([path, width, thickness]) =>
      stripe(ribbon(path, width, 0.008), PALETTE.sharkSheen, thickness),
    ),
  ]);
  figure.translate(0.15, 0, 0);
  return merge([ripple(0.85, 0.42), leanBack(figure)]);
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
  const eye = merge([
    card(ellipse(0.5, 0.33, 0.07, 0.07, 12), PALETTE.cream, 0.25),
    card(ellipse(0.52, 0.325, 0.035, 0.035, 8), PALETTE.ink, 0.27),
  ]);
  const mouth = card(
    [
      [0.3, 0.19],
      [0.755, 0.235],
      [0.74, 0.19],
      [0.31, 0.15],
    ],
    PALETTE.cream,
    0.24,
  );
  const fountain = card(
    [
      [0.18, 0.52],
      [0.32, 0.52],
      [0.33, 0.77],
      [0.44, 0.88],
      [0.55, 0.87],
      [0.62, 0.74],
      [0.68, 0.91],
      [0.57, 1.03],
      [0.42, 1.03],
      [0.34, 0.95],
      [0.36, 1.07],
      [0.25, 1.19],
      [0.14, 1.07],
      [0.16, 0.95],
      [0.08, 1.03],
      [-0.07, 1.03],
      [-0.18, 0.91],
      [-0.12, 0.74],
      [-0.05, 0.87],
      [0.06, 0.88],
      [0.17, 0.77],
    ],
    PALETTE.finWhite,
    0.07,
  );
  // 水流線從噴氣孔往三個方向散開
  const flows = (
    [
      [
        [0.25, 0.55],
        [0.25, 0.85],
        [0.25, 1.15],
      ],
      [
        [0.27, 0.62],
        [0.31, 0.83],
        [0.43, 0.955],
        [0.56, 0.955],
        [0.625, 0.84],
      ],
      [
        [0.23, 0.62],
        [0.19, 0.83],
        [0.07, 0.955],
        [-0.06, 0.955],
        [-0.125, 0.84],
      ],
    ] as Point[][]
  ).map((path) => stripe(ribbon(path, 0.052, 0.022), PALETTE.whaleStripe, 0.086));
  const spout = merge([fountain, ...flows]);
  // 以噴氣孔為中心放大，遠看才認得出藍色線條
  spout.translate(-0.25, -0.52, 0).scale(1.25, 1.25, 1).translate(0.25, 0.52, 0);
  return merge([ripple(0.9, 0.45), leanBack(merge([profile, belly, eye, mouth, spout]))]);
}
