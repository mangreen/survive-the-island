import type { Load } from '../scene/demoLayout';
import type { BoardScene, Quality, RenderInfo, RenderStats } from '../scene/boardScene';

export interface BenchmarkRun {
  readonly load: Load;
  readonly quality: Quality;
}

export const BENCHMARK_RUNS: readonly BenchmarkRun[] = (['start', 'full'] as const).flatMap(
  (load) => (['high', 'medium', 'low'] as const).map((quality) => ({ load, quality })),
);

export const WARMUP_MS = 1000;
export const SAMPLE_MS = 4000;

export type BenchmarkResult = BenchmarkRun & RenderStats & RenderInfo;

export async function runBenchmark(
  scene: BoardScene,
  onProgress: (done: number) => void,
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  for (const run of BENCHMARK_RUNS) {
    onProgress(results.length);
    scene.setLoad(run.load);
    scene.setQuality(run.quality);
    scene.resetView();
    const stats = await scene.measure(WARMUP_MS, SAMPLE_MS);
    results.push({ ...run, ...stats, ...scene.info() });
  }
  return results;
}

/** 純文字報告，方便整段貼回 PR 或對話 */
export function formatReport(
  results: readonly BenchmarkResult[],
  environment: { userAgent: string; date: string },
): string {
  const first = results[0];
  if (!first) return '';
  const header = [
    '絕命島 M0 效能量測',
    `時間：${environment.date}`,
    `瀏覽器：${environment.userAgent}`,
    `GPU：${first.gpu}`,
    `畫布：${first.width}×${first.height}（devicePixelRatio ${first.devicePixelRatio}）`,
    '',
    '棋子 | 畫質 | 像素比 | 平均FPS | 最慢1% | draw calls | 三角形',
  ];
  const rows = results.map((r) =>
    [
      r.load,
      r.quality,
      r.pixelRatio.toFixed(2),
      r.fps.toFixed(1),
      r.lowFps.toFixed(1),
      r.drawCalls,
      r.triangles,
    ].join(' | '),
  );
  return [...header, ...rows].join('\n');
}
