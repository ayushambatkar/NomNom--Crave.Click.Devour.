# Environment Configuration

## Environments
- **development** - Local development
- **uat** - User acceptance testing
- **production** - Production deployment

## Files
- `.env.development` - Dev config (default)
- `.env.uat` - UAT config
- `.env.production` - Production config
- `.env.example` - Template

## Usage
```bash
npm run start:dev      # Loads .env.development
npm run start:uat      # Loads .env.uat
npm run start:prod     # Loads .env.production
```

## Type-Safe Config Access
```typescript
import { ConfigService } from './common/config/config.service';

constructor(private config: ConfigService) {}

// Access
this.config.port
this.config.jwtSecret
this.config.databaseUrl
this.config.isDevelopment
this.config.isProduction
```

## Key Variables
| Variable | Description |
|----------|-------------|
| NODE_ENV | Environment name |
| PORT | Server port |
| DATABASE_URL | PostgreSQL connection |
| JWT_SECRET | JWT signing key |
| REDIS_URL | Redis connection |
| RABBITMQ_URL | RabbitMQ connection |
| PAYMENT_GATEWAY_URL | Payment service URL |

See [CONFIG_MIGRATION.md](CONFIG_MIGRATION.md) for migration from `@nestjs/config`.
