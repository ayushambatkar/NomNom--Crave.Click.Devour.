import { Injectable } from '@nestjs/common';
import { MenuItem } from '@prisma/client';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';
import {
  ISearchStrategy,
  SearchParams,
  SearchResult,
} from '../interfaces';

@Injectable()
export class MenuSearchStrategy
  implements ISearchStrategy<MenuItem>
{
  readonly type = 'menu';

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async search(
    params: SearchParams,
  ): Promise<SearchResult<MenuItem>> {
    const {
      query,
      page = 1,
      limit = 10,
      filters,
    } = params;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive' as const,
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive' as const,
          },
        },
      ],
      ...(filters?.restaurantId
        ? {
            restaurantId:
              filters.restaurantId as string,
          }
        : {}),
      ...(filters?.isAvailable !== undefined
        ? {
            isAvailable:
              filters.isAvailable as boolean,
          }
        : {}),
      ...(filters?.minPrice
        ? {
            price: {
              gte: filters.minPrice as number,
            },
          }
        : {}),
      ...(filters?.maxPrice
        ? {
            price: {
              lte: filters.maxPrice as number,
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        include: { restaurant: true },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
