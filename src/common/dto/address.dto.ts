import { IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString() line1: string;
  @IsString() @IsOptional() line2?: string;
  @IsString() @IsOptional() landmark?: string;
  @IsString() city: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() postalCode?: string;
  @IsString() @IsOptional() country?: string;
  @IsNumber() @Min(-90) @Max(90) @IsOptional() latitude?: number;
  @IsNumber() @Min(-180) @Max(180) @IsOptional() longitude?: number;
}
