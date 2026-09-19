import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check that the API is running' })
  @ApiResponse({ status: 200, description: 'API is running.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
