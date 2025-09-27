import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMenuItemDto, CreateRestaurantDto, UpdateRestaurantDto } from './types';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRestaurantDto) {
    const p = this.prisma as any;
    const { name, openingTime, closingTime, handlingFee, packagingCharges } = dto as any;
    const addressData = (dto as any).addressObj;
    return p.restaurant.create({
      data: {
        name,
        openingTime,
        closingTime,
        handlingFee,
        packagingCharges,
        address: addressData ? { create: addressData } : undefined,
      },
      include: { address: true },
    });
  }

  list() {
    const p = this.prisma as any;
    return p.restaurant.findMany({ include: { address: true } });
  }

  get(id: string) {
    const p = this.prisma as any;
    return p.restaurant.findUnique({ where: { id }, include: { address: true } });
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    const p = this.prisma as any;
    const exists = await p.restaurant.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Restaurant not found');
    const { name, openingTime, closingTime, handlingFee, packagingCharges } = dto as any;
    const addressData = (dto as any).addressObj;
    return p.restaurant.update({
      where: { id },
      data: {
        name,
        openingTime,
        closingTime,
        handlingFee,
        packagingCharges,
        ...(addressData && {
          address: exists.addressId
            ? { update: addressData }
            : { create: addressData },
        }),
      },
      include: { address: true },
    });
  } 

  addMenuItem(restaurantId: string, dto: CreateMenuItemDto) {
    const p = this.prisma;
    return p.menuItem.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  listMenu(restaurantId: string) {
    const p = this.prisma;
    return p.menuItem.findMany({ where: { restaurantId, isAvailable: true } });
  }

  // Find nearby restaurants sorted by distance (km) using Haversine formula
  async nearby(lat: number, lng: number, radiusKm = 5) {
    const prisma = this.prisma;
    // Haversine in SQL (PostgreSQL): distance in km
    // Uses radians and earth radius 6371 km
    const results = await prisma.$queryRawUnsafe(`
      SELECT r.*, a.*, 
        (
          6371 * 2 * ASIN(
            SQRT(
              POWER(SIN(RADIANS(a.latitude::float - $1) / 2), 2) +
              COS(RADIANS($1)) * COS(RADIANS(a.latitude::float)) *
              POWER(SIN(RADIANS(a.longitude::float - $2) / 2), 2)
            )
          )
        ) AS distance_km
      FROM "Restaurant" r
      JOIN "Address" a ON a.id = r."addressId"
      WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      HAVING (
        6371 * 2 * ASIN(
          SQRT(
            POWER(SIN(RADIANS(a.latitude::float - $1) / 2), 2) +
            COS(RADIANS($1)) * COS(RADIANS(a.latitude::float)) *
            POWER(SIN(RADIANS(a.longitude::float - $2) / 2), 2)
          )
        )
      ) <= $3
      ORDER BY distance_km ASC
    `, lat, lng, radiusKm);

    // Map to a clean shape including nested address and distance
    return (results as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      openingTime: row.openingTime,
      closingTime: row.closingTime,
      handlingFee: row.handlingFee,
      packagingCharges: row.packagingCharges,
      address: {
        id: row.addressId,
        line1: row.line1,
        line2: row.line2,
        landmark: row.landmark,
        city: row.city,
        state: row.state,
        postalCode: row.postalCode,
        country: row.country,
        latitude: row.latitude,
        longitude: row.longitude,
      },
      distanceKm: Number(row.distance_km),
    }));
  }
}
