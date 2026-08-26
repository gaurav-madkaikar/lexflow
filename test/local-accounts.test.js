import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, hashPassword, verifyPassword } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { createDatabase } from '../src/db.js';
import {
  LOCAL_ACCOUNTS,
  assertDemoRuntimeAllowed,
  resetLocalCredentials,
  seedLocalAccountsIfEmpty,
} from '../src/local-accounts.js';

test('local accounts are seeded once and ordinary startup preserves hashes and sessions', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());

  assert.deepEqual(await seedLocalAccountsIfEmpty(db), { seeded: true });
  for (const account of LOCAL_ACCOUNTS) {
    const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(account.email);
    assert.equal(await verifyPassword(account.password, user.password_hash), true);
  }

  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@lexflow.local');
  const customHash = await hashPassword('custom-admin-password');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(customHash, admin.id);
  const session = createSession(db, admin.id);

  assert.deepEqual(await seedLocalAccountsIfEmpty(db), { seeded: false });
  assert.equal(
    db.prepare('SELECT password_hash FROM users WHERE id = ?').get(admin.id).password_hash,
    customHash,
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM sessions WHERE id = ?').get(session.id).count, 1);

  const liveConnectorConfig = loadConfig({
    GRAPH_TENANT_ID: 'tenant',
    GRAPH_CLIENT_ID: 'client',
    GRAPH_CLIENT_SECRET: 'secret',
    GRAPH_MAILBOX: 'mailbox@example.com',
  });
  assert.equal(liveConnectorConfig.liveMailConfigured, true);
  assert.equal('bootstrapPasswords' in liveConnectorConfig, false);
});

test('explicit reset restores only known credentials and invalidates sessions', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  await seedLocalAccountsIfEmpty(db);

  const changedHash = await hashPassword('changed-password');
  db.prepare('UPDATE users SET password_hash = ?').run(changedHash);
  const insertUser = db.prepare(`
    INSERT INTO users (email, name, initials, department, role, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('other@example.com', 'Other User', 'OU', 'Operations', 'member', changedHash);
  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@lexflow.local');
  createSession(db, admin.id);
  createSession(db, insertUser.lastInsertRowid);

  assert.deepEqual(await resetLocalCredentials(db), {
    updatedAccounts: 3,
    invalidatedSessions: 2,
  });
  assert.equal(db.prepare('SELECT count(*) AS count FROM sessions').get().count, 0);

  for (const account of LOCAL_ACCOUNTS) {
    const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(account.email);
    assert.equal(await verifyPassword(account.password, user.password_hash), true);
  }
  assert.equal(
    db.prepare('SELECT password_hash FROM users WHERE email = ?').get('other@example.com').password_hash,
    changedHash,
  );
});

test('local accounts are seeded only in an explicit non-production demo runtime', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());

  assert.throws(
    () => assertDemoRuntimeAllowed({ nodeEnv: 'production', mode: 'demo' }),
    /demo mode is disabled in production/i,
  );
  assert.doesNotThrow(
    () => assertDemoRuntimeAllowed({ nodeEnv: 'production', mode: 'gmail' }),
  );

  assert.deepEqual(
    await seedLocalAccountsIfEmpty(db, { nodeEnv: 'development', mode: 'gmail' }),
    { seeded: false },
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 0);
  assert.deepEqual(
    await seedLocalAccountsIfEmpty(db, { nodeEnv: 'development', mode: 'demo' }),
    { seeded: true },
  );
});

test('production rejects known demo credentials regardless of user count until rotated', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());

  await seedLocalAccountsIfEmpty(db, { nodeEnv: 'development', mode: 'demo' });
  const admin = db.prepare('SELECT id, password_hash FROM users WHERE email = ?')
    .get('admin@lexflow.local');
  const session = createSession(db, admin.id);
  const unrelatedPassword = await hashPassword('unrelated-secure-password');
  db.prepare(`
    INSERT INTO users (email, name, initials, department, role, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'production-user@example.com',
    'Production User',
    'PU',
    'Operations',
    'member',
    unrelatedPassword,
  );

  await assert.rejects(
    seedLocalAccountsIfEmpty(db, { nodeEnv: 'production', mode: 'gmail' }),
    /refusing to start production with documented local demo credentials/i,
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 4);
  assert.equal(db.prepare('SELECT count(*) AS count FROM sessions WHERE id = ?').get(session.id).count, 1);

  const rotatedPassword = await hashPassword('rotated-production-password');
  const rotate = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');
  rotate.run(rotatedPassword, 'admin@lexflow.local');
  await assert.rejects(
    seedLocalAccountsIfEmpty(db, { nodeEnv: 'production', mode: 'gmail' }),
    /maya@lexflow\.local/i,
  );
  rotate.run(rotatedPassword, 'maya@lexflow.local');
  rotate.run(rotatedPassword, 'priya@lexflow.local');

  assert.deepEqual(
    await seedLocalAccountsIfEmpty(db, { nodeEnv: 'production', mode: 'gmail' }),
    { seeded: false },
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM sessions WHERE id = ?').get(session.id).count, 1);
});

test('production with a live connector leaves an empty database unseeded', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());

  assert.deepEqual(
    await seedLocalAccountsIfEmpty(db, { nodeEnv: 'production', mode: 'outlook' }),
    { seeded: false },
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 0);
});
