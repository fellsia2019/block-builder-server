import { Database } from './database';
import { dbConfig } from './index';
import fs from 'fs';
import path from 'path';

export class MigrationRunner {
  private db: Database;

  constructor() {
    this.db = new Database(dbConfig);
  }

  async runMigrations(): Promise<void> {
    try {
      const isConnected = await this.db.testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      const migrationDir = path.join(__dirname, '..', '..', 'migrations');
      const migrationFiles = fs.readdirSync(migrationDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const migrationPath = path.join(migrationDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        await this.db.query(sql);
      }
    } catch (error) {
      throw error;
    } finally {
      await this.db.close();
    }
  }
}

if (require.main === module) {
  const runner = new MigrationRunner();
  runner.runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}
