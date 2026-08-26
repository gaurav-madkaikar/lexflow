import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const BACKUP_ARTIFACT = /^lexflow-before-[A-Za-z0-9][A-Za-z0-9._-]*\.db(?:-(?:wal|shm))?$/;

const CORE_TABLES = [
  'users',
  'sessions',
  'rules',
  'emails',
  'email_thread_owners',
  'notifications',
  'activity',
  'sync_state',
  'gmail_connection',
  'gmail_oauth_states',
  'departments',
  'workspace_settings',
  'alert_deliveries',
];

function tableExists(db, table) {
  return Boolean(db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(table));
}

function coreRowCounts(db) {
  const counts = new Map();
  for (const table of CORE_TABLES) {
    if (tableExists(db, table)) {
      counts.set(table, Number(db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count));
    }
  }
  return counts;
}

function timestamp(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('Migration backup time must be a valid Date.');
  }
  return now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function availableBackupPath(filename, now) {
  const directory = dirname(resolve(filename));
  const base = join(directory, `lexflow-before-organizations-${timestamp(now)}.db`);
  if (!existsSync(base)) return base;

  const extension = extname(base);
  const stem = basename(base, extension);
  for (let suffix = 1; ; suffix += 1) {
    const candidate = join(directory, `${stem}-${suffix}${extension}`);
    if (!existsSync(candidate)) return candidate;
  }
}

function missing(error) {
  return error?.code === 'ENOENT';
}

function secureDirectory(directory) {
  mkdirSync(directory, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  const entry = lstatSync(directory);
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    throw new Error(`Database storage directory must be a real directory: ${directory}`);
  }
  chmodSync(directory, PRIVATE_DIRECTORY_MODE);
}

function secureRegularFile(filename, { requiredArtifact = false } = {}) {
  let entry;
  try {
    entry = lstatSync(filename);
  } catch (error) {
    if (missing(error)) return false;
    throw error;
  }
  if (entry.isSymbolicLink() || !entry.isFile()) {
    if (requiredArtifact) {
      throw new Error(`Database artifact must be a regular file: ${filename}`);
    }
    return false;
  }
  chmodSync(filename, PRIVATE_FILE_MODE);
  return true;
}

export function useRestrictiveFileCreationMask() {
  return process.umask(0o077);
}

export function secureDatabaseStorage(filename) {
  if (!filename || filename === ':memory:') return null;

  const databasePath = resolve(filename);
  const directory = dirname(databasePath);
  secureDirectory(directory);

  for (const artifact of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
    secureRegularFile(artifact, { requiredArtifact: true });
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (BACKUP_ARTIFACT.test(entry.name)) {
      secureRegularFile(join(directory, entry.name));
    }
  }

  return databasePath;
}

export function createVerifiedMigrationBackup(db, filename, now = new Date()) {
  if (!filename || filename === ':memory:') return null;

  secureDatabaseStorage(filename);
  const sourceCounts = coreRowCounts(db);
  const backupPath = availableBackupPath(filename, now);
  db.prepare('VACUUM INTO ?').run(backupPath);
  secureRegularFile(backupPath);

  let backup;
  try {
    backup = new DatabaseSync(backupPath, { readOnly: true });
    const integrity = backup.prepare('PRAGMA integrity_check').get()?.integrity_check;
    if (integrity !== 'ok') {
      throw new Error(`Migration backup integrity check failed: ${integrity ?? 'no result'}`);
    }

    const backupCounts = coreRowCounts(backup);
    for (const [table, expected] of sourceCounts) {
      const actual = backupCounts.get(table);
      if (actual !== expected) {
        throw new Error(
          `Migration backup row count mismatch for ${table}: expected ${expected}, received ${actual ?? 'missing table'}`,
        );
      }
    }
  } finally {
    backup?.close();
    secureDatabaseStorage(filename);
  }

  return backupPath;
}
