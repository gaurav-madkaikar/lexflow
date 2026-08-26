import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import {
  createVerifiedMigrationBackup,
  secureDatabaseStorage,
  useRestrictiveFileCreationMask,
} from '../src/database-backup.js';

function permissionMode(filename) {
  return statSync(filename).mode & 0o777;
}

test('restrictive file mask is explicit and observable', () => {
  const original = process.umask();
  try {
    process.umask(0o022);
    assert.equal(useRestrictiveFileCreationMask(), 0o022);
    assert.equal(process.umask(), 0o077);
  } finally {
    process.umask(original);
  }
});

test('database storage repair restricts SQLite and backup artifacts only', t => {
  const directory = mkdtempSync(join(tmpdir(), 'lexflow-permissions-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const databasePath = join(directory, 'lexflow.db');
  const artifacts = [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    join(directory, 'lexflow-before-organizations-20260826101112.db'),
    join(directory, 'lexflow-before-threading-20260825.db-wal'),
  ];
  for (const artifact of artifacts) {
    writeFileSync(artifact, 'private');
    chmodSync(artifact, 0o644);
  }
  const unrelated = join(directory, 'notes.txt');
  const symlinkTarget = join(directory, 'outside-backup-target.txt');
  writeFileSync(unrelated, 'unrelated');
  writeFileSync(symlinkTarget, 'target');
  chmodSync(unrelated, 0o644);
  chmodSync(symlinkTarget, 0o644);
  symlinkSync(symlinkTarget, join(directory, 'lexflow-before-malicious.db'));
  chmodSync(directory, 0o755);

  assert.equal(secureDatabaseStorage(databasePath), databasePath);
  assert.equal(permissionMode(directory), 0o700);
  for (const artifact of artifacts) assert.equal(permissionMode(artifact), 0o600);
  assert.equal(permissionMode(unrelated), 0o644);
  assert.equal(permissionMode(symlinkTarget), 0o644);
});

test('database storage repair refuses a symlinked database artifact', t => {
  const directory = mkdtempSync(join(tmpdir(), 'lexflow-symlink-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const target = join(directory, 'target.db');
  const databasePath = join(directory, 'lexflow.db');
  writeFileSync(target, 'do not follow');
  symlinkSync(target, databasePath);

  assert.throws(
    () => secureDatabaseStorage(databasePath),
    /database artifact must be a regular file/i,
  );
});

test('verified migration backup is private immediately after creation', t => {
  const directory = mkdtempSync(join(tmpdir(), 'lexflow-private-backup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const databasePath = join(directory, 'lexflow.db');
  const db = new DatabaseSync(databasePath);
  t.after(() => db.close());
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users VALUES (1);');
  chmodSync(databasePath, 0o644);
  chmodSync(directory, 0o755);

  const backupPath = createVerifiedMigrationBackup(
    db,
    databasePath,
    new Date('2026-08-26T10:11:12.000Z'),
  );

  assert.equal(permissionMode(directory), 0o700);
  assert.equal(permissionMode(databasePath), 0o600);
  assert.equal(permissionMode(backupPath), 0o600);
  const backup = new DatabaseSync(backupPath, { readOnly: true });
  try {
    assert.equal(backup.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(backup.prepare('SELECT count(*) AS count FROM users').get().count, 1);
  } finally {
    backup.close();
  }
});
