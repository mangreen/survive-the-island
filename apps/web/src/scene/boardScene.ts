/** M0 效能原型的 three.js 場景。React 只透過 BoardScene 介面控制它。 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CELLS, HEX_RADIUS, toWorld, type Hex, type Terrain } from '../board/atlantis';
import { textured } from '../paper/cut';
import {
  createGrainTexture,
  createPaperMaterial,
  createSurfaceTexture,
  surfaceDetail,
} from '../paper/material';
import { PALETTE, PLAYER_COLORS } from '../paper/palette';
import {
  EXPLORER_ON_TILE,
  TILE_TOP,
  TILE_YAW,
  boat,
  explorer,
  serpent,
  shark,
  tile,
  whale,
} from '../paper/pieces';
import { createRng } from '../paper/random';
import { demoLayout, type Load } from './demoLayout';
import { fitCamera } from './fitCamera';
import { summarizeFrames, type FrameSummary } from './frameStats';
import { GROUND_SIZE, createGridOverlayTexture, createSeaTexture } from './ground';
import { safeIsles } from './isles';

export type Quality = 'high' | 'medium' | 'low';

export const QUALITY: Readonly<
  Record<Quality, { maxPixelRatio: number; shadowMap: number; surfaceDetail: number }>
> = {
  // surfaceDetail 是地面紙紋的明暗強度，只有高畫質開啟
  high: { maxPixelRatio: 1.5, shadowMap: 2048, surfaceDetail: 1.7 },
  medium: { maxPixelRatio: 1.25, shadowMap: 1024, surfaceDetail: 0 },
  low: { maxPixelRatio: 1, shadowMap: 0, surfaceDetail: 0 },
};

export interface RenderStats extends FrameSummary {
  /** 含陰影繪製 */
  readonly drawCalls: number;
  readonly triangles: number;
}

export interface RenderInfo {
  readonly gpu: string;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly devicePixelRatio: number;
}

export interface BoardScene {
  setQuality(quality: Quality): void;
  setLoad(load: Load): void;
  setGrid(visible: boolean): void;
  setMotion(enabled: boolean): void;
  resetView(): void;
  /** 先暖機再取樣。分頁被隱藏會讓結果失真，此時 reject。 */
  measure(warmupMs: number, sampleMs: number): Promise<RenderStats>;
  info(): RenderInfo;
  dispose(): void;
}

interface Floating {
  readonly mesh: THREE.InstancedMesh;
  readonly bases: THREE.Matrix4[];
}

const BOARD_POINTS = CELLS.flatMap((hex) => {
  const { x, z } = toWorld(hex);
  return [
    new THREE.Vector3(x - 1, 0, z),
    new THREE.Vector3(x + 1, 0, z),
    new THREE.Vector3(x, 0, z - HEX_RADIUS),
    new THREE.Vector3(x, 0.6, z + HEX_RADIUS),
  ];
});

export function createBoardScene(
  canvas: HTMLCanvasElement,
  onStats: (stats: RenderStats) => void,
): BoardScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // 自己重置，統計才會包含陰影的 draw call
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.seaDeep);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 600);

  // 一盞暖色主光加上偏青的環境光，讓陰影帶有海的顏色而不是灰黑
  scene.add(new THREE.HemisphereLight('#e4f4f4', '#6f9a9c', 1.75));
  const sun = new THREE.DirectionalLight('#ffe9c4', 2.1);
  sun.position.set(-16, 22, 9);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {
    left: -18,
    right: 18,
    top: 16,
    bottom: -16,
    near: 1,
    far: 70,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const grain = createGrainTexture();
  const surfaceTexture = createSurfaceTexture();
  // 紙紋貼圖鋪滿的世界寬度（一格寬 2）。海面的摺痕比地面的顆粒大
  const landDetail = surfaceDetail(surfaceTexture, 5);
  const seaDetail = surfaceDetail(surfaceTexture, 9);
  const paper = createPaperMaterial({ vertexColors: true, map: grain }, landDetail);

  const seaTexture = createSeaTexture();
  const sea = new THREE.Mesh(
    textured(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE).rotateX(-Math.PI / 2), 'water'),
    createPaperMaterial({ map: seaTexture }, seaDetail),
  );
  sea.receiveShadow = true;
  const isles = new THREE.Mesh(safeIsles(), paper);
  isles.castShadow = isles.receiveShadow = true;
  scene.add(sea, isles);

  let gridMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;

  const rng = createRng(5);
  const TERRAINS: readonly Terrain[] = ['beach', 'forest', 'mountain'];
  // 每種地形剪幾個版本，用 instancing 畫，draw call 不隨板塊數增加
  const tileVariants = new Map(
    TERRAINS.map((terrain) => [terrain, Array.from({ length: 4 }, () => tile(terrain, rng))]),
  );
  const explorerShapes = PLAYER_COLORS.map((color) => explorer(color));
  const boatShape = boat();
  const serpentShape = serpent();
  const sharkShape = shark();
  const whaleShape = whale();

  const pieces = new THREE.Group();
  scene.add(pieces);
  let floating: Floating[] = [];

  function instances(geometry: THREE.BufferGeometry, matrices: THREE.Matrix4[], floats = false) {
    if (matrices.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, paper, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    pieces.add(mesh);
    if (floats) floating.push({ mesh, bases: matrices });
  }

  const at = (x: number, y: number, z: number, yaw = 0, size = 1) =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      new THREE.Vector3(size, size, size),
    );

  function buildPieces(load: Load) {
    for (const child of pieces.children) (child as THREE.InstancedMesh).dispose();
    pieces.clear();
    floating = [];
    const layout = demoLayout(load, 2026);
    const placeRng = createRng(99);

    const tileMatrices = new Map<THREE.BufferGeometry, THREE.Matrix4[]>();
    const heights = new Map<string, number>();
    for (const { hex, terrain } of layout.tiles) {
      const variants = tileVariants.get(terrain)!;
      const geometry = variants[Math.floor(placeRng() * variants.length)]!;
      const { x, z } = toWorld(hex);
      const list = tileMatrices.get(geometry) ?? [];
      list.push(at(x, 0, z, TILE_YAW));
      tileMatrices.set(geometry, list);
      heights.set(`${hex.c},${hex.r}`, TILE_TOP[terrain]);
    }
    for (const [geometry, matrices] of tileMatrices) instances(geometry, matrices);

    const byPlayer: THREE.Matrix4[][] = PLAYER_COLORS.map(() => []);
    for (const { hex, player, onTile } of layout.explorers) {
      const { x, z } = toWorld(hex);
      const y = onTile ? (heights.get(`${hex.c},${hex.r}`) ?? 0) : 0;
      // 站在板塊前半部，避免被樹和山擋住
      const { offsetZ, scale, yawRange } = EXPLORER_ON_TILE;
      const yaw = (placeRng() - 0.5) * 2 * yawRange;
      byPlayer[player]!.push(at(x, y, z + offsetZ, yaw, scale));
    }
    byPlayer.forEach((matrices, i) => instances(explorerShapes[i]!, matrices));

    const seaPieces = (
      geometry: THREE.BufferGeometry,
      hexes: readonly Hex[],
      spin: number,
      size: number,
    ) =>
      instances(
        geometry,
        hexes.map((hex) => {
          const { x, z } = toWorld(hex);
          return at(x, 0.1, z, (placeRng() - 0.5) * spin, size);
        }),
        true,
      );
    seaPieces(boatShape, layout.boats, Math.PI * 2, 1);
    seaPieces(serpentShape, layout.serpents, 0.7, 1.3);
    seaPieces(sharkShape, layout.sharks, 0.7, 1.15);
    seaPieces(whaleShape, layout.whales, 0.7, 1.05);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableRotate = false;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.addEventListener('change', () => {
    // 不讓棋盤被拖出畫面
    const clamped = controls.target.clone();
    clamped.x = THREE.MathUtils.clamp(clamped.x, -11, 11);
    clamped.z = THREE.MathUtils.clamp(clamped.z, -10, 10);
    camera.position.add(clamped.clone().sub(controls.target));
    controls.target.copy(clamped);
  });

  let quality: Quality = 'high';
  let width = 1;
  let height = 1;

  function resetView() {
    camera.aspect = width / height;
    // 直向畫面把鏡頭抬高，多用一點上下空間
    const elevation = camera.aspect < 1 ? 66 : 56;
    const margin = 0.01;
    const { distance, target } = fitCamera(camera, BOARD_POINTS, elevation, margin);
    controls.target.copy(target);
    controls.minDistance = distance * 0.3;
    controls.maxDistance = distance * 1.15;
    controls.update();
  }

  function applySurfaceDetail() {
    const strength = QUALITY[quality].surfaceDetail;
    landDetail.detailStrength.value = seaDetail.detailStrength.value = strength;
  }

  function applySize() {
    const ratio = Math.min(window.devicePixelRatio, QUALITY[quality].maxPixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
  }

  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    width = Math.max(1, Math.round(entry.contentRect.width));
    height = Math.max(1, Math.round(entry.contentRect.height));
    applySize();
    resetView();
  });
  observer.observe(canvas.parentElement ?? canvas);

  let motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bob = new THREE.Matrix4();
  const moved = new THREE.Matrix4();

  function animate(seconds: number) {
    for (const { mesh, bases } of floating) {
      bases.forEach((base, i) => {
        const offset = motion ? Math.sin(seconds * 1.6 + i * 1.7) * 0.035 : 0;
        bob.makeTranslation(0, offset, 0);
        mesh.setMatrixAt(i, moved.multiplyMatrices(bob, base));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  let sampler: ((frameMs: number) => void) | null = null;
  let recent: number[] = [];
  let last = 0;
  let lastReport = 0;
  let frame = 0;

  function render(now: number) {
    frame = requestAnimationFrame(render);
    const elapsed = last ? now - last : 0;
    last = now;
    animate(now / 1000);
    controls.update();
    renderer.info.reset();
    renderer.render(scene, camera);
    // 分頁切回來的第一格會非常長，不算進統計
    if (elapsed <= 0 || elapsed > 1000) return;
    sampler?.(elapsed);
    recent.push(elapsed);
    if (now - lastReport >= 500) {
      onStats({
        ...summarizeFrames(recent),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      });
      recent = [];
      lastReport = now;
    }
  }

  applySurfaceDetail();
  buildPieces('start');
  frame = requestAnimationFrame(render);

  let abortMeasure: (() => void) | null = null;

  return {
    setQuality(next) {
      quality = next;
      const { shadowMap } = QUALITY[next];
      applySurfaceDetail();
      sun.castShadow = shadowMap > 0;
      if (shadowMap > 0 && sun.shadow.mapSize.x !== shadowMap) {
        sun.shadow.mapSize.set(shadowMap, shadowMap);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
      applySize();
    },
    setLoad: buildPieces,
    setGrid(visible) {
      if (visible && !gridMesh) {
        gridMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({
            map: createGridOverlayTexture(),
            transparent: true,
            depthTest: false,
          }),
        );
        gridMesh.position.y = 0.01;
        gridMesh.renderOrder = 10;
        scene.add(gridMesh);
      }
      if (gridMesh) gridMesh.visible = visible;
    },
    setMotion(enabled) {
      motion = enabled;
    },
    resetView,
    measure(warmupMs, sampleMs) {
      abortMeasure?.();
      return new Promise((resolve, reject) => {
        const samples: number[] = [];
        let waited = 0;
        let sampled = 0;
        const finish = () => {
          sampler = null;
          abortMeasure = null;
          document.removeEventListener('visibilitychange', onHidden);
        };
        const fail = (reason: string) => {
          finish();
          reject(new Error(reason));
        };
        const onHidden = () => {
          if (document.hidden) fail('hidden');
        };
        document.addEventListener('visibilitychange', onHidden);
        abortMeasure = () => fail('aborted');
        sampler = (ms) => {
          if (waited < warmupMs) {
            waited += ms;
            return;
          }
          samples.push(ms);
          sampled += ms;
          if (sampled < sampleMs) return;
          finish();
          resolve({
            ...summarizeFrames(samples),
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
          });
        };
      });
    },
    info() {
      const gl = renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      return {
        gpu,
        width,
        height,
        pixelRatio: renderer.getPixelRatio(),
        devicePixelRatio: window.devicePixelRatio,
      };
    },
    dispose() {
      abortMeasure?.();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      const geometries = [
        ...[...tileVariants.values()].flat(),
        ...explorerShapes,
        boatShape,
        serpentShape,
        sharkShape,
        whaleShape,
        sea.geometry,
        isles.geometry,
      ];
      for (const geometry of geometries) geometry.dispose();
      for (const child of pieces.children) (child as THREE.InstancedMesh).dispose();
      if (gridMesh) {
        gridMesh.geometry.dispose();
        gridMesh.material.map?.dispose();
        gridMesh.material.dispose();
      }
      sea.material.dispose();
      seaTexture.dispose();
      paper.dispose();
      grain.dispose();
      surfaceTexture.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
