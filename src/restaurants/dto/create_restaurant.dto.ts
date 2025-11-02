import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
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
