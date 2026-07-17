/**
 * The Command Bar — the one place you talk to Sphaire.
 *
 * Describe an object; the closed-loop engine classifies, recalls proven
 * examples, generates CAD code, executes it in a sandbox, validates the
 * geometry, checks manufacturability, looks at the render, and self-corrects.
 * Progress unfolds live inside the bar.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import useStore from '../../store/store';
import { useStudioStore } from './studioStore';
import {
  enhancedBuild,
  BuildStageLog,
  EnhancedBuildResult,
  Backend,
} from '../../services/pipeline/enhancedBuilder';
import { captureMeshData } from '../../services/vision/sceneCapture';
import { extractParametersFromCode } from '../../utils/parameterExtractor';
import { useModelImport } from '../../hooks/useModelImport';
import { Label, Toggle } from './ui';
import { IconMic, IconTune, IconSpinner, IconClose } from './icons';

type Phase = 'idle' | 'running' | 'done' | 'failed';

const STAGE_NAMES: Array<[RegExp, string]> = [
  [/^classify$/, 'Understanding'],
  [/^mesh-gen$/, 'Sculpting'],
  [/^plan$/, 'Planning'],
  [/^rag$/, 'Recalling'],
  [/^execute/, 'Building'],
  [/^dfm/, 'Verifying'],
  [/^vision/, 'Looking'],
  [/^repair/, 'Refining'],
  [/^converged$/, 'Converged'],
];

const friendlyStage = (stage: string) =>
  STAGE_NAMES.find(([re]) => re.test(stage))?.[1] ?? stage;

const CommandBar: React.FC = () => {
  const addParametricShape = useStore((s) => s.addParametricShape);
  const { setLastBuild, toggleTool } = useStudioStore();
  const { importFromUrl } = useModelImport();

  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stages, setStages] = useState<BuildStageLog[]>([]);
  const [result, setResult] = useState<EnhancedBuildResult | null>(null);
  const [tuneOpen, setTuneOpen] = useState(false);

  // Tuning
  const [backend, setBackend] = useState<Backend>('opencascade');
  const [fabProfile, setFabProfile] = useState('fdm');
  const [enableDFM, setEnableDFM] = useState(true);
  const [enableVision, setEnableVision] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    const request = prompt.trim();
    if (!request || phase === 'running') return;

    setPhase('running');
    setStages([]);
    setResult(null);
    setTuneOpen(false);

    try {
      const buildResult = await withCommandDeadline(
        enhancedBuild(request, {
          backend,
          fabProfile,
          enableDFM,
          enableVision,
          maxIterations: 3,
          onProgress: (log) => {
            setStages((prev) => [...prev, log]);
            requestAnimationFrame(() => {
              progressRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
            });
          },
          renderAndCapture: (candidate) => captureMeshData(candidate, { views: 3, size: 512 }),
        }),
        90000
      );

      setResult(buildResult);
      setLastBuild(buildResult);

      if (buildResult.route === 'organic' && buildResult.glbDataUrl) {
        await importFromUrl(buildResult.glbDataUrl, `${request.slice(0, 24) || 'generated'}.glb`);
      } else if (buildResult.mesh) {
        const { parameters, parameterMetadata } = extractParametersFromCode(buildResult.code || '');
        const generatedShapeType = /\b(gear|cog|sprocket)\b/i.test(request) ? 'gear' : 'custom';
        const meshArray = Array.isArray(buildResult.mesh) ? buildResult.mesh : [buildResult.mesh];
        meshArray.forEach((data: any, i: number) => {
          if (data?.positions && data?.indices) {
            addParametricShape({
              type: 'parametric',
              shapeType: generatedShapeType,
              parameters,
              constructionCode: buildResult.code || '',
              version: 1,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scaling: { x: 1, y: 1, z: 1 },
              occShape: null,
              name: data.name || request.slice(0, 32) || `generated-${i}`,
              meshData: {
                positions: new Float32Array(data.positions),
                indices: new Uint32Array(data.indices),
              },
              metadata: parameterMetadata,
            });
          }
        });
      }

      setPhase(buildResult.success ? 'done' : 'failed');
      if (buildResult.success) setPrompt('');
    } catch (e: any) {
      setStages((prev) => [
        ...prev,
        { stage: 'error', ok: false, detail: e?.message || 'Generation failed.' },
      ]);
      setPhase('failed');
    }
  }, [prompt, phase, backend, fabProfile, enableDFM, enableVision, addParametricShape, importFromUrl, setLastBuild]);

  const dismissResult = () => {
    setPhase('idle');
    setStages([]);
    setResult(null);
  };

  const running = phase === 'running';
  const lastStage = stages[stages.length - 1];

  const resultChips = useMemo(() => {
    if (!result) return null;
    const chips: React.ReactNode[] = [];
    chips.push(
      <span key="status" className={`st-chip ${result.success ? 'st-ok' : 'st-warn'}`}>
        {result.success
          ? `Built in ${result.iterations} pass${result.iterations > 1 ? 'es' : ''}`
          : 'Best effort'}
      </span>
    );
    if (result.dfm) {
      chips.push(
        <span key="dfm" className={`st-chip ${result.dfm.passed ? 'st-ok' : 'st-warn'}`}>
          {result.dfm.passed ? 'Printable' : `${result.dfm.findings.length} DFM note(s)`}
        </span>
      );
    }
    if (result.vision && !result.vision.skipped) {
      chips.push(
        <span key="vision" className={`st-chip ${result.vision.matches ? 'st-ok' : 'st-warn'}`}>
          Looks {result.vision.matches ? 'right' : 'off'} · {Math.round(result.vision.score * 100)}%
        </span>
      );
    }
    if (result.code) {
      chips.push(
        <button key="code" className="st-chip" onClick={() => toggleTool('code')}>
          View code
        </button>
      );
    }
    return chips;
  }, [result, toggleTool]);

  return (
    <div className="st-layer st-glass st-commandbar">
      <div className="st-cb-main">
        <input
          ref={inputRef}
          id="st-prompt"
          className="st-cb-input"
          placeholder="Describe anything — “a gear with 24 teeth”, “a phone stand”…"
          value={prompt}
          disabled={running}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
        />
        <button
          className="st-iconbtn"
          data-tip="Voice"
          onClick={() => toggleTool('voice')}
        >
          <IconMic size={17} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className={`st-iconbtn ${tuneOpen ? 'st-active' : ''}`}
            data-tip="Engine settings"
            onClick={() => setTuneOpen((v) => !v)}
          >
            <IconTune size={17} />
          </button>
          {tuneOpen && (
            <div className="st-glass st-popover">
              <Label>Engine</Label>
              <div className="st-seg">
                <button
                  className={backend === 'opencascade' ? 'st-active' : ''}
                  onClick={() => setBackend('opencascade')}
                >
                  OpenCascade
                </button>
                <button
                  className={backend === 'replicad' ? 'st-active' : ''}
                  onClick={() => setBackend('replicad')}
                >
                  Replicad
                </button>
              </div>
              <Label>Made for</Label>
              <div className="st-seg">
                {(['fdm', 'sla', 'cnc'] as const).map((p) => (
                  <button
                    key={p}
                    className={fabProfile === p ? 'st-active' : ''}
                    onClick={() => setFabProfile(p)}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <Toggle on={enableDFM} onChange={setEnableDFM} label="Verify manufacturability" />
                <Toggle on={enableVision} onChange={setEnableVision} label="Visual self-check" />
              </div>
            </div>
          )}
        </div>
        <button className="st-cb-generate" disabled={!prompt.trim() || running} onClick={generate}>
          {running ? <IconSpinner size={16} /> : 'Create'}
        </button>
      </div>

      {running && stages.length > 0 && (
        <div className="st-cb-progress" ref={progressRef}>
          {stages.map((s, i) => {
            const isLast = i === stages.length - 1;
            return (
              <div className="st-stage" key={i}>
                <span
                  className={`st-stage-dot ${
                    isLast && running ? 'st-live' : s.ok ? 'st-ok' : 'st-fail'
                  }`}
                />
                <div style={{ minWidth: 0 }}>
                  <span className="st-stage-name">{friendlyStage(s.stage)}</span>
                  <span className="st-stage-detail">{s.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(phase === 'done' || phase === 'failed') && result && (
        <div className="st-cb-result">
          {resultChips}
          {phase === 'failed' && !result && lastStage && (
            <span className="st-chip st-err">{lastStage.detail}</span>
          )}
          <button
            className="st-iconbtn"
            style={{ marginLeft: 'auto', width: 26, height: 26 }}
            onClick={dismissResult}
            aria-label="Dismiss"
          >
            <IconClose size={13} />
          </button>
        </div>
      )}

      {phase === 'failed' && !result && stages.length > 0 && (
        <div className="st-cb-result">
          <span className="st-chip st-err">{stages[stages.length - 1].detail}</span>
          <button
            className="st-iconbtn"
            style={{ marginLeft: 'auto', width: 26, height: 26 }}
            onClick={dismissResult}
            aria-label="Dismiss"
          >
            <IconClose size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

function withCommandDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Creation took too long. The build was stopped safely; please try again.')),
      ms
    );
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export default CommandBar;
