import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAddressDto {
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;

  @IsOptional() @IsString() line1?: string;
  @IsOptional() @IsString() line2?: string;
  @IsOptional() @IsString() landmark?: string;
  @IsString() city: string; // required in schema
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
}
