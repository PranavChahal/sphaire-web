import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Mesh } from '@babylonjs/core';
import useStore, { Shape } from '../../store/store';
import useSceneStore from '../../store/sceneStore';
import { useStudioStore, StudioTool } from './studioStore';
import { useModelImport } from '../../hooks/useModelImport';
import { useModal } from '../../contexts/ModalContext';
import { exportGLTF, exportOBJ, exportSTL, downloadBlob } from '../../utils/exporters';
import { ViewportProduction } from '../ViewportProduction';
import AISettingsPanel from '../AISettingsPanel';
import CommandBar from './CommandBar';
import Inspector from './Inspector';
import CreatePanel from './panels/CreatePanel';
import ObjectsPanel from './panels/ObjectsPanel';
import EditPanel from './panels/EditPanel';
import MaterialPanel from './panels/MaterialPanel';
import LightPanel from './panels/LightPanel';
import CameraPanel from './panels/CameraPanel';
import CodePanel from './panels/CodePanel';
import LibraryPanel from './panels/LibraryPanel';
import VoicePanel from './panels/VoicePanel';
import {
  IconCamera,
  IconCheck,
  IconClose,
  IconCode,
  IconCube,
  IconEdit,
  IconExport,
  IconGear,
  IconImport,
  IconLayers,
  IconLight,
  IconMic,
  IconRedo,
  IconSearch,
  IconShare,
  IconSpinner,
  IconTexture,
  IconTrash,
  IconUndo,
} from './icons';

type ExportFormat = 'STL' | 'OBJ' | 'GLB';

const TOOLS: Array<{
  id: StudioTool;
  label: string;
  icon: React.ReactNode;
  section?: 'secondary';
}> = [
  { id: 'create', label: 'Create primitives', icon: <IconCube size={17} /> },
  { id: 'objects', label: 'Objects', icon: <IconLayers size={17} /> },
  { id: 'edit', label: 'Edit geometry', icon: <IconEdit size={17} /> },
  { id: 'material', label: 'Materials', icon: <IconTexture size={17} /> },
  { id: 'light', label: 'Lighting', icon: <IconLight size={17} /> },
  { id: 'camera', label: 'Render camera', icon: <IconCamera size={17} /> },
  { id: 'code', label: 'Code & checks', icon: <IconCode size={17} /> },
  { id: 'library', label: 'Model library', icon: <IconSearch size={17} />, section: 'secondary' },
  { id: 'voice', label: 'Voice', icon: <IconMic size={17} /> },
];

const PANELS: Record<StudioTool, React.ComponentType<{ onClose: () => void }>> = {
  create: CreatePanel,
  objects: ObjectsPanel,
  edit: EditPanel,
  material: MaterialPanel,
  light: LightPanel,
  camera: CameraPanel,
  code: CodePanel,
  library: LibraryPanel,
  voice: VoicePanel,
};

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

const isExportable = (mesh: any) => {
  if (!mesh?.geometry || mesh.isVisible === false || mesh.getClassName?.() === 'LinesMesh') return false;
  const name = String(mesh.name || '').toLowerCase();
  return !['transparentgrid', 'centeraxis', 'groundplane', 'helper', 'gizmo', 'camera', 'light', '__critic'].some(
    (pattern) => name.includes(pattern)
  );
};

const serializeShape = (shape: Shape) => {
  const safe: any = { ...shape };
  delete safe.babylonMesh;
  delete safe.occShape;
  if ('meshData' in safe && safe.meshData) {
    safe.meshData = {
      positions: Array.from(safe.meshData.positions || []),
      indices: Array.from(safe.meshData.indices || []),
    };
  }
  return safe;
};

const hydrateShape = (value: any): Shape => {
  const shape = { ...value };
  if (shape.meshData) {
    shape.meshData = {
      positions: new Float32Array(shape.meshData.positions || []),
      indices: new Uint32Array(shape.meshData.indices || []),
    };
  }
  return shape as Shape;
};

const StudioShell: React.FC<{ fileId?: string }> = ({ fileId }) => {
  const shapes = useStore((s) => s.shapes);
  const selectedShapeId = useStore((s) => s.selectedShapeId);
  const clearShapes = useStore((s) => s.clearShapes);
  const addDirect = useStore((s) => s._addShapeDirect);
  const undoRedo = useStore((s) => s._undoRedoSystem);
  const scene = useSceneStore((s) => s.scene);
  const selectedMeshes = useSceneStore((s) => s.selectedMeshes);
  const {
    activeTool,
    settingsOpen,
    paletteOpen,
    lastBuild,
    projectName,
    toggleTool,
    closeTool,
    setSettingsOpen,
    setPaletteOpen,
    setProjectName,
  } = useStudioStore();
  const { importFile, isImporting, progress } = useModelImport();
  const { showAlert, showConfirm } = useModal();

  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const saveProject = useCallback(() => {
    const payload = {
      format: 'sphaire-project',
      version: 2,
      name: projectName,
      savedAt: new Date().toISOString(),
      objects: shapes.map(serializeShape),
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `${(projectName || 'untitled').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.sphaire`
    );
  }, [projectName, shapes]);

  const loadProject = useCallback(
    async (file: File) => {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data?.objects)) throw new Error('This is not a valid Sphaire project.');
      const apply = () => {
        clearShapes();
        data.objects.map(hydrateShape).forEach(addDirect);
        setProjectName(data.name || file.name.replace(/\.(sphaire|json)$/i, '') || 'Untitled');
        undoRedo?.clearHistory();
      };
      if (shapes.length > 0) {
        showConfirm('Open project', 'Replace the objects currently on the canvas?', apply);
      } else {
        apply();
      }
    },
    [addDirect, clearShapes, setProjectName, shapes.length, showConfirm, undoRedo]
  );

  const onFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        if (/\.(sphaire|json)$/i.test(file.name)) await loadProject(file);
        else await importFile(file);
      } catch (error: any) {
        showAlert('Could not open file', error?.message || 'The file could not be opened.', 'error');
      }
    },
    [importFile, loadProject, showAlert]
  );

  const exportScene = useCallback(
    async (format: ExportFormat) => {
      if (!scene) {
        showAlert('Canvas is still loading', 'Try the export again in a moment.', 'warning');
        return;
      }
      const meshes = scene.meshes.filter(isExportable) as Mesh[];
      if (meshes.length === 0) {
        showAlert('Nothing to export', 'Create or import an object first.', 'warning');
        return;
      }
      setExporting(format);
      setExportOpen(false);
      try {
        const basename = (projectName || 'sphaire-model').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
        if (format === 'STL') downloadBlob(exportSTL(meshes), `${basename}.stl`);
        if (format === 'OBJ') downloadBlob(exportOBJ(meshes), `${basename}.obj`);
        if (format === 'GLB') {
          const ids = new Set(meshes.map((mesh) => mesh.uniqueId));
          const blob = await exportGLTF(scene, (node: any) => {
            if (ids.has(node.uniqueId)) return true;
            return !!node.getDescendants?.().some((child: any) => ids.has(child.uniqueId));
          });
          downloadBlob(blob, `${basename}.glb`);
        }
      } catch (error: any) {
        showAlert('Export failed', error?.message || 'The model could not be exported.', 'error');
      } finally {
        setExporting(null);
      }
    },
    [projectName, scene, showAlert]
  );

  const copyShareLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    showAlert('Link copied', 'The studio link is ready to share.', 'success');
  }, [showAlert]);

  const clearScene = useCallback(() => {
    if (!shapes.length) return;
    showConfirm('Clear canvas', `Remove all ${shapes.length} object${shapes.length === 1 ? '' : 's'}?`, clearShapes);
  }, [clearShapes, shapes.length, showConfirm]);

  useEffect(() => {
    const tick = () =>
      setHistoryState({ canUndo: !!undoRedo?.canUndo, canRedo: !!undoRedo?.canRedo });
    tick();
    const timer = window.setInterval(tick, 180);
    return () => window.clearInterval(timer);
  }, [undoRedo]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(!useStudioStore.getState().paletteOpen);
        return;
      }
      if (event.key === 'Escape') {
        setExportOpen(false);
        setShareOpen(false);
        setSettingsOpen(false);
        setPaletteOpen(false);
        return;
      }
      if (isTypingTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) undoRedo?.redo();
        else undoRedo?.undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveProject, setPaletteOpen, setSettingsOpen, undoRedo]);

  const paletteActions = useMemo(
    () => [
      ...TOOLS.map((tool) => ({
        label: `Open ${tool.label}`,
        icon: tool.icon,
        hint: '',
        run: () => toggleTool(tool.id),
      })),
      { label: 'Import model or project', icon: <IconImport size={16} />, hint: 'I', run: () => fileInputRef.current?.click() },
      { label: 'Save project', icon: <IconCheck size={16} />, hint: '⌘S', run: saveProject },
      { label: 'Export STL', icon: <IconExport size={16} />, hint: '', run: () => exportScene('STL') },
      { label: 'AI provider settings', icon: <IconGear size={16} />, hint: '', run: () => setSettingsOpen(true) },
      { label: 'Clear canvas', icon: <IconTrash size={16} />, hint: '', run: clearScene },
    ],
    [clearScene, exportScene, saveProject, setSettingsOpen, toggleTool]
  );
  const visibleActions = paletteActions.filter((action) =>
    action.label.toLowerCase().includes(paletteQuery.trim().toLowerCase())
  );

  const ActivePanel = activeTool ? PANELS[activeTool] : null;
  const activeShape = shapes.find((shape) => shape.id === selectedShapeId);
  const ready = !!scene;

  return (
    <main className="st-root">
      <div className="st-viewport">
        <ViewportProduction id={fileId ? `design-viewport-${fileId}` : 'studio-viewport'} />
      </div>

      <header className="st-layer st-glass st-topbar">
        <div className="st-brand">
          <img className="st-brand-logo" src="/sphaire-img/sphaire.png" alt="" aria-hidden="true" />
          <span className="st-brand-name">Sphaire</span>
          <input
            className="st-project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="Project name"
          />
        </div>
        <div className="st-topbar-group">
          <a
            className="st-open-source"
            href="https://github.com/sphaire3d/shaire-web-V2-beta"
            target="_blank"
            rel="noreferrer"
            aria-label="Sphaire open-source repository on GitHub"
          >
            <span>Open source</span>
            <span className="st-open-source-url">github.com/sphaire3d ↗</span>
          </a>
          <span className="st-topbar-sep" />
          <button className="st-iconbtn" data-tip="Undo · ⌘Z" disabled={!historyState.canUndo} onClick={() => undoRedo?.undo()}>
            <IconUndo size={16} />
          </button>
          <button className="st-iconbtn" data-tip="Redo · ⇧⌘Z" disabled={!historyState.canRedo} onClick={() => undoRedo?.redo()}>
            <IconRedo size={16} />
          </button>
          <span className="st-topbar-sep" />
          <button className="st-textbtn st-top-action" onClick={() => fileInputRef.current?.click()}>
            {isImporting ? <IconSpinner size={15} /> : <IconImport size={15} />}
            <span>{isImporting ? progress || 'Opening…' : 'Open'}</span>
          </button>
          <button className="st-textbtn st-top-action" onClick={saveProject} disabled={shapes.length === 0}>
            <IconCheck size={15} /> <span>Save</span>
          </button>
          <div className="st-menu-anchor" ref={exportRef}>
            <button className={`st-textbtn st-top-action ${exportOpen ? 'st-active' : ''}`} onClick={() => setExportOpen((value) => !value)}>
              {exporting ? <IconSpinner size={15} /> : <IconExport size={15} />} <span>Export</span>
            </button>
            {exportOpen && (
              <div className="st-glass st-menu">
                {([
                  ['STL', '3D printing'],
                  ['OBJ', 'Universal mesh'],
                  ['GLB', 'Materials + scene'],
                ] as Array<[ExportFormat, string]>).map(([format, description]) => (
                  <button key={format} onClick={() => exportScene(format)}>
                    <strong>{format}</strong><span>{description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="st-iconbtn" data-tip="Share" onClick={() => setShareOpen(true)}>
            <IconShare size={16} />
          </button>
          <button className="st-iconbtn" data-tip="Settings" onClick={() => setSettingsOpen(true)}>
            <IconGear size={16} />
          </button>
          <button className="st-shortcut" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">⌘ K</button>
        </div>
      </header>

      <nav className="st-layer st-glass st-dock" aria-label="Studio tools">
        {TOOLS.map((tool, index) => (
          <React.Fragment key={tool.id}>
            {tool.section === 'secondary' && index > 0 && <span className="st-dock-sep" />}
            <button
              className={`st-iconbtn ${activeTool === tool.id ? 'st-active' : ''}`}
              data-tip={tool.label}
              data-tip-side="right"
              aria-label={tool.label}
              aria-pressed={activeTool === tool.id}
              onClick={() => toggleTool(tool.id)}
            >
              {tool.icon}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {ActivePanel && <ActivePanel onClose={closeTool} />}
      {activeShape && <Inspector />}

      {ready && shapes.length === 0 && !activeTool && (
        <section className="st-layer st-welcome">
          <img className="st-welcome-logo" src="/sphaire-img/sphaire.png" alt="" aria-hidden="true" />
          <h1>What will you make?</h1>
          <p>Describe it below, start from a primitive, or bring in a model.</p>
          <div>
            <button onClick={() => toggleTool('create')}>Start with a shape</button>
            <button onClick={() => fileInputRef.current?.click()}>Open a file</button>
          </div>
        </section>
      )}

      <CommandBar />

      <div className="st-layer st-status">
        <span className={`st-chip ${ready ? 'st-ok' : ''}`}>
          <span className={`st-status-dot ${ready ? 'st-ready' : ''}`} />
          {ready ? 'Ready' : 'Starting'}
        </span>
        <button className="st-chip" onClick={() => toggleTool('objects')}>
          {shapes.length} object{shapes.length === 1 ? '' : 's'}
        </button>
        {selectedMeshes.length > 0 && <span className="st-chip">{selectedMeshes.length} selected</span>}
        {lastBuild && (
          <button className={`st-chip ${lastBuild.success ? 'st-ok' : 'st-warn'}`} onClick={() => toggleTool('code')}>
            {lastBuild.success ? 'Verified build' : 'Review build'}
          </button>
        )}
      </div>

      {settingsOpen && (
        <>
          <button className="st-scrim" aria-label="Close settings" onClick={() => setSettingsOpen(false)} />
          <aside className="st-sheet" aria-label="Settings">
            <div className="st-sheet-head">
              <div><span className="st-sheet-eyebrow">Studio</span><div className="st-sheet-title">Intelligence settings</div></div>
              <button className="st-iconbtn" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><IconClose size={16} /></button>
            </div>
            <div className="st-sheet-body">
              <AISettingsPanel />
              <div className="st-capability-card">
                <span className="st-label">Closed-loop creation</span>
                <p>Sphaire safely executes CAD code, validates geometry, checks manufacturability, and visually reviews the result before it reaches your canvas.</p>
                <div><span>Sandbox</span><span>DFM</span><span>Vision</span><span>Memory</span></div>
              </div>
            </div>
          </aside>
        </>
      )}

      {shareOpen && (
        <div className="st-palette-wrap" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShareOpen(false)}>
          <section className="st-share-card" role="dialog" aria-modal="true" aria-label="Share project">
            <div className="st-share-icon"><IconShare size={22} /></div>
            <h2>Share {projectName || 'this project'}</h2>
            <p>Send the studio link to invite someone in. To send the actual geometry, include the compact Sphaire project file.</p>
            <div className="st-share-link"><span>{typeof window !== 'undefined' ? window.location.href : ''}</span><button onClick={copyShareLink}>Copy</button></div>
            <button className="st-cb-generate" onClick={saveProject} disabled={!shapes.length}>Download project file</button>
            <button className="st-textbtn" onClick={() => setShareOpen(false)}>Done</button>
          </section>
        </div>
      )}

      {paletteOpen && (
        <div className="st-palette-wrap" onMouseDown={(event) => event.target === event.currentTarget && setPaletteOpen(false)}>
          <section className="st-palette" role="dialog" aria-modal="true" aria-label="Commands">
            <input autoFocus value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} placeholder="Jump to a tool or action…" />
            <div className="st-palette-list">
              {visibleActions.map((action) => (
                <button
                  className="st-palette-item"
                  key={action.label}
                  onClick={() => { action.run(); setPaletteOpen(false); setPaletteQuery(''); }}
                >
                  {action.icon}<span>{action.label}</span>{action.hint && <kbd>{action.hint}</kbd>}
                </button>
              ))}
              {visibleActions.length === 0 && <div className="st-empty">No matching commands.</div>}
            </div>
          </section>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".sphaire,.json,.glb,.gltf,.obj,.stl"
        onChange={onFile}
      />
    </main>
  );
};

export default StudioShell;
