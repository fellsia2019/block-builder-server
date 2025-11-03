import { FeedbackModel } from '../models/FeedbackModel';
import { 
  CreateFeedbackRequest,
  FeedbackRequest,
  FeedbackStatus
} from '../types';

export class FeedbackService {
  constructor(private feedbackModel: FeedbackModel) {}

  async createFeedback(request: CreateFeedbackRequest): Promise<FeedbackRequest> {
    // Валидация: email или tg должен быть заполнен
    if (!request.email && !request.tg) {
      throw new Error('Email или Telegram обязателен для заполнения');
    }

    return await this.feedbackModel.create(request);
  }

  async getFeedbackById(id: string): Promise<FeedbackRequest | null> {
    return await this.feedbackModel.findById(id);
  }

  async getAllFeedback(limit = 100, offset = 0, status?: FeedbackStatus): Promise<FeedbackRequest[]> {
    return await this.feedbackModel.findAll(limit, offset, status);
  }

  async updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
    const feedback = await this.feedbackModel.findById(id);
    if (!feedback) {
      throw new Error('Feedback request not found');
    }
    
    await this.feedbackModel.updateStatus(id, status);
  }

  async getFeedbackCount(status?: FeedbackStatus): Promise<number> {
    return await this.feedbackModel.count(status);
  }
}

