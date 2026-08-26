import { hashPassword, verifyPassword } from './auth.js';
import { seedDemoData } from './db.js';

export const LOCAL_ACCOUNTS = Object.freeze([
  Object.freeze({
    key: 'admin',
    email: 'admin@lexflow.local',
    password: 'admin123',
  }),
  Object.freeze({
    key: 'maya',
    email: 'maya@lexflow.local',
    password: 'welcome123',
  }),
  Object.freeze({
    key: 'priya',
    email: 'priya@lexflow.local',
    password: 'welcome123',
  }),
]);

async function localPasswordHashes() {
  const entries = await Promise.all(LOCAL_ACCOUNTS.map(async account => [
    account.key,
    await hashPassword(account.password),
  ]));
  return Object.fromEntries(entries);
}

function normalizedRuntime({ nodeEnv = '', mode = 'demo' } = {}) {
  return {
    nodeEnv: String(nodeEnv).trim().toLocaleLowerCase(),
    mode: String(mode).trim().toLocaleLowerCase(),
  };
}

export function assertDemoRuntimeAllowed(options = {}) {
  const runtime = normalizedRuntime(options);
  if (runtime.nodeEnv === 'production' && runtime.mode === 'demo') {
    throw new Error(
      'LexFlow demo mode is disabled in production. Configure an Outlook or Gmail '
        + 'mail provider before starting LexFlow.',
    );
  }
}

export async function assertProductionCredentialsSafe(
  db,
  { nodeEnv = process.env.NODE_ENV } = {},
) {
  if (normalizedRuntime({ nodeEnv }).nodeEnv !== 'production') return;

  const findAccount = db.prepare(`
    SELECT email, password_hash
    FROM users
    WHERE email = ? COLLATE NOCASE
  `);
  const unsafeAccounts = [];
  for (const account of LOCAL_ACCOUNTS) {
    const user = findAccount.get(account.email);
    if (user && await verifyPassword(account.password, user.password_hash)) {
      unsafeAccounts.push(account.email);
    }
  }

  if (unsafeAccounts.length > 0) {
    throw new Error(
      'Refusing to start production with documented local demo credentials. '
        + `Explicitly rotate or remove the credentials for ${unsafeAccounts.join(', ')} `
        + 'before starting LexFlow.',
    );
  }
}

export async function seedLocalAccountsIfEmpty(
  db,
  { nodeEnv = process.env.NODE_ENV, mode = 'demo' } = {},
) {
  const runtime = normalizedRuntime({ nodeEnv, mode });
  assertDemoRuntimeAllowed(runtime);
  await assertProductionCredentialsSafe(db, runtime);

  const userCount = Number(db.prepare('SELECT count(*) AS count FROM users').get().count);
  if (userCount > 0) return { seeded: false };
  if (runtime.mode !== 'demo') return { seeded: false };

  const passwordHashes = await localPasswordHashes();
  seedDemoData(db, {
    adminPasswordHash: passwordHashes.admin,
    mayaPasswordHash: passwordHashes.maya,
    priyaPasswordHash: passwordHashes.priya,
  });
  return { seeded: true };
}

export async function resetLocalCredentials(db) {
  const passwordHashes = await localPasswordHashes();
  const updatePassword = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?');

  db.exec('BEGIN IMMEDIATE');
  try {
    let updatedAccounts = 0;
    for (const account of LOCAL_ACCOUNTS) {
      updatedAccounts += Number(updatePassword.run(passwordHashes[account.key], account.email).changes);
    }
    const invalidatedSessions = Number(db.prepare('DELETE FROM sessions').run().changes);
    db.exec('COMMIT');
    return { updatedAccounts, invalidatedSessions };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
