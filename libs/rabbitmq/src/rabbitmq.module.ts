import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { LoggerService } from '@app/common';
import { ConfigService } from '@app/common/config/config.service';

@Global()
@Module({
  providers: [RabbitMQService, ConfigService, LoggerService],
  exports: [RabbitMQService],
  imports: [],
})
export class RabbitMQModule { }
