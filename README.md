# NomNom -- Crave. Click. Devour.

<a href="http://35.154.25.12/"> Production </a>

A food delivery service prototype built using **NestJS**, **Prisma**, **PostgreSQL**, **Redis**, and **RabbitMQ**.

## Features

- 🔐 **Phone number + OTP authentication** (hardcoded OTP: `123456` for testing)
- 👤 **Guest login** with seamless upgrade to registered user
- 🍽️ **Restaurants** with address, geo-coordinates, opening/closing times, handling fees, and packaging charges
- 📍 **Location-based restaurant discovery** with Haversine distance calculation
- 🍕 **Menu items** per restaurant with availability status
- 🛒 **Shopping cart** - one cart per user; items from one restaurant only; auto-resets on cross-restaurant add
- 💰 **Dynamic cart totals** including subtotal, handling fee, packaging charges, delivery fee (₹10/km), and tax
- 📦 **Orders & Checkout** with order lifecycle management
- 💳 **Payment simulation** with status progression via RabbitMQ
- ⚡ **Redis caching** for restaurants, menus, and user orders
- 🐰 **RabbitMQ** for async payment and order status updates

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client
        APP[Mobile/Web App]
    end

    subgraph API["NestJS API Server"]
        AUTH[Auth Module]
        USERS[Users Module]
        REST[Restaurants Module]
        CART[Cart Module]
        ORDERS[Orders Module]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        REDIS[(Redis)]
    end

    subgraph MQ["Message Queue"]
        RMQ[RabbitMQ]
        PQ[payments queue]
        OQ[orders queue]
    end

    APP -->|HTTP/REST| API
    AUTH --> PG
    AUTH --> REDIS
    USERS --> PG
    USERS --> REDIS
    REST --> PG
    REST --> REDIS
    CART --> PG
    CART --> REDIS
    ORDERS --> PG
    ORDERS --> RMQ
    RMQ --> PQ
    RMQ --> OQ
```

---

## Order & Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as NestJS API
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant EVT as OrdersEvents

    U->>API: POST /orders/checkout
    API->>DB: Create Order (PENDING)
    API->>DB: Create Payment (INITIATED)
    API->>DB: Snapshot cart items
    API->>API: Clear cart
    API-->>U: Return invoice

    Note over API,MQ: After 5 seconds
    API->>MQ: Publish payment.pending
    MQ->>EVT: Consume payment.pending
    EVT->>DB: Update Payment → PENDING

    Note over API,MQ: After 15 seconds
    alt 80% Success
        API->>MQ: Publish payment.success
        MQ->>EVT: Consume payment.success
        EVT->>DB: Update Payment → SUCCESS
        EVT->>MQ: Publish order.confirmed
        MQ->>EVT: Consume order.confirmed
        EVT->>DB: Update Order → CONFIRMED
    else 20% Failure
        API->>MQ: Publish payment.failed
        MQ->>EVT: Consume payment.failed
        EVT->>DB: Update Payment → FAILED
        EVT->>DB: Update Order → CANCELLED
    end

    Note over EVT: Every 10s lifecycle tick
    loop Order Progression
        EVT->>DB: Query active orders
        EVT->>MQ: Publish next status
        EVT->>DB: CONFIRMED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
    end
```

---

## Order Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Checkout
    PENDING --> CONFIRMED: Payment Success
    PENDING --> CANCELLED: Payment Failed / Timeout
    
    CONFIRMED --> ACCEPTED: Restaurant accepts
    ACCEPTED --> PREPARING: Kitchen starts
    PREPARING --> OUT_FOR_DELIVERY: Ready for pickup
    OUT_FOR_DELIVERY --> DELIVERED: Delivered
    
    CONFIRMED --> CANCELLED: Random 20%
    ACCEPTED --> CANCELLED: Random 20%
    PREPARING --> CANCELLED: Random 20%
    
    DELIVERED --> [*]
    CANCELLED --> [*]
```

---

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── auth.controller.ts   # Auth endpoints (OTP, guest, refresh)
│   ├── auth.service.ts      # Auth business logic
│   ├── decorator/           # Custom decorators (@GetUser)
│   ├── dto/                 # Request DTOs
│   ├── guard/               # JWT guard
│   └── strategy/            # Passport JWT strategy
├── cart/                    # Shopping cart module
│   ├── cart.controller.ts   # Cart endpoints
│   ├── cart.service.ts      # Cart business logic
│   ├── cart.repository.ts   # Database operations
│   ├── dto/                 # Request DTOs
│   ├── entities/            # Cart view entities
│   └── util/                # Cart totals calculation
├── common/                  # Shared utilities
│   ├── decorators/          # @SnakeBody decorator
│   ├── dto/                 # Shared DTOs (Address)
│   ├── logger/              # Logging service
│   ├── mq/                  # RabbitMQ service
│   └── redis/               # Redis & Cache services
├── orders/                  # Orders module
│   ├── orders.controller.ts # Order endpoints
│   ├── orders.service.ts    # Order business logic
│   ├── orders.events.ts     # MQ consumers & lifecycle
│   └── dto/                 # Request DTOs
├── prisma/                  # Prisma database module
├── restaurants/             # Restaurants module
│   ├── restaurants.controller.ts
│   ├── restaurants.service.ts
│   ├── restaurant.repository.ts
│   └── dto/                 # Request DTOs
└── users/                   # Users module
    ├── users.controller.ts
    ├── users.service.ts
    ├── user.repository.ts
    ├── guest-user.service.ts  # Redis-based guest users
    ├── guest-user.repository.ts
    └── dto/                 # Request DTOs
```

---

## API Documentation

**Base URL:** `/api/v1`

All endpoints (except guest login) require `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/guest` | - | Get guest access token |
| `POST` | `/auth/request-otp` | `{ "phone_number": "+91..." }` | Request OTP for phone |
| `POST` | `/auth/resend-otp` | `{ "phone_number": "+91..." }` | Resend OTP |
| `POST` | `/auth/verify-otp` | `{ "phone_number": "+91...", "otp": "123456" }` | Verify OTP & get tokens |
| `POST` | `/auth/refresh` | `{ "refresh_token": "..." }` | Refresh access token |

**Response (verify-otp/guest):**
```json
{
    "user_id": "uuid",
    "access_token": "jwt...",
    "refresh_token": "jwt..."
}
```

---

### Users

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/users/me` | - | Get current user profile |
| `PUT` | `/users/me` | `{ "name": "...", "email": "...", "address": {...} }` | Update profile |
| `PATCH` | `/users/address` | `{ "line1": "...", "city": "...", "latitude": 12.97, "longitude": 77.59 }` | Update address (works for guest & registered) |

**Update Address Body:**
```json
{
    "line1": "123 Main Street",
    "city": "Bengaluru",
    "country": "India",
    "latitude": 12.9716,
    "longitude": 77.5946
}
```

---

### Restaurants

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| `GET` | `/restaurants` | - | List restaurants (based on user location) |
| `GET` | `/restaurants/nearby` | `lat`, `lng`, `radius_km` | Find restaurants within radius |
| `GET` | `/restaurants/:id` | - | Get restaurant details |
| `POST` | `/restaurants` | Body (see below) | Create restaurant |
| `PUT` | `/restaurants/:id` | Body | Update restaurant |
| `GET` | `/restaurants/:id/menu-items` | - | List menu items (cached) |
| `POST` | `/restaurants/:id/menu-items` | Body | Add menu item |

**Create Restaurant Body:**
```json
{
    "name": "Test Kitchen",
    "opening_time": "09:00",
    "closing_time": "22:00",
    "handling_fee": 15,
    "packaging_charges": 10,
    "address": {
        "line1": "123 Main St",
        "city": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
}
```

**Nearby Response:**
```json
[
    {
        "id": "uuid",
        "name": "Kebab Kitchen",
        "opening_time": "10:16",
        "closing_time": "22:53",
        "handling_fee": 14.42,
        "packaging_charges": 5.53,
        "address": {
            "id": "uuid",
            "line1": "61 Main Street",
            "city": "Bengaluru",
            "latitude": 12.9800,
            "longitude": 77.5900
        },
        "distance_km": 3.12
    }
]
```

**Add Menu Item Body:**
```json
{
    "name": "Paneer Tikka",
    "description": "Spicy cottage cheese cubes",
    "price": 180,
    "is_available": true
}
```

---

### Cart

| Method | Endpoint | Body/Params | Description |
|--------|----------|-------------|-------------|
| `GET` | `/cart` | - | Get current cart with totals |
| `POST` | `/cart/add` | `{ "menu_item_id": "uuid", "quantity": 2 }` | Add item to cart |
| `GET` | `/cart/decrement` | `?menu_item_id=uuid&quantity=1` | Decrement item quantity |
| `POST` | `/cart/clear` | - | Clear entire cart |
| `DELETE` | `/cart/item/:menuItemId` | - | Remove item from cart |

**Cart Response:**
```json
{
    "id": "uuid",
    "user_id": "uuid",
    "restaurant": {
        "id": "uuid",
        "name": "Kebab Kitchen"
    },
    "items": [
        {
            "id": "uuid",
            "menu_item": {
                "id": "uuid",
                "name": "Paneer Tikka",
                "price": 180
            },
            "quantity": 2,
            "unit_price": 180
        }
    ],
    "subtotal": 360,
    "handling_fee": 14.42,
    "packaging_charges": 5.53,
    "delivery_charges": 31.20,
    "tax_amount": 18,
    "total": 429.15
}
```

**Cart Totals Calculation:**
- `subtotal` = Σ(item.unitPrice × item.quantity)
- `handlingFee` = restaurant.handlingFee
- `packagingCharges` = restaurant.packagingCharges
- `deliveryCharges` = Math.ceil(distanceKm) × PER_KM_DELIVERY_RATE (default ₹10/km)
- `taxAmount` = subtotal × TAX_RATE (default 5%)
- `total` = subtotal + handlingFee + packagingCharges + deliveryCharges + taxAmount

---

### Orders

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/orders/checkout` | `{ "note": "No onions" }` | Create order from cart |
| `GET` | `/orders` | - | List user's orders (cached) |
| `GET` | `/orders/:id` | - | Get order invoice |
| `GET` | `/orders/:id/events` | - | Get order event history |

**Checkout Response (Invoice):**
```json
{
    "id": "uuid",
    "user_id": "uuid",
    "restaurant_id": "uuid",
    "amount": 429.15,
    "payment_status": "INITIATED",
    "order_status": "PENDING",
    "address_snapshot": {
        "user_address": {...},
        "restaurant_address": "uuid",
        "note": "No onions"
    },
    "items": [
        {
            "id": "uuid",
            "name": "Paneer Tikka",
            "unit_price": 180,
            "quantity": 2
        }
    ],
    "payment": {
        "id": "uuid",
        "provider": "DUMMY",
        "status": "INITIATED",
        "transaction_id": "txn_abc123"
    },
    "created_at": "2025-12-10T10:00:00Z"
}
```

**Order Statuses:** `PENDING` → `CONFIRMED` → `ACCEPTED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` | `CANCELLED`

**Payment Statuses:** `INITIATED` → `PENDING` → `SUCCESS` | `FAILED`

---

## Caching Strategy

Redis is used to cache frequently accessed data:

| Key Pattern | Data | TTL | Invalidation |
|-------------|------|-----|--------------|
| `restaurant:{id}` | Single restaurant | 1 hour | On restaurant update |
| `restaurant:{id}:menu` | Menu items | 30 min | On menu item add/update |
| `nearby:{lat}:{lng}:{radius}` | Nearby restaurants | 5 min | On restaurant create/update |
| `user:{userId}:orders` | User's order list | 2 min | On order create/update |
| `guest:{userId}` | Guest user data | 7 days | On upgrade to registered |
| `cart:guest:{userId}` | Guest cart | 7 days | On cart operations |

Coordinates are rounded to 2 decimal places (~1km precision) for cache grouping.

---

## Project Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 13+
- Redis 7+
- RabbitMQ 4+

### Installation

```bash
# Install dependencies
npm install

# Start infrastructure (Postgres, Redis, RabbitMQ)
npm run dev:up

# Apply database migrations
npx prisma migrate dev

# Seed sample data
npm run db:seed

# Start development server
npm run start:dev
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/devdb?schema=public"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Redis (optional - defaults shown)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

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
- **PostgreSQL**: `localhost:5432` (devuser/devpassword)
- **Redis**: `localhost:6379`
- **RabbitMQ**: `localhost:5672` (AMQP), `localhost:15672` (Management UI - admin/admin)

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm run dev:up` | Start Docker services |
| `npm run dev:down` | Stop Docker services |
| `npm run db:seed` | Seed sample data (18 restaurants, 15 users) |
| `npm run db:clear` | Clear all data |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | NestJS 11 |
| **ORM** | Prisma 6 |
| **Database** | PostgreSQL 13 |
| **Cache** | Redis 8 |
| **Message Queue** | RabbitMQ 4 |
| **Auth** | JWT (passport-jwt) |
| **Validation** | class-validator, class-transformer |
| **Language** | TypeScript 5 |

---

## License

[MIT](LICENSE)
