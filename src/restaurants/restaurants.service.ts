import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Restaurant, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantRepository } from './restaurant.repository';
import {
  CreateMenuItemDto,
  CreateRestaurantDto,
  UpdateRestaurantDto,
} from './dto';
import { CacheService } from 'src/common/redis/cache.service';

/**
 * RestaurantsService - Restaurant and menu management with caching.
 *
 * @description Handles:
 * - CRUD operations for restaurants
 * - Menu item management
 * - Location-based restaurant discovery (Haversine formula)
 * - Redis caching for performance optimization
 */
@Injectable()
export class RestaurantsService {
  constructor(
    private prisma: PrismaService,
    private readonly repo: RestaurantRepository,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create a new restaurant.
   *
   * @description
   * - Creates restaurant with address via repository
   * - Invalidates all nearby cache patterns (new restaurant affects search results)
   *
   * @param dto - Restaurant creation data including name, times, fees, address
   * @returns Created restaurant with address
   */
  async create(dto: CreateRestaurantDto) {
    const restaurant = await this.repo.create(dto);
    // Invalidate nearby caches since new restaurant added
    await this.cache.invalidatePattern('nearby:*');
    return restaurant;
  }

  /**
   * List restaurants based on user's location.
   *
   * @description
   * - Requires user to have address with valid coordinates
   * - Uses nearby() with 30km radius
   * - Returns restaurants sorted by distance
   *
   * @param user - User record with addressId
   * @returns Array of restaurants with distance_km
   * @throws BadRequestException if user has no location
   */
  async list(user: User) {
    try {
      if (user.addressId == null) {
        throw new BadRequestException(
          'Location required to fetch restaurants',
        );
      }
      const address =
        await this.prisma.address.findUnique({
          where: {
            id: user.addressId ?? undefined,
          },
        });
      if (
        !address?.latitude ||
        !address?.longitude
      ) {
        throw new BadRequestException(
          'Valid location required to fetch restaurants',
        );
      }
      const lat =
        Number(address?.latitude) ?? null;
      const lng =
        Number(address?.longitude) ?? null;
      const restaurants = await this.nearby(
        lat,
        lng,
        30,
        { includeAddressDetails: false },
      );
      return restaurants;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single restaurant by ID (cached).
   *
   * @description
   * - Cache key: `restaurant:{id}`
   * - TTL: 1 hour
   * - Cache miss: fetches from DB and caches result
   *
   * @param id - Restaurant UUID
   * @returns Restaurant with address
   * @throws NotFoundException if not found
   */
  async get(id: string) {
    // Cache single restaurant lookup
    const restaurant = await this.cache.getRestaurant(id, () =>
      this.repo.findById(id),
    );
    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }
    return restaurant;
  }

  /**
   * Update restaurant details.
   *
   * @description
   * - Updates restaurant via repository
   * - Invalidates caches: restaurant:{id}, restaurant:{id}:menu, nearby:*
   *
   * @param id - Restaurant UUID
   * @param dto - Fields to update
   * @returns Updated restaurant
   * @throws NotFoundException if not found
   */
  async update(
    id: string,
    dto: UpdateRestaurantDto,
  ) {
    const exists = await this.repo.findById(id);
    if (!exists)
      throw new NotFoundException(
        'Restaurant not found',
      );
    const updated = await this.repo.update(id, dto);
    // Invalidate caches on update
    await this.cache.onRestaurantUpdated(id);
    return updated;
  }

  /**
   * Add a menu item to a restaurant.
   *
   * @description
   * - Creates menu item via repository
   * - Invalidates menu cache: `restaurant:{id}:menu`
   *
   * @param restaurantId - Restaurant UUID
   * @param dto - Menu item data (name, description, price, isAvailable)
   * @returns Created menu item
   */
  async createMenuItem(
    restaurantId: string,
    dto: CreateMenuItemDto,
  ) {
    const item = await this.repo.createMenuItem(
      restaurantId,
      dto,
    );
    // Invalidate menu cache
    await this.cache.onMenuUpdated(restaurantId);
    return item;
  }

  /**
   * Get menu items for a restaurant (cached).
   *
   * @description
   * - Cache key: `restaurant:{id}:menu`
   * - TTL: 30 minutes
   * - Only returns available items (isAvailable: true)
   *
   * @param restaurantId - Restaurant UUID
   * @returns Array of available menu items
   */
  async listMenu(restaurantId: string) {
    // Cache menu items - same for all users until updated
    return this.cache.getRestaurantMenu(restaurantId, () =>
      this.prisma.menuItem.findMany({
        where: { restaurantId, isAvailable: true },
      }),
    );
  }

  /**
   * Find nearby restaurants sorted by distance using Haversine formula.
   *
   * @description
   * Uses PostgreSQL raw query with Haversine formula for accurate
   * great-circle distance calculation.
   *
   * Caching:
   * - Key: `nearby:{lat_rounded}:{lng_rounded}:{radius}`
   * - Coordinates rounded to 2 decimals (~1km precision for grouping)
   * - TTL: 5 minutes
   *
   * Formula: 6371 * 2 * asin(sqrt(
   *   sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlng/2)
   * ))
   *
   * @param lat - User's latitude
   * @param lng - User's longitude
   * @param radiusKm - Search radius in kilometers (default: 5)
   * @param options.includeAddressDetails - Include full address or just id/line1
   * @returns Array of restaurants with distance_km, sorted by distance ASC
   */
  async nearby(
    lat: number,
    lng: number,
    radiusKm = 5,
    {
      includeAddressDetails:
        includeDetails = true,
    }: { includeAddressDetails?: boolean } = {},
  ) {
    // Cache key groups users within ~1km of each other
    return this.cache.getNearbyRestaurants(lat, lng, radiusKm, async () => {
      const prisma = this.prisma;
      // Haversine in SQL (PostgreSQL): distance in km
      // Uses radians and earth radius 6371 km
      const results = await prisma.$queryRawUnsafe(
        `
    SELECT 
          r.id                          AS restaurant_id,
          r.name                        AS restaurant_name,
          r."openingTime"              AS opening_time,
          r."closingTime"              AS closing_time,
          r."handlingFee"              AS handling_fee,
          r."packagingCharges"         AS packaging_charges,
          r."addressId"                AS restaurant_address_id,
          a.id                          AS address_id,
          a.line1                       AS address_line1,
          a.line2                       AS address_line2,
          a.landmark                    AS address_landmark,
          a.city                        AS address_city,
          a.state                       AS address_state,
          a."postalCode"               AS address_postal_code,
          a.country                     AS address_country,
          a.latitude                    AS address_latitude,
          a.longitude                   AS address_longitude,
          (
            6371 * 2 * ASIN(
              LEAST(
                1,
                SQRT(
                  POWER(SIN(RADIANS(a.latitude::float8 - $1::float8) / 2), 2) +
                  COS(RADIANS($1::float8)) * COS(RADIANS(a.latitude::float8)) *
                  POWER(SIN(RADIANS(a.longitude::float8 - $2::float8) / 2), 2)
                )
              )
            )
          ) AS distance_km
        FROM "Restaurant" r
        JOIN "Address" a ON a.id = r."addressId"
        WHERE 
          a.latitude IS NOT NULL AND a.longitude IS NOT NULL
          AND (
            6371 * 2 * ASIN(
              LEAST(
                1,
                SQRT(
                  POWER(SIN(RADIANS(a.latitude::float8 - $1::float8) / 2), 2) +
                  COS(RADIANS($1::float8)) * COS(RADIANS(a.latitude::float8)) *
                  POWER(SIN(RADIANS(a.longitude::float8 - $2::float8) / 2), 2)
                )
              )
            )
          ) <= $3::float8
        ORDER BY distance_km ASC
      `,
        lat,
        lng,
        radiusKm,
      );

      // Map to a clean shape including nested address and distance
      return (results as any[]).map((row) => ({
        id: row.restaurant_id,
        name: row.restaurant_name,
        openingTime: row.opening_time,
        closingTime: row.closing_time,
        handlingFee: row.handling_fee,
        packagingCharges: row.packaging_charges,
        address: includeDetails
          ? {
              id: row.address_id,
              line1: row.address_line1,
              line2: row.address_line2,
              landmark: row.address_landmark,
              city: row.address_city,
              state: row.address_state,
              postalCode: row.address_postal_code,
              country: row.address_country,
              latitude: row.address_latitude,
              longitude: row.address_longitude,
            }
          : {
              id: row.address_id,
              line1: row.address_line1,
            },
        distanceKm: Number(row.distance_km),
      }));
    });
  }
}
