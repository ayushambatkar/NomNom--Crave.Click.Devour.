import {
  Body,
  Controller,
  Get,
  Put,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';

@UseGuards(JwtGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private service: UsersService) {}

  @Get('me')
  me(@GetUser('id') userId: string) {
    return this.service.getMe(userId);
  }

  @Put('me')
  updateMe(
    @GetUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateMe(userId, dto);
  }

  @Patch('address')
  updateAddress(
    @GetUser('id') userId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.service.updateAddressUnified(
      userId,
      dto,
    );
  }
}
