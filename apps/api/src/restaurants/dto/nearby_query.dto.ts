import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyQueryDto {
  @ApiProperty({ example: 40.7128 })
    @ApiProperty({ example: -74.006 })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lng: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ example: 5, default: 5 })
  radiusKm?: number; // default in controller/service
}
