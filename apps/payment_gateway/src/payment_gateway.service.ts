import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentGatewayService {
  getHello(): string {
    return 'Hello World!';
  }
}
