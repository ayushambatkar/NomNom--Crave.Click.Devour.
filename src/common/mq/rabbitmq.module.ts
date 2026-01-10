import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '../config/config.service';

@Global()
@Module({
  providers: [RabbitMQService, ConfigService, LoggerService],
  exports: [RabbitMQService],
  imports: [],
})
export class RabbitMQModule { }
