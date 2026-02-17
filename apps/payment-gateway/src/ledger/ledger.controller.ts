import { Controller, Get, Param, Query } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('restaurant/:id')
  getRestaurantEarnings(@Param('id') restaurantId: string) {
    return this.ledgerService.getRestaurantEarnings(restaurantId);
  }

  @Get('platform')
  getPlatformRevenue() {
    return this.ledgerService.getPlatformRevenue();
  }

  @Get('delivery/:id')
  getDeliveryEarnings(@Param('id') partnerId: string) {
    return this.ledgerService.getDeliveryPartnerEarnings(partnerId);
  }

  @Get('summary')
  getLedgerSummary() {
    return this.ledgerService.getLedgerSummary();
  }

  @Get('entity')
  getLedgerByEntity(
    @Query('type') entityType: string,
    @Query('id') entityId: string,
  ) {
    return this.ledgerService.getLedgerByEntity(entityType, entityId);
  }
}
