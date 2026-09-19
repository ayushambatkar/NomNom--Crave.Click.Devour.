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
import { AddressDto } from 'apps/api/src/common/dto/address.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @ApiProperty({ type: AddressDto })
  address: AddressDto;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '09:00' })
  openingTime: string; // HH:mm

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '22:00' })
  closingTime: string; // HH:mm

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 2.5 })
  handlingFee: number;

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 1 })
  packagingCharges: number;
}
