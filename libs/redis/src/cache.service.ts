import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Cache Key Structure:
 *
 * 1. SHARED (same for all users):
 *    - restaurant:{id}              → Single restaurant details (TTL: 1hr)
 *    - restaurant:{id}:menu         → Menu items for restaurant (TTL: 30min)
 *    - restaurants:all              → All restaurants list (TTL: 5min)
 *
 * 2. LOCATION-BASED (grouped by geo-hash):
 *    - nearby:{lat_rounded}:{lng_rounded}:{radiusKm}  → Nearby restaurants (TTL: 5min)
 *    Example: nearby:12.97:77.59:5
 *
 * 3. USER-SPECIFIC (personalized):
 *    - user:{userId}:orders         → User's order list (TTL: 2min)
 *    - user:{userId}:cart           → User's cart (handled separately by cart service)
 *
 * Cache Invalidation Events:
 *    - Restaurant updated → invalidate restaurant:{id}, restaurant:{id}:menu, nearby:*
 *    - Menu item added/updated → invalidate restaurant:{id}:menu
 *    - Order created/updated → invalidate user:{userId}:orders
 */

export interface CacheOptions {
  ttl?: number; // seconds
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(
    CacheService.name,
  );

  // Default TTLs in seconds
  private readonly TTL = {
    RESTAURANT: 3600, // 1 hour
    MENU: 1800, // 30 minutes
    RESTAURANTS_ALL: 300, // 5 minutes
    NEARBY: 300, // 5 minutes
    USER_ORDERS: 120, // 2 minutes
  };

  constructor(
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // KEY BUILDERS
  // ─────────────────────────────────────────────────────────────

  private keys = {
    restaurant: (id: string) =>
      `restaurant:${id}`,
    restaurantMenu: (id: string) =>
      `restaurant:${id}:menu`,
    restaurantsAll: () => `restaurants:all`,
    nearby: (
      lat: number,
      lng: number,
      radiusKm: number,
    ) => {
      // Round to 2 decimal places (~1km precision) for grouping
      const latRounded = lat.toFixed(2);
      const lngRounded = lng.toFixed(2);
      return `nearby:${latRounded}:${lngRounded}:${radiusKm}`;
    },
    userOrders: (userId: string) =>
      `user:${userId}:orders`,
  };

  // ─────────────────────────────────────────────────────────────
  // GENERIC CACHE OPERATIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get or set pattern: fetch from cache or execute fetcher and cache result
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.redis.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${key}`);
    const data = await fetcher();
    if (data !== null && data !== undefined) {
      await this.redis.set(key, data, ttlSeconds);
    }
    return data;
  }

  /**
   * Invalidate a single key
   */
  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(
      `Cache INVALIDATED: ${key}`,
    );
  }

  /**
   * Invalidate keys by pattern (use sparingly - expensive operation)
   */
  async invalidatePattern(
    pattern: string,
  ): Promise<void> {
    const client = this.redis.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
      this.logger.debug(
        `Cache INVALIDATED ${keys.length} keys matching: ${pattern}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RESTAURANT CACHE METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Cache single restaurant by ID
   */
  async getRestaurant<T>(
    id: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.restaurant(id),
      fetcher,
      this.TTL.RESTAURANT,
    );
  }

  /**
   * Cache menu items for a restaurant
   */
  async getRestaurantMenu<T>(
    restaurantId: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.restaurantMenu(restaurantId),
      fetcher,
      this.TTL.MENU,
    );
  }

  /**
   * Cache all restaurants list
   */
  async getAllRestaurants<T>(
    fetcher: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.restaurantsAll(),
      fetcher,
      this.TTL.RESTAURANTS_ALL,
    );
  }

  /**
   * Cache nearby restaurants (location-based grouping)
   */
  async getNearbyRestaurants<T>(
    lat: number,
    lng: number,
    radiusKm: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.nearby(lat, lng, radiusKm),
      fetcher,
      this.TTL.NEARBY,
    );
  }

  /**
   * Invalidate restaurant-related caches when restaurant is updated
   */
  async onRestaurantUpdated(
    restaurantId: string,
  ): Promise<void> {
    await Promise.all([
      this.invalidate(
        this.keys.restaurant(restaurantId),
      ),
      this.invalidate(
        this.keys.restaurantMenu(restaurantId),
      ),
      this.invalidate(this.keys.restaurantsAll()),
      this.invalidatePattern('nearby:*'), // All location caches
    ]);
  }

  /**
   * Invalidate menu cache when menu items change
   */
  async onMenuUpdated(
    restaurantId: string,
  ): Promise<void> {
    await this.invalidate(
      this.keys.restaurantMenu(restaurantId),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // USER-SPECIFIC CACHE METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Cache user's orders list (short TTL since orders change frequently)
   */
  async getUserOrders<T>(
    userId: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    return this.getOrSet(
      this.keys.userOrders(userId),
      fetcher,
      this.TTL.USER_ORDERS,
    );
  }

  /**
   * Invalidate user orders cache when order is created/updated
   */
  async onOrderChanged(
    userId: string,
  ): Promise<void> {
    await this.invalidate(
      this.keys.userOrders(userId),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Manually set cache (useful for warming)
   */
  async set(
    key: string,
    data: any,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(key, data, ttlSeconds);
  }

  /**
   * Get raw cache value
   */
  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = this.redis.getClient();
    return (await client.exists(key)) === 1;
  }
}
