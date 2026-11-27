/** 四角的安全島：分層的剪紙沙灘與草地、碼頭、樹，以及可上岸格的框線。 */
import type * as THREE from 'three';
import { HEX_RADIUS, PIERS, SAFE_ISLES, toWorld } from '../board/atlantis';
import { ellipse, hexagon, jitter, merge, place, slab, textured, type Point } from '../paper/cut';
import { PALETTE } from '../paper/palette';
import { tree } from '../paper/pieces';
import { between, createRng } from '../paper/random';

export const ISLE_TOP = 0.1;

export function safeIsles(): THREE.BufferGeometry {
  const rng = createRng(11);
  const parts: THREE.BufferGeometry[] = [];
  for (const [isle, docks] of SAFE_ISLES.entries()) {
    const sx = Math.sign(docks[0].c);
    const sz = Math.sign(docks[0].r);
    const blob = (x: number, z: number, rx: number, rz: number) =>
      jitter(ellipse(sx * x, sz * z, rx, rz, 18), 0.16, rng, 2);
    const shallows = slab(
      blob(12.5, 10.2, 5.2, 4.6),
      PALETTE.seaLight,
      0.003,
      0.012,
      PALETTE.seaFoam,
    );
    parts.push(
      textured(shallows, 'water'),
      textured(slab(blob(12.5, 10.2, 4.7, 4.1), PALETTE.sand, 0.016, 0.044), 'sand'),
      textured(slab(blob(13.8, 11.3, 3.1, 2.7), PALETTE.grass, 0.062, 0.07), 'grass'),
    );
    for (let i = 0; i < 9; i++) {
      parts.push(
        place(
          tree(between(rng, 0.9, 1.5), rng),
          sx * between(rng, 12.6, 14.8),
          0.13,
          sz * between(rng, 10.2, 12),
          rng() * Math.PI,
        ),
      );
    }

    for (const dock of docks) {
      const { x, z } = toWorld(dock);
      const corners = hexagon(HEX_RADIUS * 0.94);
      const inner = hexagon(HEX_RADIUS * 0.84);
      corners.forEach((a, i) => {
        const j = (i + 1) % corners.length;
        const edge: Point[] = [a, corners[j]!, inner[j]!, inner[i]!].map(([dx, dz]): Point => [
          x + dx,
          z + dz,
        ]);
        parts.push(slab(edge, PALETTE.cream, 0.062, 0.025));
      });
    }

    const pier = toWorld(PIERS[isle]!);
    for (let i = 0; i < 6; i++) {
      const px = pier.x - sx * (i * 0.2 - 0.5);
      const pz = pier.z - sz * (i * 0.17 - 0.45);
      const plank: Point[] = [
        [px - 0.3, pz + sx * sz * 0.22],
        [px - 0.2, pz + sx * sz * 0.32],
        [px + 0.3, pz - sx * sz * 0.22],
        [px + 0.2, pz - sx * sz * 0.32],
      ];
      parts.push(slab(plank, i % 2 ? PALETTE.wood : PALETTE.woodDark, 0.09, 0.04));
    }
  }
  return merge(parts);
}
