import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from 'apps/api/src/common/dto/address.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRestaurantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  @ApiPropertyOptional({ type: AddressDto })
  address?: AddressDto;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '09:00' })
  openingTime?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '22:00' })
  closingTime?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 2.5 })
  handlingFee?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 1 })
  packagingCharges?: number;
}
