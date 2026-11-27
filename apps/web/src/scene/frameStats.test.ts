import { describe, expect, it } from 'vitest';
import { summarizeFrames } from './frameStats';

describe('summarizeFrames', () => {
  it('沒有影格時回傳 0', () => {
    expect(summarizeFrames([])).toEqual({ fps: 0, lowFps: 0, frames: 0 });
  });

  it('固定 20ms 就是 50 FPS', () => {
    const result = summarizeFrames(Array<number>(100).fill(20));
    expect(result.fps).toBeCloseTo(50);
    expect(result.lowFps).toBeCloseTo(50);
  });

  it('偶發卡頓會反映在最慢 1%', () => {
    const result = summarizeFrames([...Array<number>(99).fill(10), 100]);
    expect(result.lowFps).toBeCloseTo(10);
    expect(result.fps).toBeGreaterThan(80);
  });
});
