import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from 'src/common/dto/address.dto';

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

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
