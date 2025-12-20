import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
// Removed direct User type usage; using repository & entity abstractions
import { UserRepository } from './user.repository';
import { GuestUserService } from './guest-user.service';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UserEntity } from './user.entity';

/**
 * UsersService - User profile management for both guest and registered users.
 *
 * @description Handles:
 * - Profile retrieval and updates
 * - Guest to registered user upgrade
 * - Unified address management (works for both user types)
 *
 * Delegates to:
 * - GuestUserService for Redis-based guest operations
 * - UserRepository for PostgreSQL-based registered user operations
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly guestService: GuestUserService,
    private readonly userRepo: UserRepository,
  ) {}

  /**
   * Get current user profile.
   *
   * @description
   * - Checks if user is guest first (Redis lookup)
   * - Guest: returns minimal object { id, phoneNumber: null, address: null, isGuest: true }
   * - Registered: fetches from PostgreSQL with address
   *
   * @param userId - User UUID
   * @returns User object with profile and address
   */
  getMe(userId: string) {
    return this.getUserOrGuest(userId);
  }

  /**
   * Update user profile (name, email, etc.).
   *
   * @description
   * - Guests cannot update profile fields
   * - Only works for registered users
   *
   * @param userId - User UUID
   * @param dto - Fields to update (name, email)
   * @returns Updated user
   * @throws BadRequestException if user is a guest
   */
  async updateMe(
    userId: string,
    dto: UpdateUserDto,
  ) {
    // Preserve existing behavior: guests cannot update profile fields
    const guest =
      await this.guestService.getGuest(userId);
    if (guest) {
      throw new BadRequestException(
        'Guest users cannot update profile',
      );
    }
    return this.userRepo.updateProfile(
      userId,
      dto,
    );
  }

  /**
   * Find user by phone number.
   * @param phoneNumber - Phone with country code
   * @returns User or null
   */
  findByPhone(phoneNumber: string) {
    return this.userRepo.findByPhone(phoneNumber);
  }

  /**
   * Create new user with phone number.
   * @param phoneNumber - Phone with country code
   * @returns Created user
   */
  createPhoneUser(phoneNumber: string) {
    return this.userRepo.createPhoneUser(
      phoneNumber,
    );
  }

  /**
   * Create a new guest user in Redis.
   * @returns Guest user with UUID (7-day TTL in Redis)
   */
  createGuest() {
    return this.guestService.createGuest();
  }

  /**
   * Upgrade guest user to registered user.
   *
   * @description Flow:
   * 1. Create/upsert DB user with phone number (uses guest's UUID)
   * 2. Delete guest record from Redis (best-effort)
   * 3. Return the user ID (same as guest ID)
   *
   * Note: Cart data is already in PostgreSQL (created on first add),
   * so no cart migration needed.
   *
   * @param userId - Guest user UUID
   * @param phoneNumber - Phone number to register with
   * @returns User ID (same UUID)
   */
  async upgradeGuestToRegistered(
    userId: string,
    phoneNumber: string,
  ): Promise<string> {
    const dbUser =
      await this.userRepo.upsertPhone(
        userId,
        phoneNumber,
      );

    // 3. Remove guest record (best-effort)
    await this.guestService
      .delete(userId)
      .catch(() => undefined);

    return dbUser.id;
  }

  /**
   * Update address for both guest and registered users.
   *
   * @description Unified address endpoint:
   * - Guest: updates address in Redis via GuestUserService
   * - Registered: creates/updates address in PostgreSQL via UserRepository
   *
   * Both return UserEntity for consistent response format.
   *
   * Required fields for cart distance calculation:
   * - latitude, longitude (mandatory)
   *
   * @param userId - User UUID
   * @param dto - Address fields (line1, city, latitude, longitude, etc.)
   * @returns Updated UserEntity or null
   */
  async updateAddressUnified(
    userId: string,
    dto: UpdateAddressDto,
  ) {
    // Decide guest vs registered
    const guest =
      await this.guestService.getGuest(userId);
    if (guest) {
      const updatedGuest =
        await this.guestService.updateGuestAddress(
          userId,
          dto,
        );
      return updatedGuest
        ? UserEntity.fromGuest(updatedGuest)
        : null;
    }
    const updatedUser =
      await this.userRepo.updateAddress(
        userId,
        dto,
      );
    return updatedUser
      ? UserEntity.fromPrisma(updatedUser as any)
      : null;
  }

  /**
   * Get user by ID, checking guest status first.
   *
   * @description
   * - Checks Redis for guest record
   * - If guest: returns minimal guest object
   * - If not guest: queries PostgreSQL for full user
   *
   * @private
   * @param userId - User UUID
   * @returns User object (guest or registered)
   */
  private async getUserOrGuest(userId: string) {
    // Preserve previous return shape to avoid breaking clients
    const guest =
      await this.guestService.getGuest(userId);
    if (guest) {
      return {
        id: userId,
        phoneNumber: null,
        address: null,
        isGuest: true,
      } as any;
    }
    return this.userRepo.findUnique({
      where: { id: userId },
      include: { address: true },
    });
  }
}
