import { createHash, randomBytes } from 'node:crypto';
import { domainToASCII } from 'node:url';

import { createSession, hashPassword } from './auth.js';
import { parseOrganizationLogo } from './registration-assets.js';

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 1024;
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const JOIN_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const JOIN_ATTEMPT_LIMIT = 5;
const DEFAULT_ADMIN_DEPARTMENT = 'Administration';
const DEFAULT_MEMBER_DEPARTMENT = 'Unassigned';

export class OrganizationRegistrationError extends Error {
  constructor(code, message, { field, status = 400 } = {}) {
    super(message);
    this.name = 'OrganizationRegistrationError';
    this.code = code;
    this.status = status;
    if (field) this.field = field;
  }
}

function invalid(field, message) {
  return new OrganizationRegistrationError('VALIDATION_FAILED', message, { field, status: 400 });
}

function domainError(code, message, status) {
  return new OrganizationRegistrationError(code, message, { status });
}

function normalizeText(value, field, label, maximumLength = 120) {
  if (typeof value !== 'string') throw invalid(field, `${label} is required.`);
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (!normalized) throw invalid(field, `${label} is required.`);
  if (normalized.length > maximumLength || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw invalid(field, `${label} must be ${maximumLength} characters or fewer.`);
  }
  return normalized;
}

function normalizeDomain(value) {
  if (typeof value !== 'string') throw invalid('organizationDomain', 'Organization domain is required.');
  const candidate = value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\.$/u, '');
  if (!candidate || candidate.length > 253 || /[:/@?#\s]/u.test(candidate)) {
    throw invalid('organizationDomain', 'Enter a valid organization domain.');
  }
  const ascii = domainToASCII(candidate).toLocaleLowerCase('en-US');
  const labels = ascii.split('.');
  if (
    !ascii
    || labels.length < 2
    || labels.some(label => (
      label.length < 1
      || label.length > 63
      || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label)
    ))
  ) throw invalid('organizationDomain', 'Enter a valid organization domain.');
  return ascii;
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw invalid('email', 'Enter a valid email address.');
  const candidate = value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
  const at = candidate.lastIndexOf('@');
  if (
    candidate.length > 254
    || at < 1
    || at !== candidate.indexOf('@')
    || at > 64
    || /[\u0000-\u001f\u007f]/u.test(candidate)
  ) throw invalid('email', 'Enter a valid email address.');
  const local = candidate.slice(0, at);
  if (
    local.startsWith('.')
    || local.endsWith('.')
    || local.includes('..')
    || !/^[^\s"(),:;<>\[\]\\]+$/u.test(local)
  ) throw invalid('email', 'Enter a valid email address.');
  let domain;
  try {
    domain = normalizeDomain(candidate.slice(at + 1));
  } catch {
    throw invalid('email', 'Enter a valid email address.');
  }
  return `${local}@${domain}`;
}

export function providerForEmail(email, requestedProvider) {
  const domain = normalizeEmail(email).split('@')[1];
  if (domain === 'gmail.com') return 'gmail';
  if (['outlook.com', 'hotmail.com', 'live.com'].includes(domain)) return 'outlook';
  const provider = typeof requestedProvider === 'string'
    ? requestedProvider.trim().toLocaleLowerCase('en-US')
    : '';
  if (!['gmail', 'outlook'].includes(provider)) {
    throw invalid('mailboxProvider', 'Choose Gmail or Outlook for this address.');
  }
  return provider;
}

function normalizePassword(value) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH) {
    throw invalid('password', `Password must have at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (value.length > PASSWORD_MAX_LENGTH || /\u0000/u.test(value)) {
    throw invalid('password', `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`);
  }
  return value;
}

function initialsFor(name) {
  const words = name.split(/\s+/u).filter(Boolean);
  const selected = words.length > 1 ? [words[0], words.at(-1)] : words;
  return selected.map(word => Array.from(word)[0]).join('').toLocaleUpperCase('en-US').slice(0, 4);
}

function slugFor(name) {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 40)
    .replace(/-+$/u, '');
  return slug || 'organization';
}

function dateValue(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now must be a valid Date');
  }
  return now;
}

function immediateTransaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function isUniqueConstraint(error) {
  return /(?:unique|primary key) constraint failed/iu.test(String(error?.message ?? ''));
}

function publicOrganization(row) {
  return {
    id: Number(row.id),
    name: row.name,
    handle: row.handle,
    domain: row.normalized_domain,
    logoAssetId: row.logo_asset_id == null ? null : Number(row.logo_asset_id),
  };
}

function publicUser(row) {
  return {
    id: Number(row.id),
    organizationId: Number(row.organization_id),
    email: row.email,
    name: row.name,
    initials: row.initials,
    department: row.department,
    role: row.role,
    registrationStatus: row.registration_status,
    mailboxProvider: row.mailbox_provider,
  };
}

function joinRequestView(row) {
  return {
    id: Number(row.id),
    organizationId: Number(row.organization_id),
    email: row.email,
    mailboxProvider: row.mailbox_provider,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? null,
    inviteExpiresAt: row.invite_expires_at ?? null,
  };
}

function adminRegistrationInput(input) {
  const organization = input?.organization ?? {};
  const account = input?.account ?? {};
  const organizationName = normalizeText(
    input?.organizationName ?? organization.name,
    'organizationName',
    'Organization name',
  );
  const organizationDomain = normalizeDomain(input?.organizationDomain ?? organization.domain);
  const name = normalizeText(input?.name ?? account.name, 'name', 'Name');
  const email = normalizeEmail(input?.email ?? account.email);
  const mailboxProvider = providerForEmail(email, input?.mailboxProvider ?? account.mailboxProvider);
  const password = normalizePassword(input?.password ?? account.password);
  const logo = parseOrganizationLogo(input?.logoDataUrl ?? organization.logoDataUrl);
  return { organizationName, organizationDomain, name, email, mailboxProvider, password, logo };
}

function insertOrganization(db, prepared, createdAt) {
  const slug = slugFor(prepared.organizationName);
  const insert = db.prepare(`
    INSERT INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, logo_asset_id,
       created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, NULL, ?, ?)
  `);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const handle = `${slug}-${randomBytes(8).toString('hex')}`;
    const joinCode = randomBytes(9).toString('base64url');
    try {
      const result = insert.run(
        handle,
        joinCode,
        prepared.organizationName,
        prepared.organizationDomain,
        createdAt,
        createdAt,
      );
      return { id: Number(result.lastInsertRowid), handle, joinCode };
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
  }
  throw domainError('REGISTRATION_UNAVAILABLE', 'Organization registration is temporarily unavailable.', 503);
}

export async function createAdminOrganization({ db, input, now = new Date() }) {
  const timestamp = dateValue(now).toISOString();
  const prepared = adminRegistrationInput(input);
  const passwordHash = await hashPassword(prepared.password);
  try {
    return immediateTransaction(db, () => {
      const identity = insertOrganization(db, prepared, timestamp);
      const assetResult = db.prepare(`
        INSERT INTO organization_assets
          (organization_id, mime_type, content, width, height, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        identity.id,
        prepared.logo.mimeType,
        prepared.logo.bytes,
        prepared.logo.width,
        prepared.logo.height,
        timestamp,
      );
      const logoAssetId = Number(assetResult.lastInsertRowid);
      db.prepare(`
        UPDATE organizations SET logo_asset_id = ?, updated_at = ? WHERE id = ?
      `).run(logoAssetId, timestamp, identity.id);
      db.prepare(`
        INSERT INTO departments (organization_id, name, created_at) VALUES (?, ?, ?)
      `).run(identity.id, DEFAULT_ADMIN_DEPARTMENT, timestamp);
      db.prepare(`
        INSERT INTO workspace_settings
          (organization_id, time_unassigned_hours, time_assigned_unmarked_hours)
        VALUES (?, 1, 24)
      `).run(identity.id);
      const userResult = db.prepare(`
        INSERT INTO users
          (organization_id, email, name, initials, department, role, password_hash,
           registration_status, mailbox_provider)
        VALUES (?, ?, ?, ?, ?, 'admin', ?, 'active', ?)
      `).run(
        identity.id,
        prepared.email,
        prepared.name,
        initialsFor(prepared.name),
        DEFAULT_ADMIN_DEPARTMENT,
        passwordHash,
        prepared.mailboxProvider,
      );
      const userId = Number(userResult.lastInsertRowid);
      const session = createSession(db, userId, now);
      const organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(identity.id);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return {
        organization: { ...publicOrganization(organization), joinCode: organization.join_code },
        user: publicUser(user),
        session,
      };
    });
  } catch (error) {
    if (isUniqueConstraint(error) && /users\.email/iu.test(String(error.message))) {
      throw domainError('REGISTRATION_UNAVAILABLE', 'Registration could not be completed.', 409);
    }
    throw error;
  }
}

export function lookupOrganization({ db, key }) {
  if (typeof key !== 'string') return null;
  const normalized = key.normalize('NFKC').trim();
  if (!normalized || normalized.length > 80 || /[\u0000-\u001f\u007f]/u.test(normalized)) return null;
  const row = db.prepare(`
    SELECT id, name, handle, normalized_domain, logo_asset_id
    FROM organizations
    WHERE handle = ? COLLATE NOCASE OR join_code = ? COLLATE NOCASE
    LIMIT 1
  `).get(normalized, normalized);
  return row ? publicOrganization(row) : null;
}

function requestInput(input) {
  const email = normalizeEmail(input?.email);
  return {
    organizationKey: normalizeText(
      input?.organizationKey ?? input?.organizationHandle ?? input?.organizationJoinCode,
      'organizationKey',
      'Organization handle or join code',
      80,
    ),
    email,
    mailboxProvider: providerForEmail(email, input?.mailboxProvider),
  };
}

function normalizeSourceAddress(value) {
  const source = String(value ?? '').normalize('NFKC').trim();
  if (!source || source.length > 128 || /[\u0000-\u001f\u007f\s]/u.test(source)) return 'unknown';
  return source;
}

export function submitJoinRequest({ db, input, sourceAddress, now = new Date() }) {
  const prepared = requestInput(input);
  const source = normalizeSourceAddress(sourceAddress);
  const timestamp = dateValue(now).toISOString();
  const windowStart = new Date(now.getTime() - JOIN_ATTEMPT_WINDOW_MS).toISOString();
  immediateTransaction(db, () => {
    const attempts = Number(db.prepare(`
      SELECT count(*) AS count
      FROM join_request_attempts
      WHERE email = ? COLLATE NOCASE AND source_address = ? AND attempted_at > ?
    `).get(prepared.email, source, windowStart).count);
    if (attempts >= JOIN_ATTEMPT_LIMIT) {
      throw domainError('RATE_LIMITED', 'Please wait before submitting another request.', 429);
    }
    db.prepare(`
      INSERT INTO join_request_attempts (email, source_address, attempted_at)
      VALUES (?, ?, ?)
    `).run(prepared.email, source, timestamp);
  });
  try {
    return immediateTransaction(db, () => {
      const organization = db.prepare(`
        SELECT id FROM organizations
        WHERE handle = ? COLLATE NOCASE OR join_code = ? COLLATE NOCASE
        LIMIT 1
      `).get(prepared.organizationKey, prepared.organizationKey);
      if (!organization) {
        throw domainError('ORGANIZATION_NOT_FOUND', 'Organization not found.', 404);
      }
      if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(prepared.email)) {
        throw domainError('JOIN_REQUEST_UNAVAILABLE', 'The membership request could not be submitted.', 409);
      }
      const existing = db.prepare(`
        SELECT id
        FROM join_requests
        WHERE organization_id = ? AND email = ? COLLATE NOCASE AND status = 'pending'
      `).get(organization.id, prepared.email);
      if (existing) {
        throw domainError('JOIN_REQUEST_EXISTS', 'A membership request is already pending.', 409);
      }
      const activeInvite = db.prepare(`
        SELECT registration_invites.id
        FROM registration_invites
        JOIN join_requests ON join_requests.id = registration_invites.join_request_id
        WHERE join_requests.organization_id = ?
          AND join_requests.email = ? COLLATE NOCASE
          AND join_requests.status = 'approved'
          AND registration_invites.consumed_at IS NULL
          AND registration_invites.expires_at > ?
        LIMIT 1
      `).get(organization.id, prepared.email, timestamp);
      if (activeInvite) {
        throw domainError('JOIN_REQUEST_EXISTS', 'A membership request is already pending.', 409);
      }
      const result = db.prepare(`
        INSERT INTO join_requests
          (organization_id, email, mailbox_provider, status, source_address,
           decided_by, decided_at, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, NULL, NULL, ?, ?)
      `).run(
        organization.id,
        prepared.email,
        prepared.mailboxProvider,
        source,
        timestamp,
        timestamp,
      );
      const row = db.prepare('SELECT * FROM join_requests WHERE id = ?').get(result.lastInsertRowid);
      return joinRequestView(row);
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw domainError('JOIN_REQUEST_EXISTS', 'A membership request is already pending.', 409);
    }
    throw error;
  }
}

export function listJoinRequests({ db, organizationId }) {
  if (!Number.isSafeInteger(Number(organizationId)) || Number(organizationId) < 1) return [];
  return db.prepare(`
    SELECT join_requests.*, registration_invites.expires_at AS invite_expires_at
    FROM join_requests
    LEFT JOIN registration_invites
      ON registration_invites.join_request_id = join_requests.id
      AND registration_invites.consumed_at IS NULL
    WHERE join_requests.organization_id = ?
      AND join_requests.status IN ('pending', 'approved')
    ORDER BY join_requests.created_at ASC, join_requests.id ASC
  `).all(Number(organizationId)).map(joinRequestView);
}

function requireAdmin(db, organizationId, adminId) {
  return db.prepare(`
    SELECT id
    FROM users
    WHERE id = ? AND organization_id = ? AND role = 'admin' AND registration_status = 'active'
  `).get(adminId, organizationId);
}

function inviteDigest(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function inviteToken(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    throw domainError('INVITE_INVALID', 'This registration invitation is invalid or expired.', 404);
  }
  return value;
}

function inviteUrl(appBaseUrl, token) {
  let base;
  try {
    base = new URL(appBaseUrl);
  } catch {
    throw new TypeError('appBaseUrl must be a valid absolute URL');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (
    !['http:', 'https:'].includes(base.protocol)
    || (base.protocol === 'http:' && !loopback)
    || base.username
    || base.password
    || base.search
    || base.hash
    || (base.pathname !== '' && base.pathname !== '/')
  ) {
    throw new TypeError('appBaseUrl must be a public application origin');
  }
  const url = new URL('/', base.origin);
  url.searchParams.set('invite', token);
  return url.toString();
}

function issueInvite(db, requestId, appBaseUrl, now) {
  const token = randomBytes(32).toString('base64url');
  const timestamp = now.toISOString();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  db.prepare(`
    INSERT INTO registration_invites
      (join_request_id, token_digest, expires_at, consumed_at, created_at)
    VALUES (?, ?, ?, NULL, ?)
  `).run(requestId, inviteDigest(token), expiresAt, timestamp);
  return { inviteLink: inviteUrl(appBaseUrl, token), expiresAt };
}

export function decideJoinRequest({
  db,
  organizationId,
  adminId,
  requestId,
  decision,
  appBaseUrl,
  now = new Date(),
}) {
  const organizationKey = Number(organizationId);
  const adminKey = Number(adminId);
  const requestKey = Number(requestId);
  if (
    !Number.isSafeInteger(organizationKey) || organizationKey < 1
    || !Number.isSafeInteger(adminKey) || adminKey < 1
    || !Number.isSafeInteger(requestKey) || requestKey < 1
  ) throw domainError('JOIN_REQUEST_NOT_FOUND', 'Membership request not found.', 404);
  const normalizedDecision = String(decision ?? '').trim().toLocaleLowerCase('en-US');
  if (!['approve', 'reject'].includes(normalizedDecision)) {
    throw invalid('decision', 'Decision must be approve or reject.');
  }
  const timestamp = dateValue(now).toISOString();
  return immediateTransaction(db, () => {
    if (!requireAdmin(db, organizationKey, adminKey)) {
      throw domainError('JOIN_REQUEST_NOT_FOUND', 'Membership request not found.', 404);
    }
    const request = db.prepare(`
      SELECT * FROM join_requests
      WHERE id = ? AND organization_id = ? AND status = 'pending'
    `).get(requestKey, organizationKey);
    if (!request) throw domainError('JOIN_REQUEST_NOT_FOUND', 'Membership request not found.', 404);

    if (normalizedDecision === 'reject') {
      db.prepare(`
        UPDATE join_requests
        SET status = 'rejected', decided_by = ?, decided_at = ?, updated_at = ?
        WHERE id = ? AND organization_id = ? AND status = 'pending'
      `).run(adminKey, timestamp, timestamp, requestKey, organizationKey);
      return {
        request: joinRequestView(db.prepare('SELECT * FROM join_requests WHERE id = ?').get(requestKey)),
      };
    }

    if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(request.email)) {
      throw domainError('JOIN_REQUEST_UNAVAILABLE', 'This request can no longer be approved.', 409);
    }
    db.prepare(`
      UPDATE join_requests
      SET status = 'approved', decided_by = ?, decided_at = ?, updated_at = ?
      WHERE id = ? AND organization_id = ? AND status = 'pending'
    `).run(adminKey, timestamp, timestamp, requestKey, organizationKey);
    const issued = issueInvite(db, requestKey, appBaseUrl, now);
    return {
      request: joinRequestView({
        ...db.prepare('SELECT * FROM join_requests WHERE id = ?').get(requestKey),
        invite_expires_at: issued.expiresAt,
      }),
      inviteLink: issued.inviteLink,
    };
  });
}

export function replaceJoinRequestInvite({
  db,
  organizationId,
  adminId,
  requestId,
  appBaseUrl,
  now = new Date(),
}) {
  const organizationKey = Number(organizationId);
  const adminKey = Number(adminId);
  const requestKey = Number(requestId);
  if (
    !Number.isSafeInteger(organizationKey) || organizationKey < 1
    || !Number.isSafeInteger(adminKey) || adminKey < 1
    || !Number.isSafeInteger(requestKey) || requestKey < 1
  ) throw domainError('JOIN_REQUEST_NOT_FOUND', 'Membership request not found.', 404);
  dateValue(now);

  return immediateTransaction(db, () => {
    if (!requireAdmin(db, organizationKey, adminKey)) {
      throw domainError('JOIN_REQUEST_NOT_FOUND', 'Membership request not found.', 404);
    }
    const request = db.prepare(`
      SELECT * FROM join_requests
      WHERE id = ? AND organization_id = ? AND status = 'approved'
    `).get(requestKey, organizationKey);
    if (!request || db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(request.email)) {
      throw domainError('JOIN_REQUEST_NOT_FOUND', 'Membership request not found.', 404);
    }

    db.prepare('DELETE FROM registration_invites WHERE join_request_id = ?').run(requestKey);
    const issued = issueInvite(db, requestKey, appBaseUrl, now);
    db.prepare('UPDATE join_requests SET updated_at = ? WHERE id = ?')
      .run(now.toISOString(), requestKey);
    return {
      request: joinRequestView({
        ...db.prepare('SELECT * FROM join_requests WHERE id = ?').get(requestKey),
        invite_expires_at: issued.expiresAt,
      }),
      inviteLink: issued.inviteLink,
    };
  });
}

function activeInviteRow(db, token, now) {
  return db.prepare(`
    SELECT
      registration_invites.id AS invite_id,
      registration_invites.expires_at,
      join_requests.id AS request_id,
      join_requests.email,
      join_requests.mailbox_provider,
      join_requests.organization_id,
      organizations.name AS organization_name,
      organizations.handle AS organization_handle,
      organizations.normalized_domain,
      organizations.logo_asset_id
    FROM registration_invites
    JOIN join_requests ON join_requests.id = registration_invites.join_request_id
    JOIN organizations ON organizations.id = join_requests.organization_id
    WHERE registration_invites.token_digest = ?
      AND registration_invites.consumed_at IS NULL
      AND registration_invites.expires_at > ?
      AND join_requests.status = 'approved'
      AND NOT EXISTS (SELECT 1 FROM users WHERE users.email = join_requests.email COLLATE NOCASE)
    LIMIT 1
  `).get(inviteDigest(inviteToken(token)), dateValue(now).toISOString());
}

function inviteView(row) {
  return {
    email: row.email,
    mailboxProvider: row.mailbox_provider,
    role: 'member',
    organization: {
      id: Number(row.organization_id),
      name: row.organization_name,
      handle: row.organization_handle,
      domain: row.normalized_domain,
      logoAssetId: row.logo_asset_id == null ? null : Number(row.logo_asset_id),
    },
    expiresAt: row.expires_at,
  };
}

export function inspectInvite({ db, token, now = new Date() }) {
  const row = activeInviteRow(db, token, now);
  if (!row) throw domainError('INVITE_INVALID', 'This registration invitation is invalid or expired.', 404);
  return inviteView(row);
}

function completionInput(input) {
  return {
    name: normalizeText(input?.name, 'name', 'Name'),
    password: normalizePassword(input?.password),
  };
}

export async function completeInvite({ db, token, input, now = new Date() }) {
  const normalizedToken = inviteToken(token);
  const prepared = completionInput(input);
  dateValue(now);
  if (!activeInviteRow(db, normalizedToken, now)) {
    throw domainError('INVITE_INVALID', 'This registration invitation is invalid or expired.', 404);
  }
  const passwordHash = await hashPassword(prepared.password);
  const timestamp = now.toISOString();
  try {
    return immediateTransaction(db, () => {
      const invite = activeInviteRow(db, normalizedToken, now);
      if (!invite) throw domainError('INVITE_INVALID', 'This registration invitation is invalid or expired.', 404);
      db.prepare(`
        INSERT OR IGNORE INTO departments (organization_id, name, created_at)
        VALUES (?, ?, ?)
      `).run(invite.organization_id, DEFAULT_MEMBER_DEPARTMENT, timestamp);
      const result = db.prepare(`
        INSERT INTO users
          (organization_id, email, name, initials, department, role, password_hash,
           registration_status, mailbox_provider)
        VALUES (?, ?, ?, ?, ?, 'member', ?, 'active', ?)
      `).run(
        invite.organization_id,
        invite.email,
        prepared.name,
        initialsFor(prepared.name),
        DEFAULT_MEMBER_DEPARTMENT,
        passwordHash,
        invite.mailbox_provider,
      );
      const consumed = db.prepare(`
        UPDATE registration_invites
        SET consumed_at = ?
        WHERE id = ? AND consumed_at IS NULL AND expires_at > ?
      `).run(timestamp, invite.invite_id, timestamp);
      if (Number(consumed.changes) !== 1) {
        throw domainError('INVITE_INVALID', 'This registration invitation is invalid or expired.', 404);
      }
      db.prepare(`
        UPDATE join_requests SET status = 'completed', updated_at = ?
        WHERE id = ? AND status = 'approved'
      `).run(timestamp, invite.request_id);
      const userId = Number(result.lastInsertRowid);
      const session = createSession(db, userId, now);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return { user: publicUser(user), session };
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw domainError('INVITE_INVALID', 'This registration invitation is invalid or expired.', 404);
    }
    throw error;
  }
}

export const ORGANIZATION_REGISTRATION_LIMITS = Object.freeze({
  passwordMinimumLength: PASSWORD_MIN_LENGTH,
  inviteTtlMilliseconds: INVITE_TTL_MS,
  joinAttemptWindowMilliseconds: JOIN_ATTEMPT_WINDOW_MS,
  joinAttemptLimit: JOIN_ATTEMPT_LIMIT,
});
