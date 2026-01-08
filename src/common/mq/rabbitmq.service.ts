import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RabbitMQService
  implements OnModuleDestroy, OnModuleInit
{
  private conn: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private config: ConfigService;

  constructor(config: ConfigService) {
    this.config = config;
  }

  async onModuleInit() {
    await this.ensureChannel();
  }

  private async ensureChannel() {
    if (this.channel) return this.channel;
    const url = this.config.rabbitmqUrl;
    this.conn = await amqp.connect(url);
    this.channel =
      await this.conn.createChannel();
    return this.channel;
  }

  async assertQueue(
    queue: string,
    options?: amqp.Options.AssertQueue,
  ) {
    const ch = await this.ensureChannel();
    await ch.assertQueue(queue, {
      durable: true,
      ...options,
    });
  }

  async publish(queue: string, message: any) {
    const ch = await this.ensureChannel();
    await ch.assertQueue(queue, {
      durable: true,
    });
    ch.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }

  async consume(
    queue: string,
    onMessage: (msg: any) => Promise<void> | void,
  ) {
    const ch = await this.ensureChannel();
    await ch.assertQueue(queue, {
      durable: true,
    });
    await ch.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(
          msg.content.toString(),
        );
        await onMessage(content);
        ch.ack(msg);
      } catch (e) {
        ch.nack(msg, false, false);
      }
    });
  }

  async onModuleDestroy() {
    if (this.channel)
      await this.channel
        .close()
        .catch(() => undefined);
    if (this.conn)
      await this.conn
        .close()
        .catch(() => undefined);
  }
}
