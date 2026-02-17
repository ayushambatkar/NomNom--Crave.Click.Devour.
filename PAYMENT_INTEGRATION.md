# Payment Gateway Integration

## Overview
S2S (Server-to-Server) payment processing with webhook-based status updates.

## Architecture
```
API (3000) → Payment Gateway (3001) → Simulated Processing → Webhook → API
```

**Flow:**
1. User checkout → API creates order
2. API calls payment gateway `/payments/initiate`
3. Gateway creates payment record, returns payment ID
4. After 15s, gateway processes payment (80% success, 20% fail)
5. Gateway creates ledger entries (80% restaurant, 15% delivery, 5% platform)
6. Gateway sends webhook to API `POST /webhooks/payment`
7. API updates order status (CONFIRMED/CANCELLED)

## Key Files
- **API**: [payment-gateway.client.ts](apps/api/src/payments/payment-gateway.client.ts) - HTTP client
- **API**: [payment-webhook.controller.ts](apps/api/src/payments/payment-webhook.controller.ts) - Receives webhooks
- **Gateway**: [webhook.service.ts](apps/payment-gateway/src/webhook/webhook.service.ts) - Sends webhooks

## Environment
```env
PAYMENT_GATEWAY_URL=http://localhost:3001
API_WEBHOOK_URL=http://localhost:3000/webhooks/payment
```

## Testing
```bash
npm run start:dev          # Terminal 1 - API
npm run start:payment      # Terminal 2 - Payment Gateway
# Create order via API → auto-processes in 15s
```

## Production Ready
✅ S2S HTTP communication  
✅ Dual database architecture  
✅ Automatic ledger entries  
✅ Webhook notifications  
⚠️ Add: Signature verification, retry logic, real provider (Razorpay/Stripe)
