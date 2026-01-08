# Environment Configuration Guide

This application supports multiple environments: **development**, **uat**, and **production**.

## Environment Files

- `.env.development` - Development environment configuration
- `.env.uat` - UAT (User Acceptance Testing) environment configuration  
- `.env.production` - Production environment configuration
- `.env.example` - Template file showing all available environment variables

## Setup

1. **Copy the example file** for your environment:
   ```bash
   # For development (already created)
   cp .env.example .env.development
   
   # For UAT
   cp .env.example .env.uat
   
   # For production
   cp .env.example .env.production
   ```

2. **Update the values** in each environment file with appropriate credentials and settings.

## Running the Application

### Development
```bash
npm run start:dev
```
This will load `.env.development` and run in watch mode.

### UAT
```bash
npm run start:uat
```
This will load `.env.uat` and run in watch mode.

### Production
```bash
# First build the application
npm run build

# Then start in production mode
npm run start:prod
```
This will load `.env.production` and run the compiled application.

## Using ConfigService

Instead of accessing `process.env` directly, use the custom `ConfigService`:

```typescript
import { ConfigService } from './common/config/config.service';

@Injectable()
export class YourService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Type-safe access to configuration
    const port = this.configService.port;
    const jwtSecret = this.configService.jwtSecret;
    
    // Check environment
    if (this.configService.isDevelopment) {
      // Development-specific logic
    }
    
    if (this.configService.isProduction) {
      // Production-specific logic
    }
    
    // Access any config value
    const customValue = this.configService.get('customKey');
  }
}
```

## Environment Variables

### Application
- `NODE_ENV` - Environment name (development, uat, production)
- `PORT` - Port number for the application (default: 3000)

### Database
- `DATABASE_URL` - PostgreSQL connection string

### JWT
- `JWT_SECRET` - Secret key for JWT signing (MUST be different in each environment)
- `JWT_EXPIRES_IN` - Access token expiration (e.g., "7d", "30d")
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration

### Redis
- `REDIS_URL` - Redis connection URL
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (empty for local development)

### RabbitMQ
- `RABBITMQ_URL` - RabbitMQ connection URL

### Business Logic
- `PER_KM_DELIVERY_RATE` - Delivery rate per kilometer

### Seeding (Development/UAT only)
- `SEED_CENTER_LAT` - Center latitude for seeding data
- `SEED_CENTER_LNG` - Center longitude for seeding data
- `SEED_MAX_RADIUS_KM` - Maximum radius for seeding data

## Security Best Practices

1. **Never commit** `.env.*` files to version control (except `.env.example`)
2. **Use strong secrets** in UAT and production environments
3. **Different credentials** for each environment
4. **Rotate secrets** regularly in production
5. **Use environment variables** from your hosting platform in production (e.g., Heroku Config Vars, AWS Secrets Manager, Azure Key Vault)

## Adding New Environment Variables

1. Add the variable to `.env.example`
2. Add it to all environment-specific files (`.env.development`, `.env.uat`, `.env.production`)
3. Update `src/common/config/environment.interface.ts` to include the new variable type
4. Update `src/common/config/configuration.ts` to load the variable
5. Add a getter method in `src/common/config/config.service.ts` for type-safe access
