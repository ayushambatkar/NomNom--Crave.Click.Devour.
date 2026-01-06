import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto';
import { JwtGuard } from 'src/auth/guard';

@UseGuards(JwtGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Unified search endpoint
   * - If `type` is provided: searches only that type
   * - If `type` is omitted: searches ALL types (restaurants, menu, etc.)
   *
   * Example: GET /search?query=dosa
   * Returns: { restaurants: [...], menu: [...] }
   */
  @Get()
  search(@Query() dto: SearchQueryDto) {
    const { type, query, page, limit, filters } = dto;
    const params = { query, page, limit, filters };

    // If type is specified, search only that type
    if (type) {
      return this.searchService.search(type, params);
    }

    // Otherwise, search all types (unified search)
    return this.searchService.searchAll(params);
  }

  @Get('types')
  getAvailableTypes() {
    return {
      types: this.searchService.getAvailableTypes(),
    };
  }
}
