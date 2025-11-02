import { Request, Response } from 'express';
import { LicenseService } from '../services/LicenseService';
import { CreateLicenseRequest, VerifyLicenseRequest, WebhookPayload } from '../types';
import { extractDomainFromRequest } from '../utils/domainExtractor';

export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  async verifyLicense(req: Request, res: Response): Promise<void> {
    try {
      const { key, domain: domainFromBody } = req.body as { key?: string; domain?: string };
      
      if (!key) {
        res.status(400).json({
          valid: false,
          type: 'FREE',
          error: 'License key is required'
        });
        return;
      }

      // Сначала используем домен из body, если он указан, иначе извлекаем из заголовков
      const domain = domainFromBody || extractDomainFromRequest(req);
      
      if (!domain) {
        res.status(400).json({
          valid: false,
          type: 'FREE',
          error: 'Unable to determine domain from request headers. Please ensure Host, Origin, or Referer header is present.'
        });
        return;
      }

      const request: VerifyLicenseRequest = { key, domain };
      const result = await this.licenseService.verifyLicense(request);
      
      if (!result.valid) {
        res.status(400).json({
          valid: false,
          type: result.type,
          error: result.error || 'License verification failed'
        });
        return;
      }
      
      res.json({
        valid: result.valid,
        type: result.type
      });
    } catch (error) {
      res.status(500).json({
        valid: false,
        type: 'FREE',
        error: 'Internal server error'
      });
    }
  }

  async createLicense(req: Request, res: Response): Promise<void> {
    try {
      const licenseData = req.body as CreateLicenseRequest;
      
      if (!licenseData.email || !licenseData.domain) {
        res.status(400).json({
          error: 'Email and domain are required'
        });
        return;
      }

      const license = await this.licenseService.createLicense(licenseData);
      
      res.status(201).json({
        success: true,
        license: {
          key: license.key,
          type: license.type,
          email: license.email,
          domain: license.domain,
          expiresAt: license.expiresAt
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

  async getLicenseStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.licenseService.getLicenseStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getAllLicenses(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 100;
      const offset = parseInt(req.query['offset'] as string) || 0;
      const searchParam = req.query['search'] as string | undefined;
      const search = searchParam && searchParam.trim().length > 0 ? searchParam.trim() : undefined;
      
      const licenses = await this.licenseService.getAllLicenses(limit, offset, search);
      res.json(licenses);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getLicenseByKey(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params['key'];
      
      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }
      
      const license = await this.licenseService.getLicenseByKey(key);
      
      if (!license) {
        res.status(404).json({
          error: 'License not found'
        });
        return;
      }

      res.json({
        key: license.key,
        type: license.type,
        email: license.email,
        domain: license.domain,
        status: license.status,
        expiresAt: license.expiresAt,
        usageCount: license.usageCount,
        lastUsed: license.lastUsed,
        metadata: license.metadata
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deactivateLicense(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params['key'];
      
      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }
      
      await this.licenseService.deactivateLicense(key);
      
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

  async activateLicense(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params['key'];
      
      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }
      
      await this.licenseService.activateLicense(key);
      
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

  async updateLicense(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params['key'];
      const updates = req.body as { email?: string; domain?: string };
      
      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }

      await this.licenseService.updateLicense(key, updates);
      
      res.json({
        success: true
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

  async deleteLicense(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params['key'];
      
      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }
      
      await this.licenseService.deleteLicense(key);
      
      res.json({
        success: true
      });
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          error: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  }

  async processWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WebhookPayload;
      
      if (!payload.email) {
        res.status(400).json({
          error: 'Email is required'
        });
        return;
      }

      const license = await this.licenseService.processWebhook(payload);
      
      res.json({
        success: true,
        licenseKey: license.key
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
}
