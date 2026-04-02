import { createDatabase, runMigrations, closeDatabase } from '../src/db/database.js';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export function createTestDb(): { db: Database.Database; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'wantan-mem-test-'));
  const dbPath = join(dir, 'test.db');
  const db = createDatabase(dbPath);
  runMigrations(db);

  return {
    db,
    cleanup: () => {
      closeDatabase(db);
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
