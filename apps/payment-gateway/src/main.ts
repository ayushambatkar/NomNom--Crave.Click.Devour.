import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@app/common/config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PAYMENT_PORT') || 3001;
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  
  // Enable CORS
  app.enableCors();
  
  await app.listen(port);
  console.log(`🚀 Payment Gateway running on: http://localhost:${port}`);
}
bootstrap();
