import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
} from 'class-validator';

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
