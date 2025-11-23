import {
  IsArray,
  isArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class GuestCartDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  restaurantId: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  items: CartItemDto[];

  @IsNumber()
  @IsPositive()
  @IsOptional()
  total: Number | undefined;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  packagingCharges: Number | undefined;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  subtotal: Number | undefined;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  handlingFee: Number | undefined;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  deliveryCharges: Number | undefined;
  @IsNumber()
  @IsPositive()
  @IsOptional()
  taxAmount: Number | undefined;
}

class CartItemDto {
  @IsUUID()
  menuItemId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}
