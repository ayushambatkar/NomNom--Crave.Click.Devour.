import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import configuration from './configuration';

enum Environment {
  Development = 'development',
  UAT = 'uat',
  Production = 'production',
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: process.env.NODE_ENV === "production" ? undefined : `.env.${process.env.NODE_ENV || Environment.Development}`,
      cache: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule { }
