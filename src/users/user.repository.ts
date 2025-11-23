import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { UpdateAddressDto } from './dto/update-address.dto';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { address: true },
    });
  }

  findByPhone(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
    });
  }

  createPhoneUser(phoneNumber: string) {
    return this.prisma.user.create({
      data: { phoneNumber },
    });
  }

  upsertPhone(
    userId: string,
    phoneNumber: string,
  ) {
    this.logger.log("Upserting phone for user: " + userId);
    return this.prisma.user.upsert({
      where: { id: userId },
      update: { phoneNumber },
      create: { id: userId, phoneNumber },
    });
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ) {
    const existing =
      await this.prisma.user.findUnique({
        where: { id: userId },
      });
    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      email: dto.email,
    };
    if (dto.address) {
      (data as any).address = existing?.addressId
        ? { update: dto.address }
        : { create: dto.address };
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: data as any,
      include: { address: true },
    });
  }

  async updateAddress(
    userId: string,
    dto: UpdateAddressDto,
  ) {
    const existing =
      await this.prisma.user.findUnique({
        where: { id: userId },
      });
    const addressOp: any = existing?.addressId
      ? { update: dto }
      : { create: dto };
    return this.prisma.user.update({
      where: { id: userId },
      data: { address: addressOp } as any,
      include: { address: true },
    });
  }

  async findUnique(args: {
    where: any;
    include: any;
}) {
    return this.prisma.user.findUnique(args);
  }
}
