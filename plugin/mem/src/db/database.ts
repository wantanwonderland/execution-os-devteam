import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_DIR = join(process.env.HOME || '~', '.wantan-mem');
const DEFAULT_DB_PATH = join(DEFAULT_DB_DIR, 'wantan-mem.db');

export function createDatabase(dbPath?: string): Database.Database {
  const path = dbPath || DEFAULT_DB_PATH;
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(path);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -10000'); // 10MB cache
  db.pragma('mmap_size = 268435456'); // 256MB mmap

  return db;
}

export function runMigrations(db: Database.Database): void {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Use exec to run the full schema at once — it handles multi-statement blocks (triggers, etc.)
  db.exec(schema);
}

export function closeDatabase(db: Database.Database): void {
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
}
