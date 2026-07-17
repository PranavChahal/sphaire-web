/**
 * Library — ten thousand real-world models, one search box.
 * (Thingi10K via the local search worker + storage proxy.)
 */

import React, { useRef, useState } from 'react';
import { useThingiSearch } from '../../../hooks/useThingiSearch';
import { useModelImport } from '../../../hooks/useModelImport';
import { Drawer } from '../ui';
import { IconSearch, IconSpinner, IconCube } from '../icons';

const LibraryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { searchState, search } = useThingiSearch({ limit: 24 });
  const { importFromUrl, isImporting, progress } = useModelImport();
  const [query, setQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQueryChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const importModel = async (model: any) => {
    setLoadingId(model.id);
    try {
      const apiPath = model.path.replace('/Volumes/Untitled/Thingi10K/', '');
      await importFromUrl(`/api/thingi10k/${apiPath}`, model.filename);
    } catch (e) {
      console.error('Library import failed:', e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Drawer title="Library" onClose={onClose}>
      <div className="st-row" style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 11, top: 9, color: 'var(--st-text-3)' }}>
          <IconSearch size={15} />
        </span>
        <input
          className="st-input"
          style={{ paddingLeft: 34 }}
          placeholder="Search 10,000 models…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {isImporting && (
        <div className="st-chip" style={{ marginBottom: 10 }}>
          <IconSpinner size={12} /> {progress || 'Importing…'}
        </div>
      )}

      {searchState.isLoading && <div className="st-empty">Searching…</div>}

      {!searchState.isLoading && query && searchState.results.length === 0 && searchState.hasSearched && (
        <div className="st-empty">No models match “{query}”.</div>
      )}

      {!query && (
        <div className="st-empty">
          Try “gear”, “bracket”, “vase”, “screw”…
        </div>
      )}

      {searchState.results.map((model: any) => (
        <div key={model.id} className="st-objrow" onClick={() => !loadingId && importModel(model)}>
          <div className="st-lib-thumb">
            {model.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={model.thumbnail} alt="" loading="lazy" />
            ) : (
              <IconCube size={17} />
            )}
          </div>
          <span className="st-objrow-name">{model.name}</span>
          {loadingId === model.id ? (
            <IconSpinner size={14} />
          ) : (
            <span className="st-objrow-type">{model.format}</span>
          )}
        </div>
      ))}
    </Drawer>
  );
};

export default LibraryPanel;
