import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/redis/redis.service';
import { randomUUID } from 'crypto';
import { GuestUser } from './user.entity';

@Injectable()
export class GuestUserRepository {
  private readonly TTL_SECONDS =
    15 * 24 * 60 * 60;
  constructor(
    private readonly redis: RedisService,
  ) {}

  private key(id: string) {
    return `guest:${id}`;
  }

  async get(
    id: string,
  ): Promise<GuestUser | null> {
    return this.redis.get<GuestUser>(
      this.key(id),
    );
  }

  async create(): Promise<GuestUser> {
    const id = randomUUID();
    const user: GuestUser = {
      id,
      phoneNumber: null,
      email: null,
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isGuest: true as const,
      address: null,
    };
    await this.redis.set(
      this.key(id),
      user,
      this.TTL_SECONDS,
    );
    return user;
  }

  async updateAddress(
    id: string,
    address: any,
  ): Promise<GuestUser | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated: GuestUser = {
      ...existing,
      address,
      updatedAt: new Date(),
    } as GuestUser;
    await this.redis.set(
      this.key(id),
      updated,
      this.TTL_SECONDS,
    );
    return updated;
  }

  async delete(id: string) {
    await this.redis.del(this.key(id));
  }

  async isGuest(id: string) {
    return !!(await this.get(id));
  }
}
