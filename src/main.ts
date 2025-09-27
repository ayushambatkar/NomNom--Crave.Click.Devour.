import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { SnakeToCamelPipe } from './common/snake-to-camel.pipe';
import { SnakeCaseInterceptor } from './common/snake-case.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';

dotenv.config();



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // First convert snake_case inputs to camelCase, then validate DTOs
  app.useGlobalPipes(new SnakeToCamelPipe(), new ValidationPipe({ whitelist: true, transform: true }));
  // Convert responses to snake_case JSON
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)), new SnakeCaseInterceptor());
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })
  await app.listen(process.env.PORT ?? 3000);
  console.log(`App running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
