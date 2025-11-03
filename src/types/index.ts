export interface License {
  id: string;
  key: string;
  type: LicenseType;
  email: string;
  domain: string;
  status: LicenseStatus;
  purchasedAt: Date;
  expiresAt?: Date;
  usageCount: number;
  lastUsed?: Date;
  source: LicenseSource;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum LicenseType {
  FREE = 'FREE',
  PRO = 'PRO'
}

export enum LicenseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired'
}

export enum LicenseSource {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  API = 'api'
}

export interface CreateLicenseRequest {
  email: string;
  type: LicenseType;
  domain: string;
  customKey?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface VerifyLicenseRequest {
  key: string;
  domain: string; // Домен извлекается из заголовков запроса, не из body
}

export interface VerifyLicenseResponse {
  valid: boolean;
  type: LicenseType;
  metadata?: {
    email: string;
    domain: string;
    purchasedAt: string;
    expiresAt?: string;
  };
  error?: string;
}

export interface LicenseStats {
  total: number;
  active: number;
  used: number;
  byType: Record<LicenseType, number>;
  byStatus: Record<LicenseStatus, number>;
}

export interface WebhookPayload {
  email: string;
  domain?: string;
  type?: LicenseType;
  saleId?: string;
  metadata?: Record<string, any>;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  licenseKeyPrefix: string;
  licenseKeyLength: number;
  bcryptRounds: number;
  corsAllowedOrigins: string[];
  logLevel: string;
  logFile: string;
}

export enum FeedbackStatus {
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed'
}

export interface FeedbackRequest {
  id: string;
  name: string;
  email: string | null;
  tel: string | null;
  tg: string | null;
  message: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeedbackRequest {
  name: string;
  email?: string;
  tel?: string;
  tg?: string;
  message: string;
}

export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus;
}