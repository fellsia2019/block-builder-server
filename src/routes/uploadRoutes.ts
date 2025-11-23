import { Router, Request, Response, NextFunction } from 'express';
import { UploadController, upload } from '../controllers/UploadController';
import { createRateLimit } from '../middleware/security';
import multer from 'multer';
import logger from '../utils/logger';

export const createUploadRoutes = (uploadController: UploadController): Router => {
  const router = Router();

  // Rate limit для загрузки файлов - более строгий
  const uploadRateLimit = createRateLimit(60000, 20); // 20 запросов в минуту

  // Явная обработка OPTIONS запросов (preflight) - CORS middleware должен обработать это,
  // но на всякий случай добавляем здесь тоже
  router.options('/', (_req: Request, res: Response): void => {
    res.sendStatus(200);
  });

  // Обработчик ошибок multer (должен быть middleware с 4 параметрами)
  const handleMulterError = (err: any, _req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: 'File too large. Maximum size is 10MB.'
        });
        return;
      }
      logger.error('Multer error:', err);
      res.status(400).json({
        error: err.message || 'File upload error',
        code: err.code
      });
      return;
    }
    if (err) {
      logger.error('Upload error:', err);
      res.status(400).json({
        error: err.message || 'File upload error'
      });
      return;
    }
    next();
  };

  router.post(
    '/',
    uploadRateLimit,
    upload.single('file'),
    handleMulterError,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await uploadController.uploadFile(req, res);
      } catch (error) {
        logger.error('Upload controller error:', error);
        next(error);
      }
    }
  );

  return router;
};

