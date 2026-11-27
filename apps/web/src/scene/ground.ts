/** 印刷在底紙上的海面與格線，以及疊在上面的座標檢查圖層。全部由程式繪製。 */
import * as THREE from 'three';
import {
  CELLS,
  HEX_RADIUS,
  ISLAND_CELLS,
  SAFE_ISLES,
  SERPENT_STARTS,
  hexKey,
  toWorld,
  type Hex,
} from '../board/atlantis';
import { hexagon } from '../paper/cut';
import { PALETTE } from '../paper/palette';
import { between, createRng } from '../paper/random';

/** 底紙邊長（世界單位）。要大到任何畫面比例都看不到邊。 */
export const GROUND_SIZE = 60;
const PIXELS = 2048;
const SCALE = PIXELS / GROUND_SIZE;

function canvas2d(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PIXELS;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法建立 2D canvas');
  // 之後一律用世界座標畫
  ctx.setTransform(SCALE, 0, 0, SCALE, PIXELS / 2, PIXELS / 2);
  return [canvas, ctx];
}

function hexPath(ctx: CanvasRenderingContext2D, hex: Hex, radius: number): void {
  const { x, z } = toWorld(hex);
  ctx.beginPath();
  for (const [dx, dz] of hexagon(radius)) ctx.lineTo(x + dx, z + dz);
  ctx.closePath();
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createSeaTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d();
  const half = GROUND_SIZE / 2;
  ctx.fillStyle = PALETTE.seaDeep;
  ctx.fillRect(-half, -half, GROUND_SIZE, GROUND_SIZE);

  // 一層層剪下來的波浪紙片
  const rng = createRng(21);
  const inks = [PALETTE.sea, PALETTE.seaDeep, PALETTE.sea, PALETTE.seaLight];
  ctx.shadowColor = 'rgba(14,46,56,0.35)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  for (let i = 0; i < 520; i++) {
    const x = between(rng, -half, half);
    const z = between(rng, -half, half);
    const width = between(rng, 0.7, 2.8);
    ctx.globalAlpha = between(rng, 0.2, 0.5);
    ctx.fillStyle = inks[i % inks.length]!;
    ctx.beginPath();
    ctx.moveTo(x - width, z);
    ctx.quadraticCurveTo(x - width * 0.4, z - width * 0.34, x, z - width * 0.05);
    ctx.quadraticCurveTo(x + width * 0.5, z - width * 0.3, x + width, z);
    ctx.quadraticCurveTo(x, z + width * 0.16, x - width, z);
    ctx.fill();
  }
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;

  // 島嶼區的淺灘：板塊沉掉後仍看得出原本的範圍
  ctx.fillStyle = 'rgba(207,226,214,0.14)';
  for (const hex of ISLAND_CELLS) {
    hexPath(ctx, hex, HEX_RADIUS);
    ctx.fill();
  }

  ctx.strokeStyle = PALETTE.gridLine;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 0.065;
  for (const hex of CELLS) {
    hexPath(ctx, hex, HEX_RADIUS);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas);
}

/** 檢查用：每格座標、島嶼 40 格、安全島格、海蛇起點 */
export function createGridOverlayTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d();
  const island = new Set(ISLAND_CELLS.map(hexKey));
  const docks = new Set(SAFE_ISLES.flat().map(hexKey));
  const serpents = new Set(SERPENT_STARTS.map(hexKey));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 0.42px system-ui, sans-serif';
  for (const hex of CELLS) {
    const key = hexKey(hex);
    const { x, z } = toWorld(hex);
    hexPath(ctx, hex, HEX_RADIUS * 0.97);
    if (island.has(key) || docks.has(key)) {
      ctx.fillStyle = docks.has(key) ? 'rgba(60,230,180,0.4)' : 'rgba(255,150,40,0.3)';
      ctx.fill();
    }
    ctx.strokeStyle = '#ff4fd8';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    if (serpents.has(key)) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.arc(x, z, 0.68, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 0.09;
    ctx.strokeStyle = 'rgba(20,20,30,0.85)';
    ctx.strokeText(key, x, z);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(key, x, z);
  }
  return toTexture(canvas);
}
