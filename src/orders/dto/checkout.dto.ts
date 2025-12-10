import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  // Optional note or special instructions (future use)
  @IsString()
  @IsOptional()
  note?: string;
}
