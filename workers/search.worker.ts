import Fuse, { type IFuseOptions } from 'fuse.js';

export interface ThingiDoc {
  id: string;
  name: string;
  tags: string[];
  searchText: string;
  path: string;
  filename: string;
  format: string;
  [key: string]: any;
}

export interface SearchMessage {
  type: 'INIT_INDEX' | 'SEARCH' | 'CLEAR';
  data?: {
    index?: ThingiDoc[];
    query?: string;
    options?: {
      threshold?: number;
      limit?: number;
      keys?: string[];
    };
  };
  id: string;
}

export interface SearchResponse {
  type: 'INDEX_READY' | 'SEARCH_RESULTS' | 'ERROR';
  data?: any;
  id: string;
}

const DEFAULT_SEARCH_OPTIONS: IFuseOptions<ThingiDoc> = {
  threshold: 0.3,
  location: 0,
  distance: 100,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'tags', weight: 0.2 },
    { name: 'searchText', weight: 0.1 }
  ],
  includeScore: true,
  includeMatches: true
};

let fuse: Fuse<ThingiDoc> | null = null;

// Handle messages from main thread
self.onmessage = function(event: MessageEvent<SearchMessage>) {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'INIT_INDEX':
        if (data?.index) {
          console.log('Worker: Initializing Fuse.js with', data.index.length, 'items');
          fuse = new Fuse(data.index, DEFAULT_SEARCH_OPTIONS);
          
          self.postMessage({
            type: 'INDEX_READY',
            data: { ready: true, count: data.index.length },
            id
          } as SearchResponse);
        }
        break;

      case 'SEARCH':
        if (!fuse) {
          self.postMessage({
            type: 'ERROR',
            data: { error: 'Search index not initialized' },
            id
          } as SearchResponse);
          return;
        }

        if (!data?.query || !data.query.trim()) {
          self.postMessage({
            type: 'SEARCH_RESULTS',
            data: { results: [], query: data?.query || '' },
            id
          } as SearchResponse);
          return;
        }

        const results = fuse.search(data.query);
        const limit = data.options?.limit ?? 10;
        
        const searchResults = results
          .slice(0, limit)
          .map((result: any) => ({
            ...result.item,
            score: result.score,
            matches: result.matches
          }));

        self.postMessage({
          type: 'SEARCH_RESULTS',
          data: { results: searchResults, query: data.query },
          id
        } as SearchResponse);
        break;

      case 'CLEAR':
        self.postMessage({
          type: 'SEARCH_RESULTS',
          data: { results: [], query: '' },
          id
        } as SearchResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      id
    } as SearchResponse);
  }
};

// Export for TypeScript
export {};
