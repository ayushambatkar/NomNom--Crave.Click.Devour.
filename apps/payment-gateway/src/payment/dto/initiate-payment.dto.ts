import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
