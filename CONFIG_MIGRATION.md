# Migration Guide: Using Custom ConfigService

This guide shows how to migrate from using `@nestjs/config`'s ConfigService directly to using our custom type-safe ConfigService.

## Before (Old Way)

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService, // @nestjs/config
  ) {}

  async signToken(userId: string): Promise<string> {
    const secret = this.config.get('JWT_SECRET'); // No type safety
    const expiresIn = this.config.get('JWT_EXPIRES_IN');
    
    return this.jwt.signAsync({ sub: userId }, {
      expiresIn,
      secret,
    });
  }
}
```

## After (New Way)

```typescript
import { ConfigService } from './common/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService, // Custom ConfigService
  ) {}

  async signToken(userId: string): Promise<string> {
    const secret = this.config.jwtSecret; // Type-safe!
    const expiresIn = this.config.jwtExpiresIn;
    
    return this.jwt.signAsync({ sub: userId }, {
      expiresIn,
      secret,
    });
  }
}
```

## Benefits

1. **Type Safety**: Autocomplete and type checking for all config values
2. **Centralized**: All configuration access goes through one service
3. **Environment Helpers**: Built-in methods like `isDevelopment`, `isProduction`
4. **Cleaner Code**: No need to remember exact environment variable names

## Example: Environment-Specific Logic

```typescript
import { ConfigService } from './common/config/config.service';

@Injectable()
export class SomeService {
  constructor(private config: ConfigService) {}

  doSomething() {
    // Environment checks
    if (this.config.isDevelopment) {
      console.log('Running in development mode');
      // Use hardcoded OTP, verbose logging, etc.
    }
    
    if (this.config.isProduction) {
      console.log('Running in production mode');
      // Use real SMS provider, structured logging, etc.
    }
    
    // Access all config values
    const dbUrl = this.config.databaseUrl;
    const redisHost = this.config.redisHost;
    const port = this.config.port;
  }
}
```

## Updating Existing Services

You don't need to change existing services immediately. Both approaches will work:

- Old: `this.config.get('JWT_SECRET')`
- New: `this.config.jwtSecret`

However, it's recommended to gradually migrate to the new approach for better type safety.

## Note

The custom ConfigService wraps `@nestjs/config`'s ConfigService, so you can still use `.get()` method for any custom or new variables not yet added to the typed interface.
