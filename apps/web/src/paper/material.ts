import * as THREE from 'three';
import { createRng } from './random';
import { MASK_HALF, MASK_SIZE } from './strengthMap';
import { SURFACE_SIZE, createSurfaceData } from './surfaces';

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

export function createSurfaceTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(createSurfaceData(), SURFACE_SIZE, SURFACE_SIZE);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** 紙紋濃淡分布圖，內容由 createStrengthData 產生；超出範圍沿用邊緣值 */
export function createStrengthTexture(data: Uint8Array): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, MASK_SIZE, MASK_SIZE, THREE.RedFormat);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export interface SurfaceDetail {
  readonly detailMap: THREE.IUniform<THREE.Texture>;
  readonly strengthMap: THREE.IUniform<THREE.Texture>;
  /** 一個世界單位佔貼圖的比例：越小紋路越大 */
  readonly detailScale: THREE.IUniform<number>;
  /** 0 表示關閉；切換畫質時只改這個值，不用重新編譯 shader */
  readonly detailStrength: THREE.IUniform<number>;
}

export const surfaceDetail = (
  map: THREE.Texture,
  strengths: THREE.Texture,
  tileSize: number,
): SurfaceDetail => ({
  detailMap: { value: map },
  strengthMap: { value: strengths },
  detailScale: { value: 1 / tileSize },
  detailStrength: { value: 0 },
});

/**
 * 依頂點上的 surface 權重，用地面紙紋調整明暗。貼圖座標取世界位置：
 * 相鄰板塊的紋路不會重複，正面朝鏡頭的立紙片（山）也不會拉成直條。
 */
function addSurfaceDetail(material: THREE.Material, detail: SurfaceDetail): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, detail);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 surface;
uniform float detailScale;
varying vec4 vSurface;
varying vec2 vDetailUv;
varying vec2 vStrengthUv;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vec4 detailPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
detailPosition = instanceMatrix * detailPosition;
#endif
detailPosition = modelMatrix * detailPosition;
vSurface = surface;
vDetailUv = vec2(detailPosition.x, detailPosition.z - detailPosition.y) * detailScale;
vStrengthUv = (detailPosition.xz + ${MASK_HALF.toFixed(1)}) / ${(MASK_HALF * 2).toFixed(1)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D detailMap;
uniform sampler2D strengthMap;
uniform float detailStrength;
varying vec4 vSurface;
varying vec2 vDetailUv;
varying vec2 vStrengthUv;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float detail = dot(texture2D(detailMap, vDetailUv) - 128.0 / 255.0, vSurface);
float localStrength = texture2D(strengthMap, vStrengthUv).r;
diffuseColor.rgb *= max(0.0, 1.0 + detail * detailStrength * localStrength);`,
      );
  };
  material.customProgramCacheKey = () => 'paper-surface-detail';
}

/** 全霧面：只有漫射光，沒有高光與反射 */
export function createPaperMaterial(
  parameters: THREE.MeshLambertMaterialParameters,
  detail: SurfaceDetail,
): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial(parameters);
  addSurfaceDetail(material, detail);
  return material;
}
