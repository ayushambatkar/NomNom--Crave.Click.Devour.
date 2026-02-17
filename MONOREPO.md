# NomNom - Monorepo Structure

## 🏗️ Architecture

This is a **NestJS monorepo** containing multiple applications and shared libraries.

### Structure

```
nomnom_api/
├── apps/
│   ├── api/                    # Main food delivery API
│   │   ├── src/
│   │   ├── prisma/
│   │   └── test/
│   │
│   └── payment-gateway/        # Payment processing service
│       ├── src/
│       ├── prisma/
│       └── test/
│
├── libs/
│   ├── common/                 # Shared utilities (logger, config)
│   ├── redis/                  # Redis service & caching
│   └── rabbitmq/               # Message queue service
│
├── docker-compose.yaml
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Installation

```bash
# Install dependencies
npm install

# Start databases
npm run dev:up

# Generate Prisma clients
npm run prisma:generate
npm run prisma:generate:payment

# Run migrations
npm run db:deploy:dev
$env:PAYMENT_DATABASE_URL="postgresql://paymentuser:paymentpassword@localhost:5433/paymentdb?schema=public"
npx prisma migrate deploy --schema=apps/payment-gateway/prisma/schema.prisma
```

---

## 📦 Applications

### API (Main Service)
**Port:** 3000  
**Database:** PostgreSQL (port 5432)

Features:
- ✅ User authentication with roles (CUSTOMER, RESTAURANT_OWNER, ADMIN)
- ✅ Restaurant management (owners can CRUD their restaurants)
- ✅ Menu management
- ✅ Cart system
- ✅ Order management
- ✅ Search functionality
- ✅ Guest user support

```bash
# Development
npm run start:dev

# Production build
npm run build:api
npm run start:prod
```

### Payment Gateway
**Port:** 3001  
**Database:** PostgreSQL (port 5433)

Features:
- ✅ Payment initiation
- ✅ Webhook handling (mock provider)
- ✅ Ledger system (tracks restaurant/platform/delivery earnings)
- ✅ Transaction history

```bash
# Development
npm run start:payment

# Production build
npm run build:payment
npm run start:payment:prod
```

---

## 🗄️ Databases

| Service | Port | User | Password | Database |
|---------|------|------|----------|----------|
| API DB | 5432 | devuser | devpassword | devdb |
| Payment DB | 5433 | paymentuser | paymentpassword | paymentdb |

### Environment Variables

```env
# Main API
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/devdb?schema=public"
PORT=3000

# Payment Gateway
PAYMENT_DATABASE_URL="postgresql://paymentuser:paymentpassword@localhost:5433/paymentdb?schema=public"
PAYMENT_PORT=3001

# Shared Services
REDIS_URL="redis://localhost:6379"
RABBITMQ_URL="amqp://admin:admin@localhost:5672"
```

---

## 📚 Shared Libraries

### @app/common
- Logger service
- Configuration service
- Common utilities

### @app/redis
- Redis connection service
- Caching service

### @app/rabbitmq
- RabbitMQ connection service
- Queue management

**Usage:**
```typescript
import { LoggerService, ConfigService } from '@app/common';
import { RedisService, CacheService } from '@app/redis';
import { RabbitMQModule } from '@app/rabbitmq';
```

---

## 🔐 Roles & Authorization

### User Roles
- **CUSTOMER**: Browse restaurants, place orders
- **RESTAURANT_OWNER**: Create/manage restaurants and menus
- **ADMIN**: Full system access

### Protected Endpoints

```typescript
// Example: Only restaurant owners can create restaurants
@Post('restaurants')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
createRestaurant(@Body() dto: CreateRestaurantDto) { }
```

---

## 💳 Payment Gateway API

### Endpoints

#### Initiate Payment
```bash
POST http://localhost:3001/payments/initiate
Content-Type: application/json

{
  "orderId": "order-uuid",
  "amount": 500.00,
  "currency": "INR"
}
```

#### Check Payment Status
```bash
GET http://localhost:3001/payments/order/{orderId}
```

#### Simulate Success (Testing)
```bash
POST http://localhost:3001/webhook/simulate/success/{paymentId}
```

#### Get Restaurant Earnings
```bash
GET http://localhost:3001/ledger/restaurant/{restaurantId}
```

#### Platform Revenue
```bash
GET http://localhost:3001/ledger/platform
```

---

## 🛠️ Development Scripts

```bash
# Start all services
npm run dev:up

# Stop all services
npm run dev:down

# Database seeds
npm run db:seed
npm run db:clear

# Build
npm run build              # Build all
npm run build:api          # Build API only
npm run build:payment      # Build payment gateway only

# Run apps
npm run start:dev          # Start API
npm run start:payment      # Start payment gateway
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 📝 Database Schemas

### API Database Tables
- Users (with roles)
- Restaurants (with owners)
- MenuItems
- Carts & CartItems
- Orders & OrderItems
- Payments
- Addresses

### Payment Gateway Tables
- Payment (orderId, amount, status, provider)
- Transaction (payment history)
- LedgerEntry (earnings tracking per entity)

---

## 🐳 Docker Services

```yaml
services:
  dev-db:          # API database (5432)
  payment-db:      # Payment database (5433)
  dev-redis:       # Redis cache (6379)
  dev-rabbitmq:    # Message queue (5672, 15672)
```

---

## 🚨 Important Notes

1. **Prisma Client Paths**: Payment gateway uses a custom output path
   ```typescript
   import { PrismaClient } from '../../../../node_modules/.prisma/payment-gateway-client';
   ```

2. **Role Assignment**: Users default to CUSTOMER role. To make a restaurant owner:
   ```sql
   UPDATE users SET role = 'RESTAURANT_OWNER' WHERE id = 'user-uuid';
   ```

3. **Restaurant Ownership**: Only the owner (or admin) can update their restaurants

4. **Ledger Split** (configurable in PaymentService):
   - 80% → Restaurant
   - 15% → Delivery Partner
   - 5% → Platform

---

## 📮 Postman Collection

Import `NomNom API.postman_collection.json` for API testing.

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests and build
4. Submit PR

---

## 📄 License

UNLICENSED (Private Project)
