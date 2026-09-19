import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto';
import { JwtGuard } from 'apps/api/src/auth/guard';

@UseGuards(JwtGuard)
@ApiBearerAuth()
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
  ) {}

  /**
   * Unified search endpoint
   * - If `type` is provided: searches only that type
   * - If `type` is omitted: searches ALL types (restaurants, menu, etc.)
   *
   * Example: GET /search?query=dosa
   * Returns: { restaurants: [...], menu: [...] }
   */
  @Get()
  @ApiOperation({ summary: 'Search restaurants and menu items' })
  @ApiQuery({ name: 'query', type: String, required: true })
  @ApiQuery({ name: 'type', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'filters', type: Object, required: false })
  search(@Query() dto: SearchQueryDto) {
    const { type, query, page, limit, filters } =
      dto;
    const params = {
      query,
      page,
      limit,
      filters,
    };

    // If type is specified, search only that type
    if (type) {
      return this.searchService.search(
        type,
        params,
      );
    }

    // Otherwise, search all types (unified search)
    return this.searchService.searchAll(params);
  }

  @Get('types')
  @ApiOperation({ summary: 'List available search types' })
  getAvailableTypes() {
    return {
      types:
        this.searchService.getAvailableTypes(),
    };
  }
}
