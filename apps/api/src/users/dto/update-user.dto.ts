import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from 'apps/api/src/common/dto/address.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  @ApiPropertyOptional({ type: AddressDto })
  address?: AddressDto;

  @IsString()
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ format: 'email' })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  name?: string;
}
