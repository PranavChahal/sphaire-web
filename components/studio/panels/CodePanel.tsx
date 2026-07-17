import React, { useEffect, useMemo, useState } from 'react';
import useStore, { Shape } from '../../../store/store';
import { useStudioStore } from '../studioStore';
import { Drawer } from '../ui';
import { IconCheck, IconSpinner } from '../icons';
import { safeExecuteOCC, staticScan } from '../../../services/sandbox/safeExecutor';
import { replicadExecutor } from '../../../services/backends/replicadExecutor';
import { extractParametersFromCode } from '../../../utils/parameterExtractor';

type Tab = 'source' | 'checks';

const formatNumber = (value: number) => Number(value.toFixed(4));

/**
 * Primitives are stored as lightweight scene objects rather than OCC meshes, but
 * they should still have useful, editable construction source. Keep the generated
 * code executable by the same OpenCascade path as AI-authored geometry.
 */
const primitiveSource = (shape?: Shape) => {
  if (!shape) return '';
  if (shape.type === 'box') {
    const { width, height, depth } = shape.dimensions;
    return `const width = ${formatNumber(width)};
const height = ${formatNumber(height)};
const depth = ${formatNumber(depth)};

let shape = occ.createBox(width, height, depth);
shape = occ.translate(shape, -width / 2, -height / 2, -depth / 2);
return shape;`;
  }
  if (shape.type === 'sphere') {
    return `const radius = ${formatNumber(shape.radius)};

return occ.createSphere(radius);`;
  }
  if (shape.type === 'cylinder') {
    return `const radius = ${formatNumber(shape.diameter / 2)};
const height = ${formatNumber(shape.height)};

let shape = occ.createCylinder(radius, height);
shape = occ.translate(shape, 0, 0, -height / 2);
return shape;`;
  }
  return '';
};

const CodePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { shapes, selectedShapeId, addParametricShape } = useStore();
  const lastBuild = useStudioStore((state) => state.lastBuild);
  const [tab, setTab] = useState<Tab>('source');
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const selected = shapes.find((shape) => shape.id === selectedShapeId);
  const code =
    (selected && selected.type === 'parametric' && selected.constructionCode) ||
    primitiveSource(selected) ||
    lastBuild?.code ||
    '';
  const [draft, setDraft] = useState(code);

  useEffect(() => setDraft(code), [code]);

  const source =
    selected && ['box', 'sphere', 'cylinder', 'parametric'].includes(selected.type)
      ? selected.name || `${selected.type[0].toUpperCase()}${selected.type.slice(1)} · selected object`
      : lastBuild?.code
        ? 'Last generation'
        : null;

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const runDraft = async () => {
    if (!draft.trim() || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const backend = selected && selected.type !== 'parametric'
        ? 'opencascade'
        : lastBuild?.backend || 'opencascade';
      let mesh: any;
      if (backend === 'replicad') {
        const scan = staticScan(draft);
        if (!scan.safe) throw new Error(`Blocked: ${scan.reason}`);
        mesh = await replicadExecutor.executeCode(draft);
      } else {
        const result = await safeExecuteOCC(draft);
        if (!result.ok) throw new Error(result.error || 'The code did not produce geometry.');
        mesh = result.mesh;
      }

      const { parameters, parameterMetadata } = extractParametersFromCode(draft);
      const items = Array.isArray(mesh) ? mesh : [mesh];
      let created = 0;
      items.forEach((item: any, index: number) => {
        if (!item?.positions || !item?.indices) return;
        addParametricShape({
          type: 'parametric',
          shapeType: 'custom',
          parameters,
          constructionCode: draft,
          version: 1,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scaling: { x: 1, y: 1, z: 1 },
          occShape: null,
          name: item.name || `Code result ${index + 1}`,
          meshData: {
            positions: new Float32Array(item.positions),
            indices: new Uint32Array(item.indices),
          },
          metadata: parameterMetadata,
        });
        created += 1;
      });
      if (!created) throw new Error('The code ran but returned no mesh data.');
    } catch (error: any) {
      setRunError(error?.message || 'Code execution failed.');
    } finally {
      setRunning(false);
    }
  };

  const findingCount = lastBuild?.dfm?.findings.length || 0;
  const checkLabel = useMemo(() => {
    if (!lastBuild) return 'Checks';
    if (lastBuild.success) return 'Checks · Passed';
    return `Checks · ${findingCount || 'Review'}`;
  }, [findingCount, lastBuild]);

  return (
    <Drawer title="Code & checks" onClose={onClose} className="st-wide">
      <div className="st-seg st-code-tabs">
        <button className={tab === 'source' ? 'st-active' : ''} onClick={() => setTab('source')}>Source</button>
        <button className={tab === 'checks' ? 'st-active' : ''} onClick={() => setTab('checks')}>{checkLabel}</button>
      </div>

      {tab === 'source' && (
        !code ? (
          <div className="st-empty">Select a generated object — its editable construction code will appear here.</div>
        ) : (
          <div className="st-code-layout">
            <div className="st-code-meta">
              <span>{source}</span>
              <span>{selected && selected.type !== 'parametric' ? 'OpenCascade' : lastBuild?.backend === 'replicad' ? 'Replicad' : 'OpenCascade'}</span>
            </div>
            <textarea className="st-code st-code-edit" value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} />
            {runError && <p className="st-hint" style={{ color: 'var(--st-err)' }}>{runError}</p>}
            <div className="st-code-actions">
              <button className="st-chip" onClick={copy}>{copied ? <><IconCheck size={12} /> Copied</> : 'Copy'}</button>
              <button className="st-cb-generate" disabled={running || !draft.trim()} onClick={runDraft}>
                {running ? <><IconSpinner size={13} /> Building</> : 'Build from code'}
              </button>
            </div>
          </div>
        )
      )}

      {tab === 'checks' && <ChecksReport />}
    </Drawer>
  );
};

const ChecksReport: React.FC = () => {
  const result = useStudioStore((state) => state.lastBuild);
  if (!result) return <div className="st-empty">Create something with the command bar to see its execution, geometry, DFM, and visual-review trail.</div>;

  return (
    <div className="st-checks">
      <div className={`st-review-hero ${result.success ? 'st-passed' : 'st-review'}`}>
        <IconCheck size={17} />
        <div>
          <strong>{result.success ? 'Verified and ready' : 'Best effort — review suggested'}</strong>
          <span>{result.iterations} build pass{result.iterations === 1 ? '' : 'es'} · {result.backend || result.route}</span>
        </div>
      </div>

      <div className="st-label">Build trail</div>
      <div className="st-check-list">
        {result.log.map((entry, index) => (
          <div className="st-check-row" key={`${entry.stage}-${index}`}>
            <span className={`st-stage-dot ${entry.ok ? 'st-ok' : 'st-fail'}`} />
            <div><strong>{entry.stage.replace(/#(\d+)/, ' · pass $1')}</strong><p>{entry.detail}</p></div>
          </div>
        ))}
      </div>

      {result.dfm && (
        <>
          <div className="st-label">Manufacturability · {result.dfm.profile.toUpperCase()}</div>
          <p className="st-check-summary">{result.dfm.summary}</p>
          {result.dfm.findings.map((finding, index) => (
            <div className={`st-finding st-${finding.severity}`} key={`${finding.ruleId}-${index}`}>
              <strong>{finding.message}</strong>
              {finding.suggestion && <p>{finding.suggestion}</p>}
            </div>
          ))}
          {result.dfm.findings.length === 0 && <div className="st-finding st-info"><strong>No blocking manufacturing issues found.</strong></div>}
        </>
      )}

      {result.vision && !result.vision.skipped && (
        <>
          <div className="st-label">Visual review · {Math.round(result.vision.score * 100)}%</div>
          <p className="st-check-summary">{result.vision.critique}</p>
          {result.vision.issues.map((issue, index) => <div className="st-finding st-warning" key={index}><strong>{issue}</strong></div>)}
        </>
      )}
    </div>
  );
};

export default CodePanel;
