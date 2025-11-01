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