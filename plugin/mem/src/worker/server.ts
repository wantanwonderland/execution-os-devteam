import express from 'express';
import { createDatabase, runMigrations, closeDatabase } from '../db/database.js';
import { createRoutes } from './routes.js';

const PORT = parseInt(process.env.WANTAN_MEM_PORT || '37778');

const db = createDatabase();
runMigrations(db);

const app = express();
app.use(express.json());
app.use(createRoutes(db));

const server = app.listen(PORT, () => {
  console.log(`wantan-mem worker listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('wantan-mem shutting down...');
  server.close(() => {
    closeDatabase(db);
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
