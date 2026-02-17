import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { SnakeToCamelPipe } from './common/snake-to-camel.pipe';
import { SnakeCaseInterceptor } from './common/snake-case.interceptor';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@app/common/config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);
  const port = configService.port;
  const nodeEnv = configService.nodeEnv;

  // First convert snake_case inputs to camelCase, then validate DTOs
  app.useGlobalPipes(
    new SnakeToCamelPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  // Convert responses to snake_case JSON
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(
      app.get(Reflector),
    ),
    new SnakeCaseInterceptor(),
  );
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.listen(port);
  console.log(
    `App running in ${nodeEnv} mode on http://localhost:${port}`,
  );
}
bootstrap();
