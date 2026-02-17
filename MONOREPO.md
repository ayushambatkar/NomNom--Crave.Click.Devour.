# Monorepo Architecture

## Structure
```
apps/
├── api/              # Main API (port 3000, PostgreSQL:5432)
└── payment-gateway/  # Payment service (port 3001, PostgreSQL:5433)

libs/
├── common/           # Logger, config utilities
├── redis/            # Redis & caching
└── rabbitmq/         # Message queue
```

## Quick Start
```bash
npm install
npm run dev:up                    # Start Docker services
npm run prisma:generate           # Generate API client
npm run prisma:generate:payment   # Generate payment client
npm run db:deploy:dev             # Apply migrations
npm run start:dev                 # Start API
npm run start:payment             # Start payment gateway
```

## Applications

### API (Port 3000)
- RBAC (CUSTOMER, RESTAURANT_OWNER, ADMIN)
- Restaurant & menu management
- Cart & orders
- Payment integration via HTTP client

### Payment Gateway (Port 3001)
- Payment orchestration layer
- Ledger system (80% restaurant, 15% delivery, 5% platform)
- Webhook notifications to API
- Ready for Razorpay/Stripe integration

## Databases
| App | Port | Database | User |
|-----|------|----------|------|
| API | 5432 | devdb | devuser |
| Payment | 5433 | paymentdb | paymentuser |

## Key Commands
```bash
npm run build:api           # Build API
npm run build:payment       # Build payment gateway
npm run db:seed            # Seed data
npm run prisma:studio      # DB GUI (API)
npm run prisma:studio:payment  # DB GUI (Payment)
```

## Documentation
- [Payment Integration](PAYMENT_INTEGRATION.md) - S2S communication flow
- [Environment Setup](ENVIRONMENT.md) - Config management
- [Setup Guide](SETUP_COMPLETE.md) - Initial setup notes
