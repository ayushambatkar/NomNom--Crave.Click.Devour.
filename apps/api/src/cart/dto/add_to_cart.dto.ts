import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  quantity: number;
}
