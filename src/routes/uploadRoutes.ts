import { Router, Request, Response, NextFunction } from 'express';
import { UploadController, upload } from '../controllers/UploadController';
import { createRateLimit } from '../middleware/security';
import multer from 'multer';
import logger from '../utils/logger';

export const createUploadRoutes = (uploadController: UploadController): Router => {
  const router = Router();

  // Rate limit для загрузки файлов - более строгий
  const uploadRateLimit = createRateLimit(60000, 20); // 20 запросов в минуту

  // Обработчик ошибок multer
  const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large. Maximum size is 10MB.'
        });
      }
      logger.error('Multer error:', err);
      return res.status(400).json({
        error: err.message || 'File upload error'
      });
    }
    if (err) {
      logger.error('Upload error:', err);
      return res.status(400).json({
        error: err.message || 'File upload error'
      });
    }
    next();
  };

  router.post(
    '/',
    uploadRateLimit,
    upload.single('file'),
    handleMulterError,
    async (req, res, next) => {
      try {
        await uploadController.uploadFile(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};

