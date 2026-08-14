import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createApp } from './app.js';
import { createAlertRunner } from './alerts.js';
import { hashPassword } from './auth.js';
import { loadConfig } from './config.js';
import { createDatabase, seedDemoData } from './db.js';
import { createMailSource } from './mail-sources.js';
import { createSyncRunner } from './workflows.js';

if (existsSync('.env')) loadEnvFile('.env');

const config = loadConfig(process.env);
if (config.databasePath !== ':memory:') {
  mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
}

const db = createDatabase(config.databasePath);
const userCount = Number(db.prepare('SELECT count(*) AS count FROM users').get().count);
const passwords = config.mode === 'graph'
  ? config.bootstrapPasswords
  : { admin: 'admin123', maya: 'welcome123', priya: 'welcome123' };
if (config.mode === 'graph' && Object.values(passwords).some(password => password.length < 8)) {
  db.close();
  throw new Error('Graph mode requires all BOOTSTRAP_*_PASSWORD values (minimum 8 characters).');
}
if (userCount === 0 || config.mode === 'graph') {
  const [adminPasswordHash, mayaPasswordHash, priyaPasswordHash] = await Promise.all([
    hashPassword(passwords.admin),
    hashPassword(passwords.maya),
    hashPassword(passwords.priya)
  ]);
  if (userCount === 0) {
    seedDemoData(db, { adminPasswordHash, mayaPasswordHash, priyaPasswordHash });
  } else {
    const updatePassword = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    db.exec('BEGIN IMMEDIATE');
    try {
      updatePassword.run(adminPasswordHash, 'admin@lexflow.local');
      updatePassword.run(mayaPasswordHash, 'maya@lexflow.local');
      updatePassword.run(priyaPasswordHash, 'priya@lexflow.local');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }
}

const source = createMailSource(config);
const syncRunner = createSyncRunner({ db, source });
const alertRunner = createAlertRunner({ db });
const app = createApp({ db, syncRunner, mode: config.mode });
const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`LexFlow listening at http://127.0.0.1:${config.port} (${config.mode} mode)`);
});

let syncTimer;
if (config.syncIntervalSeconds > 0) {
  syncTimer = setInterval(async () => {
    try {
      const result = await syncRunner.run();
      console.log(`Mail sync complete: ${result.imported} imported, ${result.assigned} assigned`);
    } catch (error) {
      console.error(`Mail sync failed: ${error.message}`);
    }
  }, config.syncIntervalSeconds * 1000);
  syncTimer.unref();
}

function reportAlertError(error) {
  console.error(`Overdue alert sweep failed: ${error.message}`);
}

alertRunner.run().catch(reportAlertError);
const alertTimer = setInterval(() => {
  alertRunner.run().catch(reportAlertError);
}, 60_000);
alertTimer.unref();

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (syncTimer) clearInterval(syncTimer);
  clearInterval(alertTimer);
  server.close(() => {
    db.close();
  });
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
