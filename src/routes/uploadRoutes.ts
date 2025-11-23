import { Router } from 'express';
import { UploadController, upload } from '../controllers/UploadController';
import { createRateLimit } from '../middleware/security';

export const createUploadRoutes = (uploadController: UploadController): Router => {
  const router = Router();

  // Rate limit для загрузки файлов - более строгий
  const uploadRateLimit = createRateLimit(60000, 20); // 20 запросов в минуту

  router.post(
    '/',
    uploadRateLimit,
    upload.single('file'),
    (req, res) => uploadController.uploadFile(req, res)
  );

  return router;
};

