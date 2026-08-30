import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createApp } from './app.js';
import { createAlertRunner } from './alerts.js';
import { loadConfig } from './config.js';
import { assertNoLocalAccounts, createDatabase } from './db.js';
import { createGmailIntegration } from './gmail.js';
import { createOutlookIntegration } from './outlook.js';
import { createSyncRunner } from './workflows.js';

if (existsSync('.env')) loadEnvFile('.env');

const config = loadConfig(process.env);
if (config.databasePath !== ':memory:') {
  mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
}

const db = createDatabase(config.databasePath);
assertNoLocalAccounts(db);
if (!config.entra.configured) {
  db.close();
  throw new Error('ENTRA_CLIENT_ID and ENTRA_CLIENT_SECRET are required; local account login is disabled.');
}

const gmailIntegration = createGmailIntegration({ db, gmail: config.gmail });
const outlookIntegration = createOutlookIntegration({ db, config: config.outlook });
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
  return [...outlookIntegration.sources(), ...gmailSources];
};
const syncRunner = createSyncRunner({ db, sources });
const alertRunner = createAlertRunner({
  db,
  organizationIds: () => db.prepare("SELECT id FROM organizations WHERE status = 'active'").all().map(row => Number(row.id)),
});
const app = createApp({
  db,
  syncRunner,
  mode: config.mode,
  integrations: {
    outlook: outlookIntegration,
    gmail: gmailIntegration,
  },
  entraConfig: config.entra,
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
