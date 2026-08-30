import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConfig } from '../src/config.js';

const encryptionKey = Buffer.alloc(32, 0x2a).toString('base64');

const entraEnv = {
  ENTRA_CLIENT_ID: 'entra-client-id',
  ENTRA_CLIENT_SECRET: 'entra-client-secret',
};

const gmailEnv = {
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  TOKEN_ENCRYPTION_KEY: encryptionKey,
};

test('mail integrations are disabled by default', () => {
  const config = loadConfig({});

  assert.equal(config.mode, 'demo');
  assert.equal(config.liveMailConfigured, false);
  assert.equal(config.gmail.configured, false);
  assert.equal(config.gmail.tokenEncryptionKey, null);
  assert.equal(
    config.gmail.redirectUri,
    'http://127.0.0.1:3000/api/integrations/gmail/callback',
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

test('Microsoft 365 tenant connections use the Entra application credentials', () => {
  const config = loadConfig({ ...entraEnv, ...gmailEnv, APP_BASE_URL: 'https://lexflow.example.test' });

  assert.equal(config.mode, 'mixed');
  assert.equal(config.liveMailConfigured, true);
  assert.equal(config.gmail.configured, true);
  assert.deepEqual(config.outlook, {
    configured: true,
    clientId: 'entra-client-id',
    clientSecret: 'entra-client-secret',
    redirectUri: 'https://lexflow.example.test/api/integrations/outlook/callback',
  });
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
