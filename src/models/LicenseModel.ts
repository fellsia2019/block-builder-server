import { Database } from '../config/database';
import { 
  License, 
  LicenseType, 
  LicenseStatus, 
  LicenseSource, 
  CreateLicenseRequest,
  VerifyLicenseRequest,
  VerifyLicenseResponse,
  LicenseStats
} from '../types';

export class LicenseModel {
  constructor(private db: Database) {}

  async create(licenseData: CreateLicenseRequest): Promise<License> {
    const id = this.generateId();
    const key = licenseData.customKey || this.generateLicenseKey(licenseData.type);
    
    const query = `
      INSERT INTO licenses (
        id, key, type, email, domain, status, purchased_at, expires_at, 
        usage_count, last_used, source, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      id,
      key,
      licenseData.type,
      licenseData.email,
      licenseData.domain,
      LicenseStatus.ACTIVE,
      new Date(),
      licenseData.expiresAt || null,
      0,
      null,
      LicenseSource.MANUAL,
      licenseData.metadata || {}
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToLicense(result.rows[0]);
  }

  async findByKey(key: string): Promise<License | null> {
    const query = 'SELECT * FROM licenses WHERE key = $1';
    const result = await this.db.query(query, [key]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToLicense(result.rows[0]);
  }

  async verify(request: VerifyLicenseRequest): Promise<VerifyLicenseResponse> {
    const license = await this.findByKey(request.key);
    
    if (!license) {
      return {
        valid: false,
        type: LicenseType.FREE,
        error: 'Invalid license key'
      };
    }

    if (license.status !== LicenseStatus.ACTIVE) {
      return {
        valid: false,
        type: LicenseType.FREE,
        error: 'License is not active'
      };
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return {
        valid: false,
        type: LicenseType.FREE,
        error: 'License expired'
      };
    }

    const licenseDomain = this.normalizeDomainForComparison(license.domain);
    const requestDomain = this.normalizeDomainForComparison(request.domain);
    
    if (licenseDomain !== requestDomain) {
      return {
        valid: false,
        type: LicenseType.FREE,
        error: `Domain mismatch: license domain="${licenseDomain}", request domain="${requestDomain}"`
      };
    }

    await this.updateUsage(license.id);

    const metadata: any = {
      email: license.email,
      domain: license.domain,
      purchasedAt: license.purchasedAt.toISOString()
    };
    
    if (license.expiresAt) {
      metadata.expiresAt = license.expiresAt.toISOString();
    }
    
    return {
      valid: true,
      type: license.type,
      metadata
    };
  }

  async updateUsage(licenseId: string): Promise<void> {
    const query = `
      UPDATE licenses 
      SET usage_count = usage_count + 1, 
          last_used = NOW(), 
          updated_at = NOW()
      WHERE id = $1
    `;
    
    await this.db.query(query, [licenseId]);
  }

  async updateStatus(licenseId: string, status: LicenseStatus): Promise<void> {
    const query = `
      UPDATE licenses 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await this.db.query(query, [status, licenseId]);
  }

  async updateLicenseData(licenseId: string, updates: { email?: string; domain?: string }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }
    
    if (updates.domain !== undefined) {
      fields.push(`domain = $${paramCount}`);
      values.push(updates.domain);
      paramCount++;
    }
    
    if (fields.length === 0) {
      return;
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(licenseId);
    
    const query = `
      UPDATE licenses 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `;
    
    await this.db.query(query, values);
  }

  async getStats(): Promise<LicenseStats> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN last_used IS NOT NULL THEN 1 END) as used,
        COUNT(CASE WHEN type = 'FREE' THEN 1 END) as free_count,
        COUNT(CASE WHEN type = 'PRO' THEN 1 END) as pro_count,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_count,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count
      FROM licenses
    `;

    const result = await this.db.query(query);
    const row = result.rows[0];

    return {
      total: parseInt(row.total),
      active: parseInt(row.active),
      used: parseInt(row.used),
      byType: {
        [LicenseType.FREE]: parseInt(row.free_count),
        [LicenseType.PRO]: parseInt(row.pro_count)
      },
      byStatus: {
        [LicenseStatus.ACTIVE]: parseInt(row.active),
        [LicenseStatus.INACTIVE]: parseInt(row.inactive_count),
        [LicenseStatus.SUSPENDED]: parseInt(row.suspended_count),
        [LicenseStatus.EXPIRED]: parseInt(row.expired_count)
      }
    };
  }

  async findAll(limit = 100, offset = 0, search?: string): Promise<License[]> {
    const trimmedSearch = search?.trim();
    const hasSearch = trimmedSearch && trimmedSearch.length > 0;
    
    let query = `
      SELECT * FROM licenses 
    `;
    const params: any[] = [];
    
    if (hasSearch) {
      query += ` WHERE (
        key ILIKE $1 OR 
        email ILIKE $1 OR 
        domain ILIKE $1
      )`;
      params.push(`%${trimmedSearch}%`);
    }
    
    query += ` ORDER BY created_at DESC `;
    
    if (hasSearch) {
      query += ` LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      query += ` LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }
    
    const result = await this.db.query(query, params);
    return result.rows.map((row: any) => this.mapRowToLicense(row));
  }

  async findByEmail(email: string): Promise<License[]> {
    const query = 'SELECT * FROM licenses WHERE email = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [email]);
    return result.rows.map((row: any) => this.mapRowToLicense(row));
  }

  async findByDomain(domain: string): Promise<License[]> {
    const query = 'SELECT * FROM licenses WHERE domain = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [domain]);
    return result.rows.map((row: any) => this.mapRowToLicense(row));
  }

  async delete(licenseId: string): Promise<void> {
    const query = 'DELETE FROM licenses WHERE id = $1';
    await this.db.query(query, [licenseId]);
  }

  private generateId(): string {
    return `lic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLicenseKey(type: LicenseType): string {
    const prefix = 'BB';
    const typeCode = type.toUpperCase();
    const randomPart1 = Math.random().toString(36).substr(2, 4).toUpperCase();
    const randomPart2 = Math.random().toString(36).substr(2, 4).toUpperCase();
    const randomPart3 = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `${prefix}-${typeCode}-${randomPart1}-${randomPart2}-${randomPart3}`;
  }

  private normalizeDomainForComparison(domain: string): string {
    if (!domain) return domain;
    
    let normalized = domain.trim().toLowerCase();
    
    if (normalized.includes('://')) {
      try {
        const url = new URL(normalized);
        normalized = url.hostname;
      } catch {
        const protocolIndex = normalized.indexOf('://');
        if (protocolIndex !== -1) {
          normalized = normalized.substring(protocolIndex + 3);
          const pathIndex = normalized.indexOf('/');
          if (pathIndex !== -1) {
            normalized = normalized.substring(0, pathIndex);
          }
        }
      }
    }
    
    const colonIndex = normalized.indexOf(':');
    if (colonIndex !== -1) {
      normalized = normalized.substring(0, colonIndex);
    }
    
    if (normalized.startsWith('www.')) {
      normalized = normalized.substring(4);
    }
    
    const localhostVariants = ['localhost', '127.0.0.1', '::1', 'api.blockbuilder'];
    if (localhostVariants.includes(normalized)) {
      return 'localhost';
    }
    
    return normalized.trim();
  }

  private mapRowToLicense(row: any): License {
    const license: any = {
      id: row.id,
      key: row.key,
      type: row.type as LicenseType,
      email: row.email,
      domain: row.domain,
      status: row.status as LicenseStatus,
      purchasedAt: new Date(row.purchased_at),
      usageCount: row.usage_count,
      source: row.source as LicenseSource,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
    
    if (row.expires_at) {
      license.expiresAt = new Date(row.expires_at);
    }
    
    if (row.last_used) {
      license.lastUsed = new Date(row.last_used);
    }
    
    if (row.metadata) {
      license.metadata = row.metadata;
    } else {
      license.metadata = {};
    }
    
    return license;
  }
}
