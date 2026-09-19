import {
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutDto {
  // Optional note or special instructions (future use)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  note?: string;
}
