import * as THREE from 'three';
import { createRng } from './random';

/** 程式產生的紙纖維紋理，不使用任何外部圖片 */
export function createGrainTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法建立 2D canvas');
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, size, size);
  const rng = createRng(7);
  for (let i = 0; i < size * 14; i++) {
    const light = rng() > 0.5;
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.5)' : 'rgba(90,70,50,0.09)';
    ctx.lineWidth = 0.6 + rng() * 0.8;
    const x = rng() * size;
    const y = rng() * size;
    const angle = rng() * Math.PI;
    const length = 1 + rng() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.55, 0.55);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 全霧面：只有漫射光，沒有高光與反射 */
export const createPaperMaterial = (grain: THREE.Texture): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ vertexColors: true, map: grain });
