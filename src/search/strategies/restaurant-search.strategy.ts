import { Injectable } from '@nestjs/common';
import { Restaurant } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ISearchStrategy,
  SearchParams,
  SearchResult,
} from '../interfaces';

@Injectable()
export class RestaurantSearchStrategy
  implements ISearchStrategy<Restaurant>
{
  readonly type = 'restaurant';

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async search(
    params: SearchParams,
  ): Promise<SearchResult<Restaurant>> {
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
          address: {
            city: {
              contains: query,
              mode: 'insensitive' as const,
            },
          },
        },
        {
          address: {
            landmark: {
              contains: query,
              mode: 'insensitive' as const,
            },
          },
        },
      ],
      ...(filters?.city
        ? {
            address: {
              city: {
                equals: filters.city as string,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        include: { address: true },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
