import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/redis/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class GuestCartRepository {
  private readonly TTL_SECONDS =
    15 * 24 * 60 * 60;
  constructor(private redis: RedisService) {}

  private key(userId: string) {
    return `cart:guest:${userId}`;
  }

  async getRaw(userId: string) {
    return (
      (await this.redis.get<any>(
        this.key(userId),
      )) || null
    );
  }

  async ensure(userId: string) {
    const existing = await this.getRaw(userId);
    if (!existing) {
      const empty = this.empty(userId);
      await this.save(userId, empty);
      return empty;
    }
    return existing;
  }

  async save(userId: string, cart: any) {
    await this.redis.set(
      this.key(userId),
      cart,
      this.TTL_SECONDS,
    );
  }

  async delete(userId: string) {
    await this.redis.del(this.key(userId));
  }

  empty(userId: string) {
    return {
      id: randomUUID(),
      userId,
      items: [],
      restaurantId: null,
      subtotal: 0,
      handlingFee: 0,
      packagingCharges: 0,
      deliveryCharges: 0,
      taxAmount: 0,
      total: 0,
    };
  }

  // Enrichment moved to GuestCartEntity via service layer.
}
