import { LicenseService } from '@/services/LicenseService';
import { LicenseModel } from '@/models/LicenseModel';
import { Database } from '@/config/database';
import { LicenseType, CreateLicenseRequest } from '@/types';

// Mock database for testing
class MockDatabase {
  private data: Map<string, any> = new Map();

  async query(text: string, params?: any[]): Promise<any> {
    // Simple mock implementation
    if (text.includes('INSERT INTO licenses')) {
      const id = params[0];
      const key = params[1];
      this.data.set(key, {
        id,
        key,
        type: params[2],
        email: params[3],
        domain: params[4],
        status: params[5],
        purchased_at: params[6],
        expires_at: params[7],
        usage_count: params[8],
        last_used: params[9],
        source: params[10],
        metadata: params[11],
        created_at: new Date(),
        updated_at: new Date()
      });
      return { rows: [this.data.get(key)] };
    }
    
    if (text.includes('SELECT * FROM licenses WHERE key =')) {
      const key = params[0];
      const license = this.data.get(key);
      return { rows: license ? [license] : [] };
    }
    
    return { rows: [] };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    // Mock implementation
  }
}

describe('LicenseService', () => {
  let licenseService: LicenseService;
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = new MockDatabase();
    const licenseModel = new LicenseModel(mockDb as any);
    licenseService = new LicenseService(licenseModel);
  });

  describe('createLicense', () => {
    it('should create a license with valid data', async () => {
      const request: CreateLicenseRequest = {
        email: 'test@example.com',
        type: LicenseType.PRO,
        domain: 'example.com'
      };

      const license = await licenseService.createLicense(request);

      expect(license).toBeDefined();
      expect(license.email).toBe('test@example.com');
      expect(license.type).toBe(LicenseType.PRO);
      expect(license.domain).toBe('example.com');
      expect(license.key).toMatch(/^BB-PRO-/);
    });

    it('should throw error for invalid email', async () => {
      const request: CreateLicenseRequest = {
        email: 'invalid-email',
        type: LicenseType.PRO,
        domain: 'example.com'
      };

      await expect(licenseService.createLicense(request))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for invalid domain', async () => {
      const request: CreateLicenseRequest = {
        email: 'test@example.com',
        type: LicenseType.PRO,
        domain: ''
      };

      await expect(licenseService.createLicense(request))
        .rejects.toThrow('Invalid domain format');
    });
  });

  describe('verifyLicense', () => {
    it('should return valid response for existing license', async () => {
      // First create a license
      const createRequest: CreateLicenseRequest = {
        email: 'test@example.com',
        type: LicenseType.PRO,
        domain: 'example.com'
      };
      
      const license = await licenseService.createLicense(createRequest);

      // Then verify it
      const verifyResponse = await licenseService.verifyLicense({
        key: license.key,
        domain: 'example.com'
      });

      expect(verifyResponse.valid).toBe(true);
      expect(verifyResponse.type).toBe(LicenseType.PRO);
    });

    it('should return invalid response for non-existing license', async () => {
      const verifyResponse = await licenseService.verifyLicense({
        key: 'BB-PRO-NONEXISTENT-KEY'
      });

      expect(verifyResponse.valid).toBe(false);
      expect(verifyResponse.error).toBe('Invalid license key');
    });
  });
});
