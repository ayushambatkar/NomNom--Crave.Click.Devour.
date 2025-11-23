import { Injectable } from '@nestjs/common';
import {
  GuestAddress,
  GuestUser,
} from './user.entity';
import { UpdateAddressDto } from './dto/update-address.dto';
import { GuestUserRepository } from './guest-user.repository';

@Injectable()
export class GuestUserService {
  constructor(
    private readonly repo: GuestUserRepository,
  ) {}

  async isGuest(id: string) {
    return !!(await this.repo.isGuest(id));
  }

  async createGuest(): Promise<GuestUser> {
    return this.repo.create();
  }

  async getGuest(
    id: string,
  ): Promise<GuestUser | null> {
    return this.repo.get(id);
  }

  async updateGuestAddress(
    id: string,
    dto: UpdateAddressDto,
  ): Promise<GuestUser | null> {
    return this.repo.updateAddress(id, {
      ...dto,
    } as GuestAddress);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
