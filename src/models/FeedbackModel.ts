import { Database } from '../config/database';
import { 
  FeedbackRequest,
  FeedbackStatus,
  CreateFeedbackRequest
} from '../types';

export class FeedbackModel {
  constructor(private db: Database) {}

  async create(feedbackData: CreateFeedbackRequest): Promise<FeedbackRequest> {
    const id = this.generateId();
    
    const query = `
      INSERT INTO feedback_requests (
        id, name, email, tel, tg, message, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      id,
      feedbackData.name,
      feedbackData.email || null,
      feedbackData.tel || null,
      feedbackData.tg || null,
      feedbackData.message,
      FeedbackStatus.ACTIVE
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToFeedbackRequest(result.rows[0]);
  }

  async findById(id: string): Promise<FeedbackRequest | null> {
    const query = 'SELECT * FROM feedback_requests WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToFeedbackRequest(result.rows[0]);
  }

  async findAll(limit = 100, offset = 0, status?: FeedbackStatus): Promise<FeedbackRequest[]> {
    let query = 'SELECT * FROM feedback_requests';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` WHERE status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC`;
    
    if (status) {
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);
    } else {
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);
    }
    
    const result = await this.db.query(query, params);
    return result.rows.map((row: any) => this.mapRowToFeedbackRequest(row));
  }

  async updateStatus(id: string, status: FeedbackStatus): Promise<void> {
    const query = `
      UPDATE feedback_requests 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await this.db.query(query, [status, id]);
  }

  async count(status?: FeedbackStatus): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM feedback_requests';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  private generateId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapRowToFeedbackRequest(row: any): FeedbackRequest {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      tel: row.tel,
      tg: row.tg,
      message: row.message,
      status: row.status as FeedbackStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

