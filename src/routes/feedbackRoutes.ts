import { Router } from 'express';
import { FeedbackController } from '../controllers/FeedbackController';
import { 
  validateRequest
} from '../middleware/validation';
import { 
  createFeedbackSchema,
  updateFeedbackStatusSchema
} from '../middleware/schemas';
import { 
  generalRateLimit 
} from '../middleware/security';

export const createFeedbackRoutes = (feedbackController: FeedbackController): Router => {
  const router = Router();

  router.post(
    '/',
    generalRateLimit,
    validateRequest(createFeedbackSchema),
    (req, res) => feedbackController.createFeedback(req, res)
  );

  router.get(
    '/',
    (req, res) => feedbackController.getAllFeedback(req, res)
  );

  router.get(
    '/stats',
    (req, res) => feedbackController.getFeedbackStats(req, res)
  );

  router.get(
    '/:id',
    (req, res) => feedbackController.getFeedbackById(req, res)
  );

  router.patch(
    '/:id/status',
    validateRequest(updateFeedbackStatusSchema),
    (req, res) => feedbackController.updateFeedbackStatus(req, res)
  );

  return router;
};

