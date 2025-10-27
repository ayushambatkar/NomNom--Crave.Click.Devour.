import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from 'src/common/dto/address.dto';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  // deprecated: use address below
  address?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  addressObj: AddressDto;

  @IsString()
  @IsNotEmpty()
  openingTime: string; // HH:mm

  @IsString()
  @IsNotEmpty()
  closingTime: string; // HH:mm

  @IsNumber()
  @IsPositive()
  handlingFee: number;

  @IsNumber()
  @IsPositive()
  packagingCharges: number;
}

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  addressObj?: AddressDto;

  @IsString()
  @IsOptional()
  openingTime?: string;

  @IsString()
  @IsOptional()
  closingTime?: string;

  @IsNumber()
  @IsOptional()
  handlingFee?: number;

  @IsNumber()
  @IsOptional()
  packagingCharges?: number;
}

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class NearbyQueryDto {
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lng: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  radiusKm?: number; // default in controller/service
}
