import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/common/config/config.module';
import { PaymentModule } from './payment/payment.module';
import { WebhookModule } from './webhook/webhook.module';
import { LedgerModule } from './ledger/ledger.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PaymentModule,
    WebhookModule,
    LedgerModule,
  ],
})
export class AppModule {}
