import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @IsNumber()
  @IsOptional()
  quantity: number;
}
