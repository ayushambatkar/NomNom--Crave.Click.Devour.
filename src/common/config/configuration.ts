export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // Redis
  redisUrl: process.env.REDIS_URL,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  redisPassword: process.env.REDIS_PASSWORD || '',
  redisDb: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
  
  // Business
  perKmDeliveryRate: process.env.PER_KM_DELIVERY_RATE 
    ? parseFloat(process.env.PER_KM_DELIVERY_RATE) 
    : 10,
  
  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL,
  
  // Seeding
  seedCenterLat: process.env.SEED_CENTER_LAT,
  seedCenterLng: process.env.SEED_CENTER_LNG,
  seedMaxRadiusKm: process.env.SEED_MAX_RADIUS_KM,
});
