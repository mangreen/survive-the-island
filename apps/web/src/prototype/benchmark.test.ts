import { describe, expect, it, vi } from 'vitest';
import type { BoardScene } from '../scene/boardScene';
import { BENCHMARK_RUNS, formatReport, runBenchmark } from './benchmark';

function fakeScene() {
  return {
    setQuality: vi.fn(),
    setLoad: vi.fn(),
    resetView: vi.fn(),
    measure: vi.fn(async () => ({
      fps: 42.25,
      lowFps: 31,
      frames: 169,
      drawCalls: 40,
      triangles: 90000,
    })),
    info: () => ({
      gpu: 'Test GPU',
      width: 1280,
      height: 700,
      pixelRatio: 1.5,
      devicePixelRatio: 2,
    }),
  } as unknown as BoardScene;
}

describe('效能量測', () => {
  it('涵蓋兩種棋子數與三種畫質', async () => {
    const results = await runBenchmark(fakeScene(), () => {});
    expect(results.map((r) => `${r.load}/${r.quality}`)).toEqual([
      'start/high',
      'start/medium',
      'start/low',
      'full/high',
      'full/medium',
      'full/low',
    ]);
  });

  it('量測被中斷時往外丟出錯誤', async () => {
    const scene = fakeScene();
    vi.mocked(scene.measure).mockRejectedValueOnce(new Error('hidden'));
    await expect(runBenchmark(scene, () => {})).rejects.toThrow('hidden');
  });

  it('報告包含環境與每一組結果', async () => {
    const results = await runBenchmark(fakeScene(), () => {});
    const report = formatReport(results, { userAgent: 'UA', date: '2026-11-27' });
    expect(report).toContain('GPU：Test GPU');
    expect(report).toContain('full | low | 1.50 | 42.3 | 31.0 | 40 | 90000');
    expect(report.split('\n').filter((line) => /^(start|full) /.test(line))).toHaveLength(
      BENCHMARK_RUNS.length,
    );
  });
});
