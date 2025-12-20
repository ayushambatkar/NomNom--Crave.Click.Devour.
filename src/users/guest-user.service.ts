import { Injectable } from '@nestjs/common';
import {
  GuestAddress,
  GuestUser,
} from './user.entity';
import { UpdateAddressDto } from './dto/update-address.dto';
import { GuestUserRepository } from './guest-user.repository';

/**
 * GuestUserService - Redis-based guest user management.
 *
 * @description Manages temporary guest users stored in Redis:
 * - Creates guests with UUID and 7-day TTL
 * - Stores guest address in Redis
 * - Provides guest lookup for authentication checks
 *
 * Guest data structure in Redis:
 * - Key: `guest:{uuid}`
 * - Value: { id, address, createdAt }
 * - TTL: 7 days
 */
@Injectable()
export class GuestUserService {
  constructor(
    private readonly repo: GuestUserRepository,
  ) {}

  /**
   * Check if user ID belongs to a guest.
   *
   * @description Performs Redis EXISTS check on guest:{id} key.
   *
   * @param id - User UUID
   * @returns true if guest exists in Redis
   */
  async isGuest(id: string) {
    return !!(await this.repo.isGuest(id));
  }

  /**
   * Create a new guest user.
   *
   * @description
   * - Generates UUID for guest
   * - Stores in Redis with 7-day TTL
   *
   * @returns GuestUser with id and null address
   */
  async createGuest(): Promise<GuestUser> {
    return this.repo.create();
  }

  /**
   * Get guest user by ID.
   *
   * @param id - Guest UUID
   * @returns GuestUser or null if not found/expired
   */
  async getGuest(
    id: string,
  ): Promise<GuestUser | null> {
    return this.repo.get(id);
  }

  /**
   * Update guest's address in Redis.
   *
   * @description Stores address fields with guest record.
   * Required for delivery distance calculation.
   *
   * @param id - Guest UUID
   * @param dto - Address fields (line1, city, latitude, longitude, etc.)
   * @returns Updated GuestUser or null
   */
  async updateGuestAddress(
    id: string,
    dto: UpdateAddressDto,
  ): Promise<GuestUser | null> {
    return this.repo.updateAddress(id, {
      ...dto,
    } as GuestAddress);
  }

  /**
   * Delete guest record from Redis.
   *
   * @description Called during guest-to-registered upgrade.
   *
   * @param id - Guest UUID
   */
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
