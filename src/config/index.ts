import dotenv from 'dotenv';
import { AppConfig, DatabaseConfig } from '../types';

dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env['PORT'] || '3010', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  jwtSecret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '7d',
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  licenseKeyPrefix: process.env['LICENSE_KEY_PREFIX'] || 'BB',
  licenseKeyLength: parseInt(process.env['LICENSE_KEY_LENGTH'] || '16', 10),
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
  corsAllowedOrigins: process.env['CORS_ALLOWED_ORIGINS'] 
    ? process.env['CORS_ALLOWED_ORIGINS'].split(',').map(o => o.trim())
    : ['http://localhost:3000'],
  logLevel: process.env['LOG_LEVEL'] || 'info',
  logFile: process.env['LOG_FILE'] || 'logs/server.log'
};

export const dbConfig: DatabaseConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432', 10),
  database: process.env['DB_NAME'] || 'block_builder_licenses',
  user: process.env['DB_USER'] || 'postgres',
  password: process.env['DB_PASSWORD'] || 'password',
  ssl: process.env['DB_SSL'] === 'true'
};

export default config;
