import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class DecrementDto {
  @IsUUID()
  @IsString()
  menuItemId: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Type(() => Number)
  quantity: number | undefined;
}
