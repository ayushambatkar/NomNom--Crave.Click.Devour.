export interface SearchResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Unified search result - dynamically contains results from all registered types
 * Each key is the strategy type (e.g., 'restaurant', 'menu')
 */
export interface UnifiedSearchResult {
  [type: string]: SearchResult;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface ISearchStrategy<T = unknown> {
  readonly type: string;
  search(params: SearchParams): Promise<SearchResult<T>>;
}
