/**
 * 剪紙的基本形狀。每片紙都是有厚度的平面：正反面用紙色，切邊用較深的顏色。
 * 顏色寫在頂點上，整個場景因此能共用同一個材質，再合併幾何以減少 draw call。
 * 方法參考 papercraft（.claude/skills/papercraft），程式為本專案自行撰寫。
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette';
import { between, type Rng } from './random';
import { SURFACES, type Surface } from './surfaces';

export type Point = readonly [number, number];

/** 沿多邊形邊緣加入手剪的不平整 */
export function jitter(points: readonly Point[], amount: number, rng: Rng, steps = 3): Point[] {
  return points.flatMap((a, i) => {
    const b = points[(i + 1) % points.length]!;
    return Array.from({ length: steps }, (_, s): Point => {
      const t = s / steps;
      const wobble = s === 0 ? amount * 0.4 : amount;
      return [
        a[0] + (b[0] - a[0]) * t + between(rng, -wobble, wobble),
        a[1] + (b[1] - a[1]) * t + between(rng, -wobble, wobble),
      ];
    });
  });
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, sides = 12): Point[] {
  return Array.from({ length: sides }, (_, i): Point => {
    const angle = (i / sides) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

/** 尖頂六角形 */
export const hexagon = (radius: number): Point[] =>
  Array.from({ length: 6 }, (_, i): Point => {
    const angle = Math.PI / 6 + (i * Math.PI) / 3;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });

function paint(geometry: THREE.BufferGeometry, face: string, edge: string): void {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const faceColor = new THREE.Color(face);
  const edgeColor = new THREE.Color(edge);
  // ExtrudeGeometry 的 group 0 是正反面，group 1 是側面
  for (const group of geometry.groups) {
    const color = group.materialIndex === 1 ? edgeColor : faceColor;
    for (let i = group.start; i < group.start + group.count; i++) color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // 預設是素面紙；textured() 才會標上地面紙紋
  addSurfaceAttribute(geometry);
  geometry.clearGroups();
}

function addSurfaceAttribute(geometry: THREE.BufferGeometry): THREE.BufferAttribute {
  const weights = new Uint8Array(geometry.getAttribute('position').count * SURFACES.length);
  const attribute = new THREE.BufferAttribute(weights, SURFACES.length, true);
  geometry.setAttribute('surface', attribute);
  return attribute;
}

/** 把整片紙標成某種地面紙紋（只有高畫質看得到） */
export function textured<T extends THREE.BufferGeometry>(geometry: T, surface: Surface): T {
  const existing = geometry.getAttribute('surface') as THREE.BufferAttribute | undefined;
  const attribute = existing ?? addSurfaceAttribute(geometry);
  const channel = SURFACES.indexOf(surface);
  for (let i = 0; i < attribute.count; i++) attribute.setComponent(i, channel, 1);
  return geometry;
}

export const edgeOf = (face: string): string =>
  `#${new THREE.Color(face).lerp(new THREE.Color(PALETTE.ink), 0.5).getHexString()}`;

/** 立著的紙片：輪廓畫在 xy 平面，厚度沿 z */
export function card(
  points: readonly Point[],
  color: string,
  thickness = 0.04,
  edge = edgeOf(color),
): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.translate(0, 0, -thickness / 2);
  paint(geometry, color, edge);
  return geometry;
}

/** 平放的紙片：輪廓是俯視的 (x, z)，底面在 y、往上長 thickness */
export function slab(
  points: readonly Point[],
  color: string,
  y: number,
  thickness: number,
  edge = edgeOf(color),
): THREE.BufferGeometry {
  const flipped = points.map(([x, z]): Point => [x, -z]);
  const geometry = card(flipped, color, thickness, edge);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y + thickness / 2, 0);
  return geometry;
}

/** 兩片十字插接的紙片，從任何方向看都有體積 */
export function cross(
  points: readonly Point[],
  color: string,
  thickness = 0.04,
): THREE.BufferGeometry {
  const first = card(points, color, thickness);
  const second = card(points, color, thickness);
  second.rotateY(Math.PI / 2);
  return merge([first, second]);
}

export function place<T extends THREE.BufferGeometry>(
  geometry: T,
  x: number,
  y: number,
  z: number,
  yaw = 0,
): T {
  geometry.rotateY(yaw);
  geometry.translate(x, y, z);
  return geometry;
}

/** 合併後釋放原本的幾何 */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('紙片幾何的屬性不一致，無法合併');
  for (const part of parts) part.dispose();
  return merged;
}
