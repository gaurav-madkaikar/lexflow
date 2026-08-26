import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';
import { resetLocalCredentials } from './local-accounts.js';

if (existsSync('.env')) loadEnvFile('.env');

const config = loadConfig(process.env);
if (config.databasePath !== ':memory:') {
  mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
}

const db = createDatabase(config.databasePath);
try {
  const result = await resetLocalCredentials(db);
  console.log(
    `Reset ${result.updatedAccounts} local account credentials and invalidated `
      + `${result.invalidatedSessions} active sessions.`,
  );
} finally {
  db.close();
}
