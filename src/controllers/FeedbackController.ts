import { Request, Response } from 'express';
import { FeedbackService } from '../services/FeedbackService';
import { CreateFeedbackRequest, FeedbackStatus } from '../types';

export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  async createFeedback(req: Request, res: Response): Promise<void> {
    try {
      const feedbackData = req.body as CreateFeedbackRequest;
      
      const feedback = await this.feedbackService.createFeedback(feedbackData);
      
      res.status(201).json({
        success: true,
        feedback: {
          id: feedback.id,
          name: feedback.name,
          email: feedback.email,
          tel: feedback.tel,
          tg: feedback.tg,
          message: feedback.message,
          status: feedback.status,
          createdAt: feedback.createdAt
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  }

  async getAllFeedback(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 100;
      const offset = parseInt(req.query['offset'] as string) || 0;
      const statusParam = req.query['status'] as string | undefined;
      const status = statusParam && ['active', 'in_progress', 'closed'].includes(statusParam) 
        ? statusParam as FeedbackStatus 
        : undefined;
      
      const feedback = await this.feedbackService.getAllFeedback(limit, offset, status);
      res.json(feedback);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getFeedbackById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params['id'];
      
      if (!id) {
        res.status(400).json({ error: 'ID is required' });
        return;
      }
      
      const feedback = await this.feedbackService.getFeedbackById(id);
      
      if (!feedback) {
        res.status(404).json({
          error: 'Feedback request not found'
        });
        return;
      }

      res.json(feedback);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updateFeedbackStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params['id'];
      const { status } = req.body as { status: FeedbackStatus };
      
      if (!id) {
        res.status(400).json({ error: 'ID is required' });
        return;
      }

      if (!status || !['active', 'in_progress', 'closed'].includes(status)) {
        res.status(400).json({ error: 'Valid status is required' });
        return;
      }
      
      await this.feedbackService.updateFeedbackStatus(id, status);
      
      res.json({
        success: true
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({
          error: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  }

  async getFeedbackStats(_req: Request, res: Response): Promise<void> {
    try {
      const total = await this.feedbackService.getFeedbackCount();
      const active = await this.feedbackService.getFeedbackCount(FeedbackStatus.ACTIVE);
      const inProgress = await this.feedbackService.getFeedbackCount(FeedbackStatus.IN_PROGRESS);
      const closed = await this.feedbackService.getFeedbackCount(FeedbackStatus.CLOSED);
      
      res.json({
        total,
        active,
        inProgress,
        closed
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}

