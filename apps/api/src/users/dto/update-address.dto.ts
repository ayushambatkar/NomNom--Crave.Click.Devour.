import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ example: 40.7128 })
  @IsNumber() latitude: number;
  @ApiProperty({ example: -74.006 })
  @IsNumber() longitude: number;

  @ApiPropertyOptional() @IsOptional() @IsString() line1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() line2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;
  @ApiProperty()
  @IsString() city: string; // required in schema
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}
