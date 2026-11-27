import { useEffect, useRef } from 'react';
import { t } from '../i18n';
import { createBoardScene, type BoardScene, type RenderStats } from '../scene/boardScene';

interface StageProps {
  /** 場景建立與銷毀時通知外層 */
  readonly onScene: (scene: BoardScene | null) => void;
  readonly onStats: (stats: RenderStats) => void;
  readonly onError: () => void;
}

export function Stage({ onScene, onStats, onError }: StageProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    // canvas 隨 effect 建立與移除，避免重用已釋放的 WebGL context
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', t.prototype.stageLabel);
    container.appendChild(canvas);
    let scene: BoardScene | null = null;
    try {
      scene = createBoardScene(canvas, onStats);
      onScene(scene);
    } catch (error) {
      console.error(error);
      onError();
    }
    return () => {
      onScene(null);
      scene?.dispose();
      canvas.remove();
    };
  }, [onScene, onStats, onError]);

  return <div className="stage-canvas" ref={host} />;
}
