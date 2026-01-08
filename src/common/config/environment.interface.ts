export interface EnvironmentConfig {
  // Application
  nodeEnv: string;
  port: number;
  
  // Database
  databaseUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  
  // Redis
  redisUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  
  // Business
  perKmDeliveryRate: number;
  
  // RabbitMQ
  rabbitmqUrl: string;
  
  // Seeding
  seedCenterLat?: string;
  seedCenterLng?: string;
  seedMaxRadiusKm?: string;
}
