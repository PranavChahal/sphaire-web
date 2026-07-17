/**
 * Persisted AI provider settings.
 *
 * Lets a user (on the hosted app or self-hosted) pick a provider, paste their own
 * API key, and choose models — all stored in localStorage so nothing is sent to
 * Sphaire's servers unless they use the default server-side key path.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ProviderConfig,
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_OLLAMA_CONFIG,
  ProviderKind,
} from '../services/providers/types';

interface AISettingsState {
  config: ProviderConfig;
  /** When true, use the server's env key instead of a browser-supplied one (hosted default). */
  useServerKey: boolean;
  setProvider: (provider: ProviderKind) => void;
  setConfig: (patch: Partial<ProviderConfig>) => void;
  setUseServerKey: (v: boolean) => void;
  reset: () => void;
}

const useAISettings = create<AISettingsState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_OPENAI_CONFIG,
      useServerKey: true,
      setProvider: (provider) =>
        set(() => ({
          config: provider === 'ollama' ? DEFAULT_OLLAMA_CONFIG : DEFAULT_OPENAI_CONFIG,
          // local provider can never use the server key
          useServerKey: provider === 'openai' ? get().useServerKey : false,
        })),
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setUseServerKey: (v) => set(() => ({ useServerKey: v })),
      reset: () => set(() => ({ config: DEFAULT_OPENAI_CONFIG, useServerKey: true })),
    }),
    { name: 'sphaire-ai-settings' }
  )
);

export default useAISettings;

/** Snapshot the current provider config for use outside React. */
export function getProviderConfig(): { config: ProviderConfig; useServerKey: boolean } {
  const s = useAISettings.getState();
  return { config: s.config, useServerKey: s.useServerKey };
}
