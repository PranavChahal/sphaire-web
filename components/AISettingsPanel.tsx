import React from 'react';
import useAISettings from '../store/aiSettingsStore';

const OPENAI_PRESETS = {
  chat: ['gpt-5.6-sol', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o4-mini'],
  vision: ['gpt-4o', 'gpt-4o-mini'],
  embedding: ['text-embedding-3-small', 'text-embedding-3-large'],
};
const OLLAMA_PRESETS = {
  chat: ['qwen2.5-coder:14b', 'qwen2.5-coder:32b', 'llama3.1:8b', 'deepseek-coder-v2'],
  vision: ['llava:13b', 'llama3.2-vision', 'bakllava'],
  embedding: ['nomic-embed-text', 'mxbai-embed-large'],
};

export default function AISettingsPanel({ onClose }: { onClose?: () => void }) {
  const { config, useServerKey, setProvider, setConfig, setUseServerKey, reset } = useAISettings();
  const isOllama = config.provider === 'ollama';
  const presets = isOllama ? OLLAMA_PRESETS : OPENAI_PRESETS;

  return (
    <div className="st-ai-settings">
      <div className="st-label">Provider</div>
      <div className="st-seg">
        <button className={!isOllama ? 'st-active' : ''} onClick={() => setProvider('openai')}>
          Cloud / compatible
        </button>
        <button className={isOllama ? 'st-active' : ''} onClick={() => setProvider('ollama')}>
          Local · Ollama
        </button>
      </div>

      {!isOllama && (
        <>
          <label className="st-ai-check">
            <input
              type="checkbox"
              checked={useServerKey}
              onChange={(event) => setUseServerKey(event.target.checked)}
            />
            <span>Use Sphaire&apos;s configured provider. Turn this off to bring your own key or endpoint.</span>
          </label>
          {!useServerKey && (
            <>
              <Field
                label="API key"
                type="password"
                placeholder="sk-…"
                value={config.apiKey || ''}
                onChange={(value) => setConfig({ apiKey: value })}
              />
              <Field
                label="Compatible base URL"
                placeholder="https://api.openai.com/v1"
                value={config.baseUrl || ''}
                onChange={(value) => setConfig({ baseUrl: value })}
              />
              <p className="st-hint">
                {config.apiKey
                  ? 'Custom key ready. Creation, repair, and review use this provider.'
                  : 'Add a provider key to enable creation and repair.'}
                {' '}Your key stays in this browser and is sent only to the provider you select.
              </p>
            </>
          )}
        </>
      )}

      {isOllama && (
        <>
          <Field
            label="Ollama URL"
            placeholder="http://localhost:11434"
            value={config.baseUrl || ''}
            onChange={(value) => setConfig({ baseUrl: value })}
          />
          <p className="st-hint">Models and prompts stay on your machine when Ollama is running locally.</p>
        </>
      )}

      <ModelField label="CAD + chat model" value={config.chatModel} presets={presets.chat} onChange={(value) => setConfig({ chatModel: value })} />
      <ModelField label="Visual review model" value={config.visionModel} presets={presets.vision} onChange={(value) => setConfig({ visionModel: value })} />
      <ModelField label="Generation memory model" value={config.embeddingModel} presets={presets.embedding} onChange={(value) => setConfig({ embeddingModel: value })} />

      <button className="st-textbtn st-ai-reset" onClick={reset}>Restore defaults</button>
      {onClose && <button className="st-textbtn st-ai-reset" onClick={onClose}>Done</button>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="st-label">{label}</span>
      <input className="st-input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ModelField({ label, value, presets, onChange }: { label: string; value: string; presets: string[]; onChange: (value: string) => void }) {
  const id = `models-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label>
      <span className="st-label">{label}</span>
      <input className="st-input" value={value} list={id} onChange={(event) => onChange(event.target.value)} />
      <datalist id={id}>{presets.map((preset) => <option key={preset} value={preset} />)}</datalist>
    </label>
  );
}
