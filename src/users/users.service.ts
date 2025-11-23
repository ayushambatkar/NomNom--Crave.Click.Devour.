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

@Injectable()
export class UsersService {
  constructor(
    private readonly guestService: GuestUserService,
    private readonly userRepo: UserRepository,
  ) { }

  getMe(userId: string) {
    return this.getUserOrGuest(userId);
  }

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
    return this.userRepo.updateProfile(userId, dto);
  }

  // New helpers delegate to repository
  findByPhone(phoneNumber: string) {
    return this.userRepo.findByPhone(phoneNumber);
  }
  createPhoneUser(phoneNumber: string) {
    return this.userRepo.createPhoneUser(phoneNumber);
  }

  createGuest() {
    return this.guestService.createGuest();
  }

  async upgradeGuestToRegistered(
    userId: string,
    phoneNumber: string,
  ): Promise<string> {
    const dbUser = await this.userRepo.upsertPhone(userId, phoneNumber);

    // 3. Remove guest record (best-effort)
    await this.guestService.delete(userId).catch(() => undefined);

    return dbUser.id;
  }

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
      await this.userRepo.updateAddress(userId, dto);
    return updatedUser
      ? UserEntity.fromPrisma(updatedUser as any)
      : null;
  }

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
