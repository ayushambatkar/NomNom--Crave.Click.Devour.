import { NestFactory } from '@nestjs/core';
import { PaymentGatewayModule } from './payment_gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentGatewayModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
