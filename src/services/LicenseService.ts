import { LicenseModel } from '../models/LicenseModel';
import { 
  CreateLicenseRequest, 
  VerifyLicenseRequest, 
  VerifyLicenseResponse,
  LicenseStats,
  License,
  LicenseType,
  LicenseStatus,
  WebhookPayload
} from '../types';

export class LicenseService {
  constructor(private licenseModel: LicenseModel) {}

  async createLicense(request: CreateLicenseRequest): Promise<License> {
    if (!this.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    const normalizedDomain = this.normalizeDomainInput(request.domain);
    
    if (!this.isValidDomain(normalizedDomain)) {
      throw new Error('Invalid domain format');
    }

    const existingLicenses = await this.licenseModel.findByDomain(normalizedDomain);
    if (existingLicenses.length > 0) {
      throw new Error('License already exists for this domain');
    }

    return await this.licenseModel.create({
      ...request,
      domain: normalizedDomain
    });
  }

  async verifyLicense(request: VerifyLicenseRequest): Promise<VerifyLicenseResponse> {
    return await this.licenseModel.verify(request);
  }

  async getLicenseByKey(key: string): Promise<License | null> {
    return await this.licenseModel.findByKey(key);
  }

  async getLicenseStats(): Promise<LicenseStats> {
    return await this.licenseModel.getStats();
  }

  async getAllLicenses(limit = 100, offset = 0, search?: string): Promise<License[]> {
    // Нормализуем search - убираем пустые строки
    const normalizedSearch = search && search.trim().length > 0 ? search.trim() : undefined;
    return await this.licenseModel.findAll(limit, offset, normalizedSearch);
  }

  async getLicensesByEmail(email: string): Promise<License[]> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    return await this.licenseModel.findByEmail(email);
  }

  async getLicensesByDomain(domain: string): Promise<License[]> {
    const normalizedDomain = this.normalizeDomainInput(domain);
    if (!this.isValidDomain(normalizedDomain)) {
      throw new Error('Invalid domain format');
    }
    
    return await this.licenseModel.findByDomain(normalizedDomain);
  }

  async deactivateLicense(licenseId: string): Promise<void> {
    const license = await this.licenseModel.findByKey(licenseId);
    if (!license) {
      throw new Error('License not found');
    }
    
    await this.licenseModel.updateStatus(license.id, LicenseStatus.INACTIVE);
  }

  async activateLicense(licenseId: string): Promise<void> {
    const license = await this.licenseModel.findByKey(licenseId);
    if (!license) {
      throw new Error('License not found');
    }
    
    await this.licenseModel.updateStatus(license.id, LicenseStatus.ACTIVE);
  }

  async updateLicense(licenseId: string, updates: { email?: string; domain?: string }): Promise<void> {
    const license = await this.licenseModel.findByKey(licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new Error('Invalid email format');
    }

    if (updates.domain) {
      const normalizedDomain = this.normalizeDomainInput(updates.domain);
      if (!this.isValidDomain(normalizedDomain)) {
        throw new Error('Invalid domain format');
      }
      updates.domain = normalizedDomain;
    }
    
    await this.licenseModel.updateLicenseData(license.id, updates);
  }

  async deleteLicense(licenseId: string): Promise<void> {
    const license = await this.licenseModel.findByKey(licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    if (license.status === LicenseStatus.ACTIVE) {
      throw new Error('Cannot delete active license. Please deactivate it first.');
    }
    
    await this.licenseModel.delete(license.id);
  }

  async processWebhook(payload: WebhookPayload): Promise<License> {
    const request: CreateLicenseRequest = {
      email: payload.email,
      type: payload.type || LicenseType.PRO,
      domain: payload.domain || 'localhost',
      metadata: {
        ...payload.metadata,
        source: 'webhook',
        saleId: payload.saleId
      }
    };

    return await this.createLicense(request);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private normalizeDomainInput(input: string): string {
    let domain = input.trim();
    
    try {
      if (domain.includes('://')) {
        const url = new URL(domain);
        domain = url.hostname;
      } else if (domain.includes('/')) {
        const url = new URL(`http://${domain}`);
        domain = url.hostname;
      } else {
        const colonIndex = domain.indexOf(':');
        if (colonIndex !== -1) {
          domain = domain.substring(0, colonIndex);
        }
      }
    } catch {
      const colonIndex = domain.indexOf(':');
      if (colonIndex !== -1) {
        domain = domain.substring(0, colonIndex);
      }
    }
    
    domain = domain.toLowerCase();
    
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    return domain;
  }

  private isValidDomain(domain: string): boolean {
    if (domain === 'localhost' || domain === '127.0.0.1' || domain === '::1') {
      return true;
    }
    
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }
}
