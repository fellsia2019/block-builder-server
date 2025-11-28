import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { Database } from './config/database';
import { LicenseModel } from './models/LicenseModel';
import { LicenseService } from './services/LicenseService';
import { LicenseController } from './controllers/LicenseController';
import { createLicenseRoutes } from './routes/licenseRoutes';
import { FeedbackModel } from './models/FeedbackModel';
import { FeedbackService } from './services/FeedbackService';
import { FeedbackController } from './controllers/FeedbackController';
import { createFeedbackRoutes } from './routes/feedbackRoutes';
import { UploadController } from './controllers/UploadController';
import { createUploadRoutes } from './routes/uploadRoutes';
import { 
  conditionalCorsMiddleware,
  securityHeaders, 
  generalRateLimit 
} from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/validation';
import { MigrationRunner } from './config/migrate';
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
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false
    }));
    this.app.use(securityHeaders);
    this.app.use(generalRateLimit);
    
    // Serve static files (favicon, etc.)
    this.app.use(express.static('public', {
      setHeaders: (res, path) => {
        if (path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
      }
    }));
    
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
    // Favicon routes
    this.app.get('/favicon.ico', (_req, res) => {
      res.redirect('/favicon.svg');
    });
    this.app.get('/favicon.svg', (_req, res) => {
      res.sendFile('favicon.svg', { root: 'public' }, (err) => {
        if (err) {
          res.status(404).end();
        }
      });
    });

    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Явный роут для /uploads с CORS - гарантирует установку заголовков
    // CORS middleware устанавливает заголовки, но для изображений в <img> тегах
    // браузер не отправляет Origin, поэтому всегда устанавливаем *
    this.app.options('/uploads*', conditionalCorsMiddleware);
    this.app.get('/uploads/:filename', conditionalCorsMiddleware, (req, res) => {
      const filename = req.params['filename'];
      
      // Проверяем наличие filename
      if (!filename) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.status(400).json({ error: 'Filename is required' });
        return;
      }
      
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Проверяем существование файла
      if (!fs.existsSync(filePath)) {
        // Устанавливаем CORS даже для 404 - всегда * для /uploads
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.status(404).json({ error: 'File not found' });
        return;
      }
      
      // Устанавливаем CORS заголовки явно - всегда * для /uploads
      // (middleware уже установил, но на всякий случай дублируем)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      
      // Определяем Content-Type
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
      } else if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.gif') {
        res.setHeader('Content-Type', 'image/gif');
      } else if (ext === '.webp') {
        res.setHeader('Content-Type', 'image/webp');
      }
      
      res.sendFile(filePath, (err) => {
        if (err) {
          logger.error('Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error sending file' });
          }
        }
      });
    });

    const licenseModel = new LicenseModel(this.db);
    const licenseService = new LicenseService(licenseModel);
    const licenseController = new LicenseController(licenseService);

    // Явная обработка OPTIONS для /api/license/verify (публичный эндпоинт)
    this.app.options('/api/license/verify', conditionalCorsMiddleware);
    this.app.use('/api/license', conditionalCorsMiddleware);
    this.app.use('/api/license', createLicenseRoutes(licenseController));

    const feedbackModel = new FeedbackModel(this.db);
    const feedbackService = new FeedbackService(feedbackModel);
    const feedbackController = new FeedbackController(feedbackService);

    this.app.use('/api/feedback', conditionalCorsMiddleware);
    this.app.use('/api/feedback', createFeedbackRoutes(feedbackController));

    const uploadController = new UploadController();
    this.app.use('/api/upload', conditionalCorsMiddleware);
    this.app.use('/api/upload', createUploadRoutes(uploadController));
    
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Block Builder License Server',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          verify: 'POST /api/license/verify',
          create: 'POST /api/license/create',
          stats: 'GET /api/license/stats',
          webhook: 'POST /api/license/webhook',
          feedback: 'POST /api/feedback',
          feedbackList: 'GET /api/feedback',
          feedbackStats: 'GET /api/feedback/stats',
          upload: 'POST /api/upload'
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
      // Для тестирования upload можно временно отключить проверку БД
      if (process.env['SKIP_DB_CHECK'] !== 'true') {
        const isConnected = await this.db.testConnection();
        if (!isConnected) {
          throw new Error('Database connection failed');
        }
        
        logger.info('Database connected successfully');
      } else {
        logger.info('Database check skipped (SKIP_DB_CHECK=true)');
      }

      // Run migrations automatically
      if (process.env['AUTO_MIGRATE'] !== 'false' && process.env['SKIP_DB_CHECK'] !== 'true') {
        try {
          logger.info('Running database migrations...');
          const migrationRunner = new MigrationRunner(this.db);
          await migrationRunner.runMigrations();
          logger.info('Database migrations completed successfully');
          // Don't close DB connection - we'll use it for the server
        } catch (error) {
          logger.error('Migration failed:', error);
          // Don't exit - allow server to start even if migrations fail
          // This allows manual migration fixes
        }
      }

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
