import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { Database } from './config/database';
import { LicenseModel } from './models/LicenseModel';
import { LicenseService } from './services/LicenseService';
import { LicenseController } from './controllers/LicenseController';
import { createLicenseRoutes } from './routes/licenseRoutes';
import { 
  conditionalCorsMiddleware,
  securityHeaders, 
  generalRateLimit 
} from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/validation';
import logger from './utils/logger';

class App {
  private app: express.Application;
  private db: Database;

  constructor() {
    this.app = express();
    const { dbConfig } = require('./config');
    this.db = new Database(dbConfig);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.set('trust proxy', true);
    
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false
    }));
    this.app.use(securityHeaders);
    this.app.use(generalRateLimit);
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    this.app.use(compression());
    
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    const licenseModel = new LicenseModel(this.db);
    const licenseService = new LicenseService(licenseModel);
    const licenseController = new LicenseController(licenseService);

    this.app.use('/api/license', conditionalCorsMiddleware);
    this.app.use('/api/license', createLicenseRoutes(licenseController));
    
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Block Builder License Server',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          verify: 'POST /api/license/verify',
          create: 'POST /api/license/create',
          stats: 'GET /api/license/stats',
          webhook: 'POST /api/license/webhook'
        }
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      const isConnected = await this.db.testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }
      
      logger.info('Database connected successfully');

      this.app.listen(config.port, () => {
        logger.info(`🚀 License Server running on port ${config.port}`);
        logger.info(`📡 API: http://localhost:${config.port}/api`);
        logger.info(`🏠 Health: http://localhost:${config.port}/health`);
        logger.info(`🌍 Environment: ${config.nodeEnv}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    await this.db.close();
    logger.info('Server stopped');
  }
}

export default App;
