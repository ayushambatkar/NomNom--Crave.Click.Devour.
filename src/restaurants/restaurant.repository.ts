import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateRestaurantDto,
  UpdateRestaurantDto,
  CreateMenuItemDto,
} from './dto';

@Injectable()
export class RestaurantRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(dto: CreateRestaurantDto, ownerId: string) {
    const {
      name,
      openingTime,
      closingTime,
      handlingFee,
      packagingCharges,
    } = dto;
    const addressData = dto.address;

    if (!addressData) {
      throw new BadRequestException(
        'addressObj is required for restaurant creation',
      );
    }

    const {
      city,
      latitude,
      longitude,
      line1,
      line2,
      landmark,
      state,
      postalCode,
      country,
    } = addressData;

    if (
      city == null ||
      latitude == null ||
      longitude == null
    ) {
      throw new BadRequestException(
        'Address must include city, latitude, and longitude',
      );
    }

    return this.prisma.restaurant.create({
      data: {
        name,
        openingTime,
        closingTime,
        handlingFee,
        packagingCharges,
        ownerId,
        address: {
          create: {
            line1,
            line2,
            landmark,
            city,
            state,
            postalCode,
            country,
            latitude: Number(latitude),
            longitude: Number(longitude),
          },
        },
      },
      include: { address: true },
    });
  }

  findById(id: string) {
    return this.prisma.restaurant.findUnique({
      where: { id },
      include: { address: true },
    });
  }

  update(id: string, dto: UpdateRestaurantDto) {
    const {
      name,
      openingTime,
      closingTime,
      handlingFee,
      packagingCharges,
    } = dto as any;
    const addressData = (dto as any)
      .addressObj as any;

    // Build an update object only with defined address fields to satisfy Prisma types
    const addressUpdate: Record<string, unknown> =
      {};
    if (addressData) {
      if (addressData.line1 !== undefined)
        addressUpdate.line1 = addressData.line1;
      if (addressData.line2 !== undefined)
        addressUpdate.line2 = addressData.line2;
      if (addressData.landmark !== undefined)
        addressUpdate.landmark =
          addressData.landmark;
      if (addressData.city !== undefined)
        addressUpdate.city = addressData.city;
      if (addressData.state !== undefined)
        addressUpdate.state = addressData.state;
      if (addressData.postalCode !== undefined)
        addressUpdate.postalCode =
          addressData.postalCode;
      if (addressData.country !== undefined)
        addressUpdate.country =
          addressData.country;
      if (addressData.latitude !== undefined)
        addressUpdate.latitude = Number(
          addressData.latitude,
        );
      if (addressData.longitude !== undefined)
        addressUpdate.longitude = Number(
          addressData.longitude,
        );
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        name,
        openingTime,
        closingTime,
        handlingFee,
        packagingCharges,
        ...(addressData &&
          Object.keys(addressUpdate).length >
            0 && {
            address: { update: addressUpdate },
          }),
      },
      include: { address: true },
    });
  }

  createMenuItem(
    restaurantId: string,
    dto: CreateMenuItemDto,
  ) {
    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }
}
