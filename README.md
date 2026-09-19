# NomNom -- Crave. Click. Devour.

<a href="https://nomnom-crave-click-devour.onrender.com/"> Production </a>

A food delivery service built with **NestJS monorepo**, featuring **microservices architecture**, **RBAC**, **S2S payment gateway**, **Redis caching**, and **RabbitMQ**.

## Features

- **Authentication & Authorization** - OTP-based login, guest users with upgrade path, JWT with refresh tokens, RBAC (Customer/Owner/Admin)
- **Restaurant Management** - Ownership model, geo-based discovery (Haversine), menu management
- **Shopping & Orders** - Single-restaurant cart, dynamic pricing (distance-based delivery, tax, fees), order lifecycle tracking
- **Payment Gateway** - Microservice architecture with S2S communication, webhooks, automated ledger entries (80/15/5 revenue split)
- **Performance** - Redis caching layer, RabbitMQ for async operations
- **Architecture** - NestJS monorepo with shared libraries, dual PostgreSQL databases

---

## 📚 Documentation

- **[MONOREPO.md](MONOREPO.md)** - Monorepo structure, apps, shared libraries
- **[PAYMENT_INTEGRATION.md](PAYMENT_INTEGRATION.md)** - S2S payment flow, webhooks, testing
- **[ENVIRONMENT.md](ENVIRONMENT.md)** - Multi-environment configuration (dev/uat/prod)
- **[CONFIG_MIGRATION.md](CONFIG_MIGRATION.md)** - Type-safe config service usage
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Initial setup summary

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client
        APP[Mobile/Web App]
    end

    subgraph API["API Service (Port 3000)"]
        AUTH[Auth Module]
        USERS[Users Module]
        REST[Restaurants Module]
        CART[Cart Module]
        ORDERS[Orders Module]
        PAYMENTS[Payments Module]
    end

    subgraph PaymentGW["Payment Gateway (Port 3001)"]
        PAY[Payment Service]
        LEDGER[Ledger Service]
        WEBHOOK[Webhook Service]
    end

    subgraph Data["Data Layer"]
        PG1[(API DB<br/>PostgreSQL:5432)]
        PG2[(Payment DB<br/>PostgreSQL:5433)]
        REDIS[(Redis:6379)]
    end

    subgraph MQ["Message Queue"]
        RMQ[RabbitMQ:5672]
    end

    APP -->|HTTP/REST| API
    AUTH --> PG1
    AUTH --> REDIS
    USERS --> PG1
    USERS --> REDIS
    REST --> PG1
    REST --> REDIS
    CART --> PG1
    CART --> REDIS
    ORDERS --> PG1
    ORDERS --> RMQ
    PAYMENTS -->|S2S HTTP| PaymentGW
    PaymentGW -->|Webhook| PAYMENTS
    PAY --> PG2
    LEDGER --> PG2
    WEBHOOK --> PG2
```

> **See [MONOREPO.md](MONOREPO.md) for detailed architecture.**

---

## What's Inside

### API Service (Port 3000)
- **Authentication** - OTP-based login, guest users, JWT with refresh tokens
- **Users** - Profile management, RBAC (Customer/Owner/Admin)
- **Restaurants** - CRUD operations with ownership, geo-based search
- **Menu** - Items management with availability tracking
- **Cart** - Single-restaurant cart with dynamic pricing (delivery, tax, fees)
- **Orders** - Checkout, lifecycle management (PENDING → DELIVERED)
- **Search** - Restaurant and menu discovery
- **Payments** - Integration with payment gateway microservice

### Payment Gateway (Port 3001)
- **Payment Processing** - Initiation, status tracking, simulation
- **Ledger System** - Revenue splits (80% restaurant, 15% delivery, 5% platform)
- **Webhooks** - Notifies API of payment status changes
- **Transactions** - Complete payment history

### Shared Libraries
- **@app/common** - Logger, config management, utilities
- **@app/redis** - Caching service (restaurants, menus, orders)
- **@app/rabbitmq** - Message queue for async operations

> **See [PAYMENT_INTEGRATION.md](PAYMENT_INTEGRATION.md) for S2S payment flow details.**

---

## Project Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### Installation

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL x2, Redis, RabbitMQ)
npm run dev:up

# Generate Prisma clients
npm run prisma:generate
npm run prisma:generate:payment

# Apply database migrations
npm run db:deploy:dev

# Seed sample data
npm run db:seed

# Start both applications
npm run start:dev          # Terminal 1 - API (port 3000)
npm run start:payment      # Terminal 2 - Payment Gateway (port 3001)
```

> **See [MONOREPO.md](MONOREPO.md) for detailed setup and [ENVIRONMENT.md](ENVIRONMENT.md) for configuration.**

### Environment Variables

See `.env.example` for all variables. Key ones:

```env
# API Database
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/devdb?schema=public"

# Payment Gateway Database
PAYMENT_DATABASE_URL="postgresql://paymentuser:paymentpassword@localhost:5433/paymentdb?schema=public"

# Payment Integration
PAYMENT_GATEWAY_URL="http://localhost:3001"
API_WEBHOOK_URL="http://localhost:3000/webhooks/payment"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# RabbitMQ
RABBITMQ_URL="amqp://admin:admin@localhost:5672"

# Cart pricing
PER_KM_DELIVERY_RATE=10
TAX_RATE=0.05
```

### Docker Services

```bash
# Start all services
npm run dev:up

# Stop services
npm run dev:down

# Restart services
npm run dev:restart
```

Services exposed:
- **API Database (PostgreSQL)**: `localhost:5432` (devuser/devpassword)
- **Payment Database (PostgreSQL)**: `localhost:5433` (paymentuser/paymentpassword)
- **Redis**: `localhost:6379`
- **RabbitMQ**: `localhost:5672` (AMQP), `localhost:15672` (Management UI - admin/admin)

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start API in watch mode (port 3000) |
| `npm run start:payment` | Start payment gateway (port 3001) |
| `npm run build:api` | Build API for production |
| `npm run build:payment` | Build payment gateway |
| `npm run dev:up` | Start Docker services |
| `npm run dev:down` | Stop Docker services |
| `npm run db:seed` | Seed API database (18 restaurants, 15 users) |
| `npm run db:clear` | Clear API database |
| `npm run prisma:studio` | Open Prisma Studio for API DB |
| `npm run prisma:studio:payment` | Open Prisma Studio for Payment DB |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |

> **See [MONOREPO.md](MONOREPO.md) for complete command reference.**

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Architecture** | NestJS 11 Monorepo |
| **ORM** | Prisma 6 |
| **Database** | PostgreSQL 13 (dual instances) |
| **Cache** | Redis 8 |
| **Message Queue** | RabbitMQ 4 |
| **Auth** | JWT (passport-jwt) + RBAC |
| **Validation** | class-validator, class-transformer |
| **Language** | TypeScript 5 |

---

## License

[MIT](LICENSE)
