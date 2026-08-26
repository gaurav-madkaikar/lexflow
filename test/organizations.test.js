import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase } from '../src/db.js';
import {
  completeInvite,
  createAdminOrganization,
  decideJoinRequest,
  inspectInvite,
  listJoinRequests,
  lookupOrganization,
  normalizeEmail,
  providerForEmail,
  replaceJoinRequestInvite,
  submitJoinRequest,
} from '../src/organizations.js';
import { getOrganizationLogo, parseOrganizationLogo } from '../src/registration-assets.js';

const NOW = new Date('2026-08-26T09:00:00.000Z');

function pngFixture(width = 96, height = 96, declaredType = 'image/png') {
  const bytes = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  bytes.writeUInt32BE(0, 29);
  bytes.writeUInt32BE(0, 33);
  bytes.write('IEND', 37, 'ascii');
  bytes.writeUInt32BE(0, 41);
  return `data:${declaredType};base64,${bytes.toString('base64')}`;
}

function jpegFixture(width = 96, height = 96) {
  const bytes = Buffer.alloc(23);
  bytes.set([0xff, 0xd8, 0xff, 0xc0]);
  bytes.writeUInt16BE(17, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  bytes[11] = 3;
  bytes.set([1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0], 12);
  bytes.set([0xff, 0xd9], 21);
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

function webpFixture(width = 96, height = 96) {
  const bytes = Buffer.alloc(30);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WEBP', 8, 'ascii');
  bytes.write('VP8X', 12, 'ascii');
  bytes.writeUInt32LE(10, 16);
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  bytes[24] = encodedWidth & 0xff;
  bytes[25] = (encodedWidth >> 8) & 0xff;
  bytes[26] = (encodedWidth >> 16) & 0xff;
  bytes[27] = encodedHeight & 0xff;
  bytes[28] = (encodedHeight >> 8) & 0xff;
  bytes[29] = (encodedHeight >> 16) & 0xff;
  return `data:image/webp;base64,${bytes.toString('base64')}`;
}

function validAdminRegistration(overrides = {}) {
  return {
    organizationName: 'Northstar Legal',
    organizationDomain: 'Northstar.Example',
    logoDataUrl: pngFixture(),
    name: 'Ava Admin',
    email: 'AVA@northstar.example',
    mailboxProvider: 'gmail',
    password: 'correct horse battery staple',
    ...overrides,
  };
}

async function registerOrganization(db, overrides = {}) {
  return createAdminOrganization({ db, input: validAdminRegistration(overrides), now: NOW });
}

async function pendingRequest(db, organization, overrides = {}) {
  return submitJoinRequest({
    db,
    input: {
      organizationKey: organization.handle,
      email: 'maya@example.com',
      mailboxProvider: 'outlook',
      ...overrides,
    },
    sourceAddress: '203.0.113.10',
    now: NOW,
  });
}

test('normalizes email and selects obvious consumer mailbox providers', () => {
  assert.equal(normalizeEmail('  MAYA@GMAIL.COM '), 'maya@gmail.com');
  assert.equal(providerForEmail('maya@gmail.com'), 'gmail');
  assert.equal(providerForEmail('maya@live.com'), 'outlook');
  assert.equal(providerForEmail('maya@example.com', 'outlook'), 'outlook');
  assert.throws(
    () => providerForEmail('maya@example.com'),
    error => error.code === 'VALIDATION_FAILED' && error.field === 'mailboxProvider',
  );
  assert.throws(
    () => normalizeEmail('not-an-address'),
    error => error.code === 'VALIDATION_FAILED' && error.field === 'email',
  );
  for (const control of ['\u0000', '\u001f', '\u007f']) {
    assert.throws(
      () => normalizeEmail(`maya${control}@example.com`),
      error => error.code === 'VALIDATION_FAILED' && error.field === 'email',
    );
  }
});

test('validates organization logo declaration, signature, size and dimensions', () => {
  const parsed = parseOrganizationLogo(pngFixture(96, 128));
  assert.equal(parsed.mimeType, 'image/png');
  assert.deepEqual([parsed.width, parsed.height], [96, 128]);
  assert.ok(Buffer.isBuffer(parsed.bytes));
  assert.deepEqual(
    (({ mimeType, width, height }) => ({ mimeType, width, height }))(parseOrganizationLogo(jpegFixture(80, 72))),
    { mimeType: 'image/jpeg', width: 80, height: 72 },
  );
  assert.deepEqual(
    (({ mimeType, width, height }) => ({ mimeType, width, height }))(parseOrganizationLogo(webpFixture(120, 64))),
    { mimeType: 'image/webp', width: 120, height: 64 },
  );

  assert.throws(() => parseOrganizationLogo(pngFixture(96, 96, 'image/jpeg')), /does not match/i);
  assert.throws(() => parseOrganizationLogo(pngFixture(63, 96)), /between 64 and 2,048/i);
  assert.throws(
    () => parseOrganizationLogo(`data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`),
    /2 MiB/i,
  );
});

test('admin registration creates organization, asset, active admin, settings and session atomically', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());

  const result = await registerOrganization(db);

  assert.equal(result.user.role, 'admin');
  assert.equal(result.user.organizationId, result.organization.id);
  assert.equal(result.user.email, 'ava@northstar.example');
  assert.equal(result.user.mailboxProvider, 'gmail');
  assert.equal(result.organization.domain, 'northstar.example');
  assert.ok(result.organization.handle.startsWith('northstar-legal-'));
  assert.ok(result.organization.joinCode);
  assert.ok(result.session.id);
  assert.equal(db.prepare('SELECT count(*) AS count FROM organization_assets').get().count, 1);
  const storedLogo = getOrganizationLogo({ db, assetId: result.organization.logoAssetId });
  assert.equal(storedLogo.mimeType, 'image/png');
  assert.deepEqual([storedLogo.width, storedLogo.height], [96, 96]);
  assert.ok(storedLogo.bytes.length > 0);
  assert.equal(
    db.prepare('SELECT count(*) AS count FROM workspace_settings WHERE organization_id = ?')
      .get(result.organization.id).count,
    1,
  );
});

test('unverified duplicate domains remain isolated behind unique handles and join codes', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());

  const first = await registerOrganization(db);
  const second = await registerOrganization(db, {
    organizationName: 'Northstar Finance',
    name: 'Finn Admin',
    email: 'finn@northstar.example',
  });

  assert.notEqual(first.organization.id, second.organization.id);
  assert.notEqual(first.organization.handle, second.organization.handle);
  assert.notEqual(first.organization.joinCode, second.organization.joinCode);
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM organizations WHERE normalized_domain = 'northstar.example'")
      .get().count,
    2,
  );
  assert.deepEqual(
    lookupOrganization({ db, key: second.organization.joinCode }),
    {
      id: second.organization.id,
      name: 'Northstar Finance',
      handle: second.organization.handle,
      domain: 'northstar.example',
      logoAssetId: second.organization.logoAssetId,
    },
  );
});

test('invalid admin input rolls back every registration record', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());

  await assert.rejects(
    registerOrganization(db, { password: 'short' }),
    error => error.code === 'VALIDATION_FAILED' && error.field === 'password',
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM organizations').get().count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM organization_assets').get().count, 0);
  assert.equal(db.prepare("SELECT count(*) AS count FROM users WHERE email = 'ava@northstar.example'").get().count, 0);
});

test('a duplicate admin email rolls back the new organization, asset and settings', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());
  await registerOrganization(db);
  const before = {
    organizations: db.prepare('SELECT count(*) AS count FROM organizations').get().count,
    assets: db.prepare('SELECT count(*) AS count FROM organization_assets').get().count,
    settings: db.prepare('SELECT count(*) AS count FROM workspace_settings').get().count,
  };

  await assert.rejects(
    registerOrganization(db, {
      organizationName: 'Duplicate Admin Organization',
      organizationDomain: 'duplicate.example',
    }),
    error => error.code === 'REGISTRATION_UNAVAILABLE',
  );
  assert.deepEqual({
    organizations: db.prepare('SELECT count(*) AS count FROM organizations').get().count,
    assets: db.prepare('SELECT count(*) AS count FROM organization_assets').get().count,
    settings: db.prepare('SELECT count(*) AS count FROM workspace_settings').get().count,
  }, before);
});

test('join requests are pending once per organization and bounded to five attempts per hour', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());
  const { organization } = await registerOrganization(db);

  const request = await pendingRequest(db, organization);
  assert.equal(request.status, 'pending');
  assert.equal(request.email, 'maya@example.com');
  await assert.rejects(
    pendingRequest(db, organization),
    error => error.code === 'JOIN_REQUEST_EXISTS',
  );

  for (let attempt = 2; attempt < 5; attempt += 1) {
    await assert.rejects(
      pendingRequest(db, organization),
      error => error.code === 'JOIN_REQUEST_EXISTS',
    );
  }
  await assert.rejects(
    pendingRequest(db, organization),
    error => error.code === 'RATE_LIMITED',
  );
});

test('organization admin can list and reject only pending requests in its organization', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());
  const { organization, user } = await registerOrganization(db);
  const request = await pendingRequest(db, organization);

  assert.equal(listJoinRequests({ db, organizationId: organization.id }).length, 1);
  const result = decideJoinRequest({
    db,
    organizationId: organization.id,
    adminId: user.id,
    requestId: request.id,
    decision: 'reject',
    appBaseUrl: 'http://127.0.0.1:3000',
    now: NOW,
  });
  assert.equal(result.request.status, 'rejected');
  assert.equal(result.inviteLink, undefined);
  assert.equal(listJoinRequests({ db, organizationId: organization.id }).length, 0);
});

test('approved invite is opaque, stored only as a digest, and completes once atomically', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());
  const { organization, user: admin } = await registerOrganization(db);
  const request = await pendingRequest(db, organization);
  const approval = decideJoinRequest({
    db,
    organizationId: organization.id,
    adminId: admin.id,
    requestId: request.id,
    decision: 'approve',
    appBaseUrl: 'http://127.0.0.1:3000',
    now: NOW,
  });

  assert.match(approval.inviteLink, /^http:\/\/127\.0\.0\.1:3000\//);
  const token = new URL(approval.inviteLink).searchParams.get('invite');
  assert.ok(token && token.length >= 32);
  assert.equal(
    db.prepare('SELECT count(*) AS count FROM registration_invites WHERE token_digest = ?')
      .get(token).count,
    0,
  );
  assert.match(
    db.prepare('SELECT token_digest FROM registration_invites').get().token_digest,
    /^[a-f0-9]{64}$/u,
  );
  assert.deepEqual(inspectInvite({ db, token, now: NOW }), {
    email: 'maya@example.com',
    mailboxProvider: 'outlook',
    role: 'member',
    organization: {
      id: organization.id,
      name: organization.name,
      handle: organization.handle,
      domain: organization.domain,
      logoAssetId: organization.logoAssetId,
    },
    expiresAt: '2026-08-27T09:00:00.000Z',
  });

  const completions = await Promise.allSettled([
    completeInvite({
      db,
      token,
      input: { name: 'Maya Shah', password: 'welcome1234' },
      now: NOW,
    }),
    completeInvite({
      db,
      token,
      input: { name: 'Maya Shah', password: 'welcome1234' },
      now: NOW,
    }),
  ]);
  assert.equal(completions.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(completions.filter(result => (
    result.status === 'rejected' && result.reason.code === 'INVITE_INVALID'
  )).length, 1);
  const completed = completions.find(result => result.status === 'fulfilled').value;
  assert.equal(completed.user.role, 'member');
  assert.equal(completed.user.organizationId, organization.id);
  assert.ok(completed.session.id);
  assert.equal(db.prepare("SELECT count(*) AS count FROM users WHERE email = 'maya@example.com'").get().count, 1);
});

test('an admin can replace an approved invite and the previous link stops working', async t => {
  const db = createDatabase(':memory:');
  t.after(() => db.close());
  const registration = await registerOrganization(db);
  const request = await pendingRequest(db, registration.organization);
  const approval = decideJoinRequest({
    db,
    organizationId: registration.organization.id,
    adminId: registration.user.id,
    requestId: request.id,
    decision: 'approve',
    appBaseUrl: 'http://127.0.0.1:3000',
    now: NOW,
  });
  const oldToken = new URL(approval.inviteLink).searchParams.get('invite');
  const listed = listJoinRequests({ db, organizationId: registration.organization.id });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'approved');
  assert.ok(listed[0].inviteExpiresAt);

  const replacement = replaceJoinRequestInvite({
    db,
    organizationId: registration.organization.id,
    adminId: registration.user.id,
    requestId: request.id,
    appBaseUrl: 'http://127.0.0.1:3000',
    now: new Date(NOW.getTime() + 60_000),
  });
  const newToken = new URL(replacement.inviteLink).searchParams.get('invite');
  assert.notEqual(newToken, oldToken);
  assert.throws(
    () => inspectInvite({ db, token: oldToken, now: NOW }),
    error => error.code === 'INVITE_INVALID',
  );
  assert.equal(
    inspectInvite({ db, token: newToken, now: NOW }).email,
    'maya@example.com',
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM registration_invites').get().count, 1);
});

test('expired invites and account conflicts fail closed without consuming the invite', async t => {
  const db = createDatabase(':memory:', { now: NOW });
  t.after(() => db.close());
  const { organization, user: admin } = await registerOrganization(db);
  const request = await pendingRequest(db, organization);
  const approval = decideJoinRequest({
    db,
    organizationId: organization.id,
    adminId: admin.id,
    requestId: request.id,
    decision: 'approve',
    appBaseUrl: 'http://127.0.0.1:3000',
    now: NOW,
  });
  const token = new URL(approval.inviteLink).searchParams.get('invite');

  assert.throws(
    () => inspectInvite({ db, token, now: new Date('2026-08-27T09:00:00.001Z') }),
    error => error.code === 'INVITE_INVALID',
  );
  await assert.rejects(
    completeInvite({
      db,
      token,
      input: { name: 'Maya Shah', password: 'welcome1234' },
      now: new Date('2026-08-27T09:00:00.001Z'),
    }),
    error => error.code === 'INVITE_INVALID',
  );

  await registerOrganization(db, {
    organizationName: 'Another Organization',
    organizationDomain: 'another.example',
    name: 'Maya Elsewhere',
    email: 'maya@example.com',
  });
  await assert.rejects(
    completeInvite({
      db,
      token,
      input: { name: 'Maya Shah', password: 'welcome1234' },
      now: NOW,
    }),
    error => error.code === 'INVITE_INVALID',
  );
  assert.equal(
    db.prepare('SELECT consumed_at FROM registration_invites').get().consumed_at,
    null,
  );
  assert.equal(
    db.prepare('SELECT count(*) AS count FROM users WHERE organization_id = ? AND email = ?')
      .get(organization.id, 'maya@example.com').count,
    0,
  );
});
