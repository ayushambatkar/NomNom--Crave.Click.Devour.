import {
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  otp: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
