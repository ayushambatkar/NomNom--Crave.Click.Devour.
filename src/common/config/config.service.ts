import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvironmentConfig } from './environment.interface';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('nodeEnv')!;
  }

  get port(): number {
    return this.configService.get<number>('port')!;
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isUat(): boolean {
    return this.nodeEnv === 'uat';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Database
  get databaseUrl(): string {
    return this.configService.get<string>('databaseUrl')!;
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('jwtSecret')!;
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('jwtExpiresIn')!;
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('jwtRefreshExpiresIn')!;
  }

  // Redis
  get redisUrl(): string {
    return this.configService.get<string>('redisUrl')!;
  }

  get redisHost(): string {
    return this.configService.get<string>('redisHost')!;
  }

  get redisPort(): number {
    return this.configService.get<number>('redisPort')!;
  }

  get redisPassword(): string {
    return this.configService.get<string>('redisPassword')!;
  }

  get redisDb(): number {
    return this.configService.get<number>('redisDb')!;
  }

  // Business
  get perKmDeliveryRate(): number {
    return this.configService.get<number>('perKmDeliveryRate')!;
  }

  // RabbitMQ
  get rabbitmqUrl(): string {
    return this.configService.get<string>('rabbitmqUrl')!;
  }

  // Seeding
  get seedCenterLat(): string | undefined {
    return this.configService.get<string>('seedCenterLat');
  }

  get seedCenterLng(): string | undefined {
    return this.configService.get<string>('seedCenterLng');
  }

  get seedMaxRadiusKm(): string | undefined {
    return this.configService.get<string>('seedMaxRadiusKm');
  }

  // Helper method to get any config value
  get<T = any>(key: string): T | undefined {
    return this.configService.get<T>(key);
  }
}
