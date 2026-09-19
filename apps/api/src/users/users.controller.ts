import {
  Body,
  Controller,
  Get,
  Put,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtGuard } from 'apps/api/src/auth/guard';
import { GetUser } from 'apps/api/src/auth/decorator/get-user.decorator';

@UseGuards(JwtGuard)
@ApiBearerAuth()
@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private service: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user' })
  me(@GetUser('id') userId: string) {
    return this.service.getMe(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update the current user' })
  @ApiBody({ type: UpdateUserDto })
  updateMe(
    @GetUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateMe(userId, dto);
  }

  @Patch('address')
  @ApiOperation({ summary: 'Update the current user address' })
  @ApiBody({ type: UpdateAddressDto })
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
