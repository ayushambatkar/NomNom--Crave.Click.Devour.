import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { LoggerService } from '../logger/logger.service';

@Global()
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
  imports: [LoggerService],
})
export class RabbitMQModule { }
