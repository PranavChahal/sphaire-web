/**
 * TypeScript types for Thingi10K search functionality
 */

export interface ThingiDoc {
  id: string;
  name: string;
  tags: string[];
  searchText: string;
  path: string;
  filename: string;
  format: string;
  url?: string;
  thumbnail?: string;
  description?: string;
  author?: string;
  license?: string;
  downloads?: number;
  likes?: number;
  createdDate?: string;
  fileSize?: number;
  fileFormat?: string[];
}

export interface SearchResult extends ThingiDoc {
  score?: number;
  matches?: Array<{
    indices: [number, number][];
    value: string;
    key: string;
  }>;
}

export interface SearchOptions {
  threshold?: number;
  limit?: number;
  keys?: string[];
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export interface SearchHookReturn {
  searchState: SearchState;
  search: (query: string) => void;
  clearSearch: () => void;
  selectResult: (result: SearchResult) => void;
}
