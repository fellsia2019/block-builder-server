import { Database } from './database';
import { dbConfig } from './index';
import fs from 'fs';
import path from 'path';

export class MigrationRunner {
  private db: Database;

  constructor(database?: Database) {
    this.db = database || new Database(dbConfig);
  }

  async runMigrations(): Promise<void> {
    const isConnected = await this.db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    const migrationDir = path.join(__dirname, '..', '..', 'migrations');
    
    if (!fs.existsSync(migrationDir)) {
      throw new Error(`Migration directory not found: ${migrationDir}`);
    }

    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await this.db.query(sql);
        console.log(`✓ Migration ${file} executed successfully`);
      } catch (error: any) {
        // Ignore errors for "already exists" cases, but log others
        if (error.message && error.message.includes('already exists')) {
          console.log(`⚠ Migration ${file} already applied`);
        } else {
          throw new Error(`Migration ${file} failed: ${error.message}`);
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

if (require.main === module) {
  const runner = new MigrationRunner();
  runner.runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
