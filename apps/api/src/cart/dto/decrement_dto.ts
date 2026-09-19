import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DecrementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsString()
  menuItemId: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  quantity: number | undefined;
}
