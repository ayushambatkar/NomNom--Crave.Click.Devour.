import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  getMe(userId: string) {
    const p = this.prisma;
    return p.user.findUnique({
      where: { id: userId },
      include: { address: true },
    });
  }

  async updateMe(
    userId: string,
    dto: UpdateUserDto,
  ) {
    const p = this.prisma;
    const existing = await p.user.findUnique({
      where: { id: userId },
    });
    const data: any = {
      name: dto.name,
      email: dto.email,
    };
    if (dto.addressObj) {
      data.address = existing?.addressId
        ? { update: dto.addressObj }
        : { create: dto.addressObj };
    }
    return p.user.update({
      where: { id: userId },
      data,
      include: { address: true },
    });
  }

  // New helpers used by AuthService
  findByPhone(phoneNumber: string) {
    const p = this.prisma;
    return p.user.findUnique({
      where: { phoneNumber },
    });
  }

  createPhoneUser(phoneNumber: string) {
    const p = this.prisma;
    return p.user.create({
      data: { phoneNumber, isGuest: false },
    });
  }

  createGuest() {
    const p = this.prisma;
    return p.user.create({
      data: { isGuest: true },
    });
  }

  upgradeGuestToRegistered(userId: string) {
    const p = this.prisma;
    return p.user.update({
      where: { id: userId },
      data: { isGuest: false },
    });
  }
}
