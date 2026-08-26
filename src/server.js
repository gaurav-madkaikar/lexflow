import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createApp } from './app.js';
import { createAlertRunner } from './alerts.js';
import { loadConfig } from './config.js';
import { createConversationHistoryService } from './conversation-history.js';
import {
  secureDatabaseStorage,
  useRestrictiveFileCreationMask,
} from './database-backup.js';
import { createDatabase } from './db.js';
import { createDeliveryRunner } from './deliveries.js';
import { createGmailIntegration } from './gmail.js';
import {
  assertDemoRuntimeAllowed,
  seedLocalAccountsIfEmpty,
} from './local-accounts.js';
import { createMailSource } from './mail-sources.js';
import { resolveMailboxConnection } from './mailbox-connections.js';
import { createOutlookIntegration } from './outlook.js';
import {
  createSyncRunner,
  resolveCurrentDeliveryContext,
} from './workflows.js';

useRestrictiveFileCreationMask();
if (existsSync('.env')) loadEnvFile('.env');

const config = loadConfig(process.env);
const runtime = { nodeEnv: process.env.NODE_ENV, mode: config.mode };
assertDemoRuntimeAllowed(runtime);
secureDatabaseStorage(config.databasePath);

const db = createDatabase(config.databasePath);
try {
  secureDatabaseStorage(config.databasePath);
  await seedLocalAccountsIfEmpty(db, runtime);
} catch (error) {
  db.close();
  throw error;
}

const gmailIntegration = createGmailIntegration({ db, gmail: config.gmail });
const outlookIntegration = createOutlookIntegration({
  db,
  outlook: config.outlook,
  graph: config.graph,
});
const integrations = {
  gmail: gmailIntegration,
  outlook: outlookIntegration,
};
const demoSource = config.mode === 'demo' ? createMailSource(config) : null;
if (demoSource) demoSource.organizationId = 1;

function organizationIds() {
  return db.prepare('SELECT id FROM organizations ORDER BY id')
    .all()
    .map(row => Number(row.id));
}

function failedSource(provider, organizationId, integration, error) {
  let account = null;
  try {
    account = integration.status({ organizationId }).accountEmail;
  } catch {
    // Status is best effort; connection secrets are never included.
  }
  return {
    provider,
    organizationId,
    mailboxAddress: account,
    cursorKey: `mail_cursor:${provider}`,
    async fetchChanges() { throw error; },
  };
}

function discoverSources() {
  const discovered = demoSource ? [demoSource] : [];
  for (const organizationId of organizationIds()) {
    for (const [provider, integration] of Object.entries(integrations)) {
      try {
        discovered.push(...integration.sources({ organizationId }));
      } catch (error) {
        discovered.push(failedSource(provider, organizationId, integration, error));
      }
    }
  }
  return discovered;
}

function currentProvider({ organizationId, connectionSnapshot, connection, context }) {
  const provider = String(
    connectionSnapshot?.provider
      ?? connection?.provider
      ?? context?.provider
      ?? '',
  ).toLocaleLowerCase();
  const integration = integrations[provider];
  if (!integration) return null;
  const connectionId = Number(
    connectionSnapshot?.id
      ?? connection?.id
      ?? context?.connectionId
      ?? 0,
  );
  const generation = Number(
    connectionSnapshot?.generation
      ?? connection?.generation
      ?? context?.connectionGeneration
      ?? 0,
  );
  return integration.sources({ organizationId }).find(source => (
    Number(source.connectionId ?? 0) === connectionId
    && Number(source.connectionGeneration ?? 0) === generation
    && source.isCurrentConnection?.() !== false
  )) ?? null;
}

const deliveryRunner = createDeliveryRunner({
  db,
  trustedAppOrigin: config.appBaseUrl,
  resolveCurrentContext: resolveCurrentDeliveryContext,
  resolveSender({ delivery, context }) {
    try {
      return currentProvider({
        organizationId: Number(delivery.organization_id),
        context: context ?? resolveCurrentDeliveryContext({ db, delivery }),
      });
    } catch {
      return null;
    }
  },
});

const conversationHistory = createConversationHistoryService({
  db,
  resolveMailboxConnection(options) {
    return resolveMailboxConnection({ db, ...options });
  },
  loadProvider({ organizationId, connectionSnapshot, connection }) {
    return currentProvider({ organizationId, connectionSnapshot, connection });
  },
});

const syncRunner = createSyncRunner({
  db,
  sources: discoverSources,
  trustedAppOrigin: config.appBaseUrl,
});
const alertRunner = createAlertRunner({ db });
const app = createApp({
  db,
  syncRunner,
  deliveryRunner,
  conversationHistory,
  mode: config.mode,
  appBaseUrl: config.appBaseUrl,
  integrations,
});
const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`LexFlow listening at http://127.0.0.1:${config.port} (${config.mode} mode)`);
});

function reportDeliveryError(error) {
  console.error(`Assignment delivery processing failed: ${error.message}`);
}

deliveryRunner.run().catch(reportDeliveryError);
const deliveryTimer = setInterval(() => {
  deliveryRunner.run().catch(reportDeliveryError);
}, 60_000);
deliveryTimer.unref();

let syncTimer;
if (config.syncIntervalSeconds > 0) {
  syncTimer = setInterval(async () => {
    try {
      const result = await syncRunner.run();
      const failures = result.failed ? `, ${result.failed} mailbox failed` : '';
      console.log(`Mail sync complete: ${result.imported} imported, ${result.assigned} assigned${failures}`);
      await deliveryRunner.run();
    } catch (error) {
      const sourceErrors = error.result?.sources
        ?.filter(source => source.error)
        .map(source => `${source.provider}: ${source.error}`)
        .join('; ');
      console.error(`Mail sync failed: ${sourceErrors || error.message}`);
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
  clearInterval(deliveryTimer);
  clearInterval(alertTimer);
  server.close(() => {
    db.close();
  });
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
