import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConfig } from '../src/config.js';

const encryptionKey = Buffer.alloc(32, 0x2a).toString('base64');

const graphEnv = {
  GRAPH_TENANT_ID: 'tenant-id',
  GRAPH_CLIENT_ID: 'graph-client-id',
  GRAPH_CLIENT_SECRET: 'graph-client-secret',
  GRAPH_MAILBOX: 'shared@example.test',
};

const gmailEnv = {
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  TOKEN_ENCRYPTION_KEY: encryptionKey,
};

const outlookEnv = {
  OUTLOOK_TENANT_ID: 'organizations',
  OUTLOOK_CLIENT_ID: 'outlook-client-id',
  OUTLOOK_CLIENT_SECRET: 'outlook-client-secret',
  TOKEN_ENCRYPTION_KEY: encryptionKey,
};

test('mail integrations are disabled by default', () => {
  const config = loadConfig({});

  assert.equal(config.mode, 'demo');
  assert.equal(config.liveMailConfigured, false);
  assert.equal(config.gmail.configured, false);
  assert.equal(config.gmail.tokenEncryptionKey, null);
  assert.deepEqual(config.gmail.requestedScopes, [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'openid',
    'email',
  ]);
  assert.equal(config.appBaseUrl, 'http://127.0.0.1:3000');
  assert.equal(
    config.gmail.redirectUri,
    'http://127.0.0.1:3000/api/integrations/gmail/callback',
  );
  assert.deepEqual(config.outlook.requestedScopes, [
    'offline_access',
    'User.Read',
    'Mail.Read',
    'Mail.Send',
  ]);
  assert.equal(config.outlook.configured, false);
});

test('public application origin requires HTTPS except on loopback', () => {
  assert.throws(
    () => loadConfig({ APP_BASE_URL: 'http://lexflow.example.test' }),
    /must use HTTPS/,
  );
  assert.equal(
    loadConfig({ APP_BASE_URL: 'http://localhost:4321/' }).appBaseUrl,
    'http://localhost:4321',
  );
});

test('complete Gmail settings enable OAuth with an exact redirect origin', () => {
  const config = loadConfig({
    ...gmailEnv,
    APP_BASE_URL: 'https://lexflow.example.test/',
  });

  assert.equal(config.mode, 'gmail');
  assert.equal(config.liveMailConfigured, true);
  assert.equal(config.gmail.configured, true);
  assert.equal(config.gmail.clientId, gmailEnv.GOOGLE_CLIENT_ID);
  assert.equal(config.gmail.clientSecret, gmailEnv.GOOGLE_CLIENT_SECRET);
  assert.deepEqual(config.gmail.tokenEncryptionKey, Buffer.alloc(32, 0x2a));
  assert.equal(
    config.gmail.redirectUri,
    'https://lexflow.example.test/api/integrations/gmail/callback',
  );
});

test('Outlook and Gmail settings can coexist', () => {
  const config = loadConfig({ ...graphEnv, ...gmailEnv });

  assert.equal(config.mode, 'mixed');
  assert.equal(config.liveMailConfigured, true);
  assert.equal(config.gmail.configured, true);
  assert.deepEqual(config.graph, {
    tenantId: 'tenant-id',
    clientId: 'graph-client-id',
    clientSecret: 'graph-client-secret',
    mailbox: 'shared@example.test',
    authMode: 'application',
    capabilities: { read: true, send: false },
  });
});

test('delegated Outlook OAuth is configured independently from legacy Graph application auth', () => {
  const config = loadConfig({
    ...outlookEnv,
    APP_BASE_URL: 'https://lexflow.example.test',
  });

  assert.equal(config.mode, 'outlook');
  assert.equal(config.liveMailConfigured, true);
  assert.deepEqual(config.outlook, {
    configured: true,
    tenantId: 'organizations',
    clientId: 'outlook-client-id',
    clientSecret: 'outlook-client-secret',
    redirectUri: 'https://lexflow.example.test/api/integrations/outlook/callback',
    tokenEncryptionKey: Buffer.alloc(32, 0x2a),
    requestedScopes: ['offline_access', 'User.Read', 'Mail.Read', 'Mail.Send'],
  });
  assert.equal(config.graph.mailbox, '');
});

test('delegated Outlook settings require a complete client and encryption key', () => {
  assert.throws(
    () => loadConfig({ OUTLOOK_CLIENT_ID: 'outlook-client-id' }),
    /OUTLOOK_TENANT_ID, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and TOKEN_ENCRYPTION_KEY/,
  );
  assert.throws(
    () => loadConfig({
      OUTLOOK_TENANT_ID: 'organizations',
      OUTLOOK_CLIENT_ID: 'outlook-client-id',
      OUTLOOK_CLIENT_SECRET: 'outlook-client-secret',
    }),
    /OUTLOOK_TENANT_ID, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and TOKEN_ENCRYPTION_KEY/,
  );
});

test('a shared token encryption key can configure Outlook without partially configuring Gmail', () => {
  const config = loadConfig(outlookEnv);

  assert.equal(config.outlook.configured, true);
  assert.equal(config.gmail.configured, false);
});

test('partial Gmail settings and invalid encryption keys are rejected', () => {
  assert.throws(
    () => loadConfig({ GOOGLE_CLIENT_ID: 'google-client-id' }),
    /must be configured together/,
  );
  assert.throws(
    () => loadConfig({
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(31).toString('base64'),
    }),
    /base64-encoded 32-byte key/,
  );
  assert.throws(
    () => loadConfig({
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      TOKEN_ENCRYPTION_KEY: 'not-base64',
    }),
    /base64-encoded 32-byte key/,
  );
});
