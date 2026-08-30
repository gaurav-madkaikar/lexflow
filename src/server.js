import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createApp } from './app.js';
import { createAlertRunner } from './alerts.js';
import { hashPassword } from './auth.js';
import { loadConfig } from './config.js';
import { createDatabase, ensureCfoUser, seedDemoData } from './db.js';
import { createGmailIntegration } from './gmail.js';
import { createMailSource } from './mail-sources.js';
import { createSyncRunner } from './workflows.js';
import { createVacationRunner, MicrosoftVacationProvider } from './vacation.js';

if (existsSync('.env')) loadEnvFile('.env');

const config = loadConfig(process.env);
if (config.databasePath !== ':memory:') {
  mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
}

const db = createDatabase(config.databasePath);
const userCount = Number(db.prepare('SELECT count(*) AS count FROM users').get().count);
const passwords = config.liveMailConfigured
  ? config.bootstrapPasswords
  : { admin: 'admin123', maya: 'welcome123', priya: 'welcome123', cfo: 'welcome123' };
if (config.liveMailConfigured && Object.values(passwords).some(password => password.length < 8)) {
  db.close();
  throw new Error('Live mail connections require all BOOTSTRAP_*_PASSWORD values (minimum 8 characters).');
}
if (userCount === 0 || config.liveMailConfigured) {
  const [adminPasswordHash, mayaPasswordHash, priyaPasswordHash, cfoPasswordHash] = await Promise.all([
    hashPassword(passwords.admin),
    hashPassword(passwords.maya),
    hashPassword(passwords.priya),
    hashPassword(passwords.cfo)
  ]);
  if (userCount === 0) {
    seedDemoData(db, { adminPasswordHash, mayaPasswordHash, priyaPasswordHash, cfoPasswordHash });
  } else {
    const updatePassword = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    db.exec('BEGIN IMMEDIATE');
    try {
      updatePassword.run(adminPasswordHash, 'admin@lexflow.local');
      updatePassword.run(mayaPasswordHash, 'maya@lexflow.local');
      updatePassword.run(priyaPasswordHash, 'priya@lexflow.local');
      ensureCfoUser(db, { passwordHash: cfoPasswordHash });
      db.prepare('DELETE FROM sessions').run();
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }
} else {
  ensureCfoUser(db, { passwordHash: await hashPassword(passwords.cfo) });
}

const primarySource = createMailSource(config);
const gmailIntegration = createGmailIntegration({ db, gmail: config.gmail });
const outlookConfigured = ['graph', 'mixed'].includes(config.mode);
const sources = () => {
  let gmailSources;
  try {
    gmailSources = gmailIntegration.sources();
  } catch (error) {
    gmailSources = [{
      provider: 'gmail',
      mailboxAddress: gmailIntegration.status().accountEmail,
      cursorKey: 'mail_cursor:gmail',
      async fetchChanges() { throw error; },
    }];
  }
  if (outlookConfigured) return [primarySource, ...gmailSources];
  return config.mode === 'demo' ? [primarySource] : gmailSources;
};
const syncRunner = createSyncRunner({ db, sources });
const alertRunner = createAlertRunner({ db });
const vacationProvider = new MicrosoftVacationProvider(config.graph);
const vacationRunner = createVacationRunner({ db, provider: vacationProvider });
const app = createApp({
  db,
  syncRunner,
  mode: config.mode,
  integrations: {
    outlook: {
      configured: outlookConfigured,
      accountEmail: outlookConfigured ? config.graph.mailbox : null,
      cursorKey: outlookConfigured ? primarySource.cursorKey : null,
    },
    gmail: gmailIntegration,
  },
  vacationRunner,
});
const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`LexFlow listening at http://127.0.0.1:${config.port} (${config.mode} mode)`);
});

let syncTimer;
if (config.syncIntervalSeconds > 0) {
  syncTimer = setInterval(async () => {
    try {
      const result = await syncRunner.run();
      const failures = result.failed ? `, ${result.failed} mailbox failed` : '';
      console.log(`Mail sync complete: ${result.imported} imported, ${result.assigned} assigned${failures}`);
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

function reportVacationError(error) {
  console.error(`Vacation Mode sync failed: ${error.message}`);
}

vacationRunner.run().catch(reportVacationError);
let vacationTimer;
if (config.vacationSyncIntervalSeconds > 0) {
  vacationTimer = setInterval(() => {
    vacationRunner.run().catch(reportVacationError);
  }, config.vacationSyncIntervalSeconds * 1000);
  vacationTimer.unref();
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (syncTimer) clearInterval(syncTimer);
  if (vacationTimer) clearInterval(vacationTimer);
  clearInterval(alertTimer);
  server.close(() => {
    db.close();
  });
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
