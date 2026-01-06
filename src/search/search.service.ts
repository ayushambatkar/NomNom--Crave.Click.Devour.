import { Injectable } from '@nestjs/common';
import { SearchRegistry } from './search.registry';
import { SearchParams, SearchResult, UnifiedSearchResult } from './interfaces';

const DEFAULT_UNIFIED_LIMIT_PER_TYPE = 5;

@Injectable()
export class SearchService {
  constructor(private readonly registry: SearchRegistry) {}

  /**
   * Search a specific type with proper pagination
   */
  async search(type: string, params: SearchParams): Promise<SearchResult> {
    const strategy = this.registry.get(type);
    return strategy.search(params);
  }

  /**
   * Unified search across all registered types
   * Returns top N results from each type (restaurants, menu items, etc.)
   * 
   * Note: For unified search, we fetch top `limitPerType` items from each type.
   * Use the single-type `search()` method for proper pagination within a type.
   * 
   * @param params.limit - Used as limit per type (default: 5)
   */
  async searchAll(params: SearchParams): Promise<UnifiedSearchResult> {
    const types = this.registry.getAvailableTypes();
    const limitPerType = params.limit ?? DEFAULT_UNIFIED_LIMIT_PER_TYPE;

    const searchPromises = types.map(async (type) => {
      const strategy = this.registry.get(type);
      // Always fetch from page 1, with limited results per type
      const result = await strategy.search({
        ...params,
        page: 1,
        limit: limitPerType,
      });
      return { type, result };
    });

    const results = await Promise.all(searchPromises);

    // Build unified result object dynamically
    const unified = {} as UnifiedSearchResult;

    for (const { type, result } of results) {
      unified[type] = result;
    }

    return unified;
  }

  getAvailableTypes(): string[] {
    return this.registry.getAvailableTypes();
  }
}
