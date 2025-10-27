import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateMenuItemDto,
  CreateRestaurantDto,
  UpdateRestaurantDto,
} from './types';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRestaurantDto) {
    const p = this.prisma;
    const {
      name,
      openingTime,
      closingTime,
      handlingFee,
      packagingCharges,
    } = dto;
    const addressData = dto.addressObj;
    return p.restaurant.create({
      data: {
        name,
        openingTime,
        closingTime,
        handlingFee,
        packagingCharges,
        ...(addressData && {
          address: { create: addressData },
        }),
      },
      include: { address: true },
    });
  }

  async list() {
    const p = this.prisma;
    return await p.restaurant.findMany({
      include: { address: true },
    });
  }

  async get(id: string) {
    const p = this.prisma;
    const exists = await p.restaurant.findUnique({
      where: { id },
      include: { address: true },
    });
    if (!exists || exists === null) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }
    return exists;
  }

  async update(
    id: string,
    dto: UpdateRestaurantDto,
  ) {
    const p = this.prisma as any;
    const exists = await p.restaurant.findUnique({
      where: { id },
    });
    if (!exists)
      throw new NotFoundException(
        'Restaurant not found',
      );
    const {
      name,
      openingTime,
      closingTime,
      handlingFee,
      packagingCharges,
    } = dto as any;
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

  async addMenuItem(
    restaurantId: string,
    dto: CreateMenuItemDto,
  ) {
    const p = this.prisma;
    return await p.menuItem.create({
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
    return p.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
    });
  }

  // Find nearby restaurants sorted by distance (km) using Haversine formula
  async nearby(
    lat: number,
    lng: number,
    radiusKm = 5,
  ) {
    const prisma = this.prisma;
    // Haversine in SQL (PostgreSQL): distance in km
    // Uses radians and earth radius 6371 km
    const results = await prisma.$queryRawUnsafe(
      `
  SELECT 
        r.id                          AS restaurant_id,
        r.name                        AS restaurant_name,
        r."openingTime"              AS opening_time,
        r."closingTime"              AS closing_time,
        r."handlingFee"              AS handling_fee,
        r."packagingCharges"         AS packaging_charges,
        r."addressId"                AS restaurant_address_id,
        a.id                          AS address_id,
        a.line1                       AS address_line1,
        a.line2                       AS address_line2,
        a.landmark                    AS address_landmark,
        a.city                        AS address_city,
        a.state                       AS address_state,
        a."postalCode"               AS address_postal_code,
        a.country                     AS address_country,
        a.latitude                    AS address_latitude,
        a.longitude                   AS address_longitude,
        (
          6371 * 2 * ASIN(
            LEAST(
              1,
              SQRT(
                POWER(SIN(RADIANS(a.latitude::float8 - $1::float8) / 2), 2) +
                COS(RADIANS($1::float8)) * COS(RADIANS(a.latitude::float8)) *
                POWER(SIN(RADIANS(a.longitude::float8 - $2::float8) / 2), 2)
              )
            )
          )
        ) AS distance_km
      FROM "Restaurant" r
      JOIN "Address" a ON a.id = r."addressId"
      WHERE 
        a.latitude IS NOT NULL AND a.longitude IS NOT NULL
        AND (
          6371 * 2 * ASIN(
            LEAST(
              1,
              SQRT(
                POWER(SIN(RADIANS(a.latitude::float8 - $1::float8) / 2), 2) +
                COS(RADIANS($1::float8)) * COS(RADIANS(a.latitude::float8)) *
                POWER(SIN(RADIANS(a.longitude::float8 - $2::float8) / 2), 2)
              )
            )
          )
        ) <= $3::float8
      ORDER BY distance_km ASC
    `,
      lat,
      lng,
      radiusKm,
    );

    // Map to a clean shape including nested address and distance
    return (results as any[]).map((row) => ({
      id: row.restaurant_id,
      name: row.restaurant_name,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      handlingFee: row.handling_fee,
      packagingCharges: row.packaging_charges,
      address: {
        id: row.address_id,
        line1: row.address_line1,
        line2: row.address_line2,
        landmark: row.address_landmark,
        city: row.address_city,
        state: row.address_state,
        postalCode: row.address_postal_code,
        country: row.address_country,
        latitude: row.address_latitude,
        longitude: row.address_longitude,
      },
      distanceKm: Number(row.distance_km),
    }));
  }
}
