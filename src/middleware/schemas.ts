import Joi from 'joi';
import { LicenseType } from '../types';

export const verifyLicenseSchema = Joi.object({
  key: Joi.string().required().min(10).max(50)
});

export const createLicenseSchema = Joi.object({
  email: Joi.string().email().required(),
  type: Joi.string().valid(...Object.values(LicenseType)).required(),
  domain: Joi.string().required().min(1).max(255),
  customKey: Joi.string().optional().min(10).max(50),
  expiresAt: Joi.date().optional().greater('now'),
  metadata: Joi.object().optional()
});

export const webhookSchema = Joi.object({
  email: Joi.string().email().required(),
  domain: Joi.string().optional().min(1).max(255),
  type: Joi.string().valid(...Object.values(LicenseType)).optional(),
  saleId: Joi.string().optional(),
  metadata: Joi.object().optional()
});

export const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  search: Joi.string().optional().allow('').max(255)
});

export const licenseKeySchema = Joi.object({
  key: Joi.string().required().min(10).max(50)
});

export const updateLicenseSchema = Joi.object({
  email: Joi.string().email().optional(),
  domain: Joi.string().optional().min(1).max(255)
});

export const createFeedbackSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  email: Joi.string().email().optional().allow(null, ''),
  tel: Joi.string().optional().allow(null, '').max(50),
  tg: Joi.string().optional().allow(null, '').max(100),
  message: Joi.string().required().min(1).max(5000)
}).custom((value, helpers) => {
  // Валидация: email или tg должен быть заполнен (не пустая строка)
  const hasEmail = value.email && value.email.trim().length > 0;
  const hasTg = value.tg && value.tg.trim().length > 0;
  
  if (!hasEmail && !hasTg) {
    return helpers.error('any.custom', {
      message: 'Email или Telegram обязателен для заполнения'
    });
  }
  return value;
});

export const updateFeedbackStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'in_progress', 'closed').required()
});