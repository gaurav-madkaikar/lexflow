import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { createSession } from '../src/auth.js';
import { createDatabase, migrate } from '../src/db.js';
import { createGmailIntegration } from '../src/gmail.js';

test('migration preserves a legacy singleton Gmail connection and removes its global constraint', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE gmail_connection (
      id INTEGER PRIMARY KEY CHECK(id=1),
      account_email TEXT NOT NULL COLLATE NOCASE,
      encrypted_refresh_token TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      organization_id INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO gmail_connection
      (id, account_email, encrypted_refresh_token, connected_at, updated_at, organization_id)
    VALUES
      (1, 'legacy@gmail.example', 'encrypted-token',
       '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', 1);
  `);

  migrate(db);

  const legacy = db.prepare(`
    SELECT account_email, encrypted_refresh_token, organization_id
    FROM gmail_connection
  `).get();
  assert.deepEqual({ ...legacy }, {
    account_email: 'legacy@gmail.example',
    encrypted_refresh_token: 'encrypted-token',
    organization_id: 1,
  });
  const definition = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'gmail_connection'
  `).get().sql;
  assert.doesNotMatch(definition, /CHECK\s*\(\s*id\s*=\s*1\s*\)/i);
  db.close();
});

test('Gmail connections remain isolated when two organizations authorize mailboxes', async () => {
  const db = createDatabase(':memory:');
  const now = new Date('2026-09-13T08:00:00.000Z');
  const organizationTwo = Number(db.prepare(`
    INSERT INTO organizations
      (entra_tenant_id, name, domain, status, created_at, updated_at)
    VALUES ('tenant-two', 'Second workspace', 'second.example', 'active', ?, ?)
  `).run(now.toISOString(), now.toISOString()).lastInsertRowid);
  const addAdmin = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       entra_tenant_id, entra_object_id, account_status)
    VALUES (?, ?, ?, '', 'admin', ?, 'entra', ?, ?, 'active')
  `);
  const firstAdmin = Number(addAdmin.run(
    'owner@lexflow.local', 'First Owner', 'FO', 1, 'tenant-one', 'object-one',
  ).lastInsertRowid);
  const secondAdmin = Number(addAdmin.run(
    'owner@second.example', 'Second Owner', 'SO', organizationTwo, 'tenant-two', 'object-two',
  ).lastInsertRowid);
  const firstSession = createSession(db, firstAdmin, now, 1).id;
  const secondSession = createSession(db, secondAdmin, now, organizationTwo).id;

  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/revoke') {
      return { ok: true, status: 200 };
    }
    if (url.origin === 'https://oauth2.googleapis.com') {
      const code = String(options.body.get('code'));
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            access_token: `access-${code}`,
            refresh_token: `refresh-${code}`,
            expires_in: 3600,
          };
        },
      };
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      const token = String(options.headers.authorization).replace('Bearer access-', '');
      return {
        ok: true,
        status: 200,
        async json() { return { emailAddress: `${token}@gmail.example` }; },
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const integration = createGmailIntegration({
    db,
    gmail: {
      configured: true,
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://lexflow.example/api/integrations/gmail/callback',
      tokenEncryptionKey: Buffer.alloc(32, 0x2a),
    },
    fetchImpl,
    clock: () => now,
  });

  const authorize = async (sessionId, code) => {
    const url = new URL(integration.authorizationUrl({ sessionId }));
    return integration.completeAuthorization({
      sessionId,
      state: url.searchParams.get('state'),
      code,
    });
  };
  await authorize(firstSession, 'first');
  await authorize(secondSession, 'second');

  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM gmail_connection').get().count, 2);
  assert.equal(integration.status(1).accountEmail, 'first@gmail.example');
  assert.equal(integration.status(organizationTwo).accountEmail, 'second@gmail.example');
  assert.deepEqual(
    integration.sources().map(source => [source.organizationId, source.accountEmail]),
    [[1, 'first@gmail.example'], [organizationTwo, 'second@gmail.example']],
  );

  await integration.disconnect({ organizationId: 1 });
  assert.equal(integration.status(1).connected, false);
  assert.equal(integration.status(organizationTwo).connected, true);
  assert.deepEqual(
    integration.sources().map(source => source.organizationId),
    [organizationTwo],
  );
  db.close();
});
