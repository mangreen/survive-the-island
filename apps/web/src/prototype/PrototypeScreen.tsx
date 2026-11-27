import { useCallback, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { RoomSettingsHelp } from '../room-settings/RoomSettingsHelp';
import type { BoardScene, Quality, RenderStats } from '../scene/boardScene';
import type { Load } from '../scene/demoLayout';
import { BENCHMARK_RUNS, formatReport, runBenchmark } from './benchmark';
import { Stage } from './Stage';

type Measurement =
  | { phase: 'idle' }
  | { phase: 'running'; done: number }
  | { phase: 'done'; report: string }
  | { phase: 'error'; message: string };

const text = t.prototype;

function Segmented<T extends string>(props: {
  label: string;
  values: Readonly<Record<T, string>>;
  selected: T;
  disabled: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={props.label}>
      <span>{props.label}</span>
      {(Object.keys(props.values) as T[]).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={props.selected === value}
          disabled={props.disabled}
          onClick={() => props.onSelect(value)}
        >
          {props.values[value]}
        </button>
      ))}
    </div>
  );
}

function Panel(props: { title: string; onClose?: (() => void) | undefined; children: ReactNode }) {
  return (
    <div className="panel" role="dialog" aria-label={props.title}>
      <header>
        <h2>{props.title}</h2>
        {props.onClose && (
          <button type="button" onClick={props.onClose}>
            {text.close}
          </button>
        )}
      </header>
      <div className="panel-body">{props.children}</div>
    </div>
  );
}

export function PrototypeScreen() {
  const scene = useRef<BoardScene | null>(null);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [quality, setQuality] = useState<Quality>('high');
  const [load, setLoad] = useState<Load>('start');
  const [grid, setGrid] = useState(false);
  const [motion, setMotion] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement>({ phase: 'idle' });
  const [copyStatus, setCopyStatus] = useState<string>(text.benchmark.copy);
  const busy = measurement.phase === 'running';

  const onScene = useCallback((next: BoardScene | null) => {
    scene.current = next;
  }, []);
  const onError = useCallback(() => setFailed(true), []);

  async function measure() {
    const current = scene.current;
    if (!current) return;
    setShowSettings(false);
    setCopyStatus(text.benchmark.copy);
    setMeasurement({ phase: 'running', done: 0 });
    try {
      const results = await runBenchmark(current, (done) =>
        setMeasurement({ phase: 'running', done }),
      );
      setMeasurement({
        phase: 'done',
        report: formatReport(results, {
          userAgent: navigator.userAgent,
          date: new Date().toLocaleString('zh-TW'),
        }),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      const message =
        reason === 'hidden'
          ? text.benchmark.hidden
          : reason === 'aborted'
            ? text.benchmark.aborted
            : text.benchmark.failed;
      setMeasurement({ phase: 'error', message });
    } finally {
      // 還原成量測前的設定
      current.setLoad(load);
      current.setQuality(quality);
    }
  }

  async function copy(report: string) {
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus(text.benchmark.copied);
    } catch {
      setCopyStatus(text.benchmark.copyFailed);
    }
  }

  return (
    <main className="prototype">
      <header className="top-bar">
        <h1>{t.appTitle}</h1>
        <p>{text.subtitle}</p>
      </header>

      <section className="stage">
        <Stage onScene={onScene} onStats={setStats} onError={onError} />
        {failed && <p className="stage-error">{text.webglError}</p>}
        {stats && (
          <dl className="live-stats">
            <div>
              <dt>{text.liveFps}</dt>
              <dd>{Math.round(stats.fps)}</dd>
            </div>
            <div>
              <dt>{text.liveLow}</dt>
              <dd>{Math.round(stats.lowFps)}</dd>
            </div>
            <div>
              <dt>{text.drawCalls}</dt>
              <dd>{stats.drawCalls}</dd>
            </div>
            <div>
              <dt>{text.triangles}</dt>
              <dd>{Math.round(stats.triangles / 1000)}k</dd>
            </div>
          </dl>
        )}
        {grid && <p className="grid-legend">{text.gridLegend}</p>}

        {showSettings && (
          <Panel title={text.roomSettings} onClose={() => setShowSettings(false)}>
            <RoomSettingsHelp />
          </Panel>
        )}
        {measurement.phase !== 'idle' && (
          <Panel
            title={text.benchmark.title}
            onClose={busy ? undefined : () => setMeasurement({ phase: 'idle' })}
          >
            <p role="status">
              {measurement.phase === 'running' &&
                text.benchmark.running(measurement.done + 1, BENCHMARK_RUNS.length)}
              {measurement.phase === 'done' && text.benchmark.done}
              {measurement.phase === 'error' && measurement.message}
            </p>
            {measurement.phase === 'done' && (
              <>
                <textarea readOnly rows={14} value={measurement.report} />
                <button type="button" onClick={() => void copy(measurement.report)}>
                  {copyStatus}
                </button>
              </>
            )}
          </Panel>
        )}
      </section>

      <nav className="controls">
        <Segmented
          label={text.quality}
          values={text.qualities}
          selected={quality}
          disabled={busy}
          onSelect={(value) => {
            setQuality(value);
            scene.current?.setQuality(value);
          }}
        />
        <Segmented
          label={text.load}
          values={text.loads}
          selected={load}
          disabled={busy}
          onSelect={(value) => {
            setLoad(value);
            scene.current?.setLoad(value);
          }}
        />
        <button
          type="button"
          aria-pressed={grid}
          onClick={() => {
            setGrid(!grid);
            scene.current?.setGrid(!grid);
          }}
        >
          {text.grid}
        </button>
        <button
          type="button"
          aria-pressed={motion}
          onClick={() => {
            setMotion(!motion);
            scene.current?.setMotion(!motion);
          }}
        >
          {text.motion}
        </button>
        <button type="button" disabled={busy} onClick={() => scene.current?.resetView()}>
          {text.resetView}
        </button>
        <button type="button" className="primary" disabled={busy || failed} onClick={measure}>
          {text.measure}
        </button>
        <button type="button" disabled={busy} onClick={() => setShowSettings(true)}>
          {text.roomSettings}
        </button>
      </nav>
    </main>
  );
}
