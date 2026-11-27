export interface FrameSummary {
  /** 平均每秒影格數 */
  readonly fps: number;
  /** 最慢的 1% 影格換算的 FPS（至少取 1 格），用來看卡頓 */
  readonly lowFps: number;
  readonly frames: number;
}

/** 由每格耗時（毫秒）算出摘要 */
export function summarizeFrames(frameTimes: readonly number[]): FrameSummary {
  if (frameTimes.length === 0) return { fps: 0, lowFps: 0, frames: 0 };
  const total = frameTimes.reduce((sum, ms) => sum + ms, 0);
  const slowest = [...frameTimes].sort((a, b) => b - a);
  const count = Math.max(1, Math.floor(frameTimes.length / 100));
  const slowTotal = slowest.slice(0, count).reduce((sum, ms) => sum + ms, 0);
  return {
    fps: (1000 * frameTimes.length) / total,
    lowFps: (1000 * count) / slowTotal,
    frames: frameTimes.length,
  };
}
