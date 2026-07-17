import { useState, useEffect, useCallback, useRef } from 'react';
import { ThingiDoc, SearchResult, SearchOptions, SearchState, SearchHookReturn } from '../types/search';
import type { SearchMessage, SearchResponse } from '../workers/search.worker';

// Public CDN URL for the search index (override via env for self-hosting).
const SEARCH_INDEX_URL =
  process.env.NEXT_PUBLIC_THINGI_INDEX_URL ||
  'https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/meta/search_index.json';

export const useThingiSearch = (options: SearchOptions = {}): SearchHookReturn => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    hasSearched: false
  });
  
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef<number>(0);
  const pendingSearches = useRef<Map<string, (response: SearchResponse) => void>>(new Map());

  // Initialize Web Worker and load search index
  useEffect(() => {
    // Initialize Web Worker
    try {
      workerRef.current = new Worker(new URL('../workers/search.worker.ts', import.meta.url));
      
      // Handle worker messages
      workerRef.current.onmessage = (event: MessageEvent<SearchResponse>) => {
        const { type, data, id } = event.data;
        const resolver = pendingSearches.current.get(id);
        
        if (resolver) {
          resolver(event.data);
          pendingSearches.current.delete(id);
        }

        switch (type) {
          case 'INDEX_READY':
            // Search worker initialized
            break;
          case 'ERROR':
            console.error('Search worker error:', data?.error);
            setSearchState(prev => ({ ...prev, error: data?.error || 'Search worker error' }));
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Web Worker error:', error);
        setSearchState(prev => ({ 
          ...prev, 
          error: 'Search worker failed to initialize' 
        }));
      };
    } catch (error) {
      console.error('Failed to create search worker:', error);
      setSearchState(prev => ({ 
        ...prev, 
        error: 'Web Workers not supported in this browser' 
      }));
      return;
    }

    // Load search index
    const loadSearchIndex = async () => {
      try {
        console.log('Loading search index...');
        const response = await fetch(SEARCH_INDEX_URL);

        if (!response.ok) {
          throw new Error(`Failed to load search index: ${response.status}`);
        }

        const index: ThingiDoc[] = await response.json();
        // Search index loaded
        
        // Send index to worker
        if (workerRef.current) {
          const messageId = (++messageIdRef.current).toString();
          workerRef.current.postMessage({
            type: 'INIT_INDEX',
            data: { index },
            id: messageId
          } as SearchMessage);
        }
      } catch (error) {
        console.error('Failed to load search index:', error);
        setSearchState((prev: SearchState) => ({ 
          ...prev, 
          error: 'Failed to load search index. Please check your connection.' 
        }));
      }
    };

    loadSearchIndex();

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingSearches.current.clear();
    };
  }, []);

  // Send message to worker and return promise
  const sendWorkerMessage = useCallback((message: SearchMessage): Promise<SearchResponse> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve({ type: 'ERROR', data: { error: 'Worker not initialized' }, id: message.id });
        return;
      }
      
      pendingSearches.current.set(message.id, resolve);
      workerRef.current.postMessage(message);
    });
  }, []);

  const search = useCallback(async (query: string) => {
    setSearchState(prev => ({ 
      ...prev, 
      query, 
      isLoading: true, 
      error: null,
      hasSearched: true 
    }));

    // Clear results if query is empty
    if (!query.trim()) {
      if (workerRef.current) {
        const messageId = (++messageIdRef.current).toString();
        await sendWorkerMessage({
          type: 'CLEAR',
          id: messageId
        });
      }
      
      setSearchState(prev => ({ 
        ...prev, 
        results: [], 
        isLoading: false,
        hasSearched: false 
      }));
      return;
    }

    // Perform search via worker
    if (!workerRef.current) {
      setSearchState(prev => ({ 
        ...prev, 
        results: [], 
        isLoading: false,
        error: 'Search worker not ready yet' 
      }));
      return;
    }

    try {
      const messageId = (++messageIdRef.current).toString();
      const response = await sendWorkerMessage({
        type: 'SEARCH',
        data: { 
          query,
          options: {
            limit: options.limit ?? 10,
            threshold: options.threshold,
            keys: options.keys
          }
        },
        id: messageId
      });

      if (response.type === 'ERROR') {
        throw new Error(response.data?.error || 'Search failed');
      }

      const results: SearchResult[] = response.data?.results || [];
      
      setSearchState(prev => ({ 
        ...prev, 
        results, 
        isLoading: false 
      }));

      console.log(`Search for "${query}" found ${results.length} results`);
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({ 
        ...prev, 
        results: [], 
        isLoading: false,
        error: 'Search failed. Please try again.' 
      }));
    }
  }, [sendWorkerMessage, options.limit, options.threshold, options.keys]);

  const clearSearch = useCallback(() => {
    setSearchState({
      query: '',
      results: [],
      isLoading: false,
      error: null,
      hasSearched: false
    });
  }, []);

  const selectResult = useCallback((result: SearchResult) => {
    console.log('Selected model:', result.name);
    // This will be handled by the component using this hook
  }, []);

  return {
    searchState,
    search,
    clearSearch,
    selectResult
  };
};
