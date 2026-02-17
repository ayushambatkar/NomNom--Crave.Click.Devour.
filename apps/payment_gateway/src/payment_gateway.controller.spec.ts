import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGatewayController } from './payment_gateway.controller';
import { PaymentGatewayService } from './payment_gateway.service';

describe('PaymentGatewayController', () => {
  let paymentGatewayController: PaymentGatewayController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PaymentGatewayController],
      providers: [PaymentGatewayService],
    }).compile();

    paymentGatewayController = app.get<PaymentGatewayController>(PaymentGatewayController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(paymentGatewayController.getHello()).toBe('Hello World!');
    });
  });
});
