import { createHash } from 'node:crypto';
import { domainToASCII } from 'node:url';
import { effectiveWorkspaceRole, headedDepartment, replacementRequired } from './department-access.js';
import {
  ensureMetricsCompleteness,
  normalizeTimezone,
  recordTenantLifecycle,
  recordUserLifecycle,
} from './reporting-events.js';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function error(status, code, message, field) {
  const result = new Error(message);
  result.status = status;
  result.code = code;
  result.expose = true;
  if (field) result.field = field;
  return result;
}

function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (cause) {
    db.exec('ROLLBACK');
    throw cause;
  }
}

export function normalizeDomain(value) {
  if (typeof value !== 'string') throw error(400, 'INVALID_INPUT', 'Enter a valid organization domain.', 'domain');
  const candidate = value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\.$/u, '');
  const ascii = domainToASCII(candidate);
  const labels = ascii.split('.');
  if (!ascii || ascii.length > 253 || labels.length < 2 || labels.some(label => (
    label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label)
  ))) throw error(400, 'INVALID_INPUT', 'Enter a valid organization domain.', 'domain');
  return ascii;
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw error(400, 'INVALID_INPUT', 'Enter a valid email address.', 'email');
  const candidate = value.normalize('NFKC').trim().toLocaleLowerCase();
  const at = candidate.lastIndexOf('@');
  if (at < 1 || at !== candidate.indexOf('@') || at > 64 || candidate.length > 254) {
    throw error(400, 'INVALID_INPUT', 'Enter a valid email address.', 'email');
  }
  const local = candidate.slice(0, at);
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..') || /[\s"(),:;<>[\]\\]/u.test(local)) {
    throw error(400, 'INVALID_INPUT', 'Enter a valid email address.', 'email');
  }
  return `${local}@${normalizeDomain(candidate.slice(at + 1))}`;
}

export function normalizeTenantId(value) {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!UUID.test(candidate)) throw error(400, 'INVALID_INPUT', 'Enter a valid Microsoft Entra tenant ID.', 'entraTenantId');
  return candidate;
}

function text(value, field, label, maximum = 120) {
  if (typeof value !== 'string') throw error(400, 'INVALID_INPUT', `${label} is required.`, field);
  const result = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (!result || result.length > maximum || /[\u0000-\u001f\u007f]/u.test(result)) {
    throw error(400, 'INVALID_INPUT', `${label} must be ${maximum} characters or fewer.`, field);
  }
  return result;
}

function initials(name) {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function logoDimensions(bytes, mimeType) {
  if (mimeType === 'image/png' && bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (mimeType === 'image/jpeg' && bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) {
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  if (mimeType === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.toString('ascii', 12, 16) === 'VP8X') {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }
  return null;
}

export function parseLogo(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw error(400, 'INVALID_INPUT', 'Logo must be a base64 data URL.', 'logo');
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/u);
  if (!match) throw error(400, 'INVALID_INPUT', 'Logo must be a PNG, JPEG, or WebP image.', 'logo');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) throw error(400, 'INVALID_INPUT', 'Logo must be 2 MiB or smaller.', 'logo');
  const dimensions = logoDimensions(bytes, match[1]);
  if (!dimensions || dimensions.width < 64 || dimensions.height < 64 || dimensions.width > 2048 || dimensions.height > 2048) {
    throw error(400, 'INVALID_INPUT', 'Logo dimensions must be between 64 and 2,048 pixels.', 'logo');
  }
  return { mimeType: match[1], bytes, ...dimensions };
}

export function organizationPayload(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    entraTenantId: row.entra_tenant_id ?? null,
    name: row.name,
    domain: row.domain,
    status: row.status,
    timezone: row.timezone ?? 'UTC',
    logoUrl: row.logo_asset_id ? `/api/organization-logos/${row.logo_asset_id}` : null,
    initialAdminEmail: row.initial_admin_email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function organizationRow(db, organizationId) {
  return db.prepare(`
    SELECT o.*, admin.email AS initial_admin_email
    FROM organizations o
    LEFT JOIN users admin
      ON admin.organization_id = o.id AND admin.role = 'admin' AND admin.is_platform_admin = 0
    WHERE o.id = ?
    ORDER BY admin.id
    LIMIT 1
  `).get(organizationId);
}

function userPayload(row) {
  return {
    id: Number(row.id),
    organizationId: row.organization_id == null ? null : Number(row.organization_id),
    departmentId: row.department_id == null ? null : Number(row.department_id),
    email: row.email,
    name: row.name,
    initials: row.initials,
    department: row.department,
    role: effectiveWorkspaceRole(row, row.headed_department_id ? { id: row.headed_department_id } : null),
    status: row.account_status ?? 'active',
  };
}

function memberRow(db, memberId, organizationId = null) {
  return db.prepare(`
    SELECT users.*, departments.id AS headed_department_id
    FROM users
    LEFT JOIN departments
      ON departments.head_user_id = users.id
      AND departments.organization_id = users.organization_id
    WHERE users.id = ?
      AND (? IS NULL OR users.organization_id = ?)
    LIMIT 1
  `).get(memberId, organizationId, organizationId);
}

function preparedOrganization(input) {
  const name = text(input?.name, 'name', 'Organization name');
  const domain = normalizeDomain(input?.domain);
  const entraTenantId = normalizeTenantId(input?.entraTenantId);
  const initialAdminEmail = normalizeEmail(input?.initialAdminEmail);
  const timezone = input?.timezone == null ? 'UTC' : normalizeTimezone(input.timezone);
  if (initialAdminEmail.split('@')[1] !== domain) {
    throw error(400, 'INVALID_INPUT', 'Initial administrator email must use the organization domain.', 'initialAdminEmail');
  }
  return { name, domain, entraTenantId, initialAdminEmail, timezone, logo: parseLogo(input?.logo) };
}

export function createOrganization({ db, input, now = new Date(), actorId = null }) {
  const prepared = preparedOrganization(input);
  const timestamp = now.toISOString();
  return transaction(db, () => {
    let organizationId;
    try {
      const result = db.prepare(`
        INSERT INTO organizations
          (entra_tenant_id, name, domain, status, timezone, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?)
      `).run(
        prepared.entraTenantId,
        prepared.name,
        prepared.domain,
        prepared.timezone,
        timestamp,
        timestamp,
      );
      organizationId = Number(result.lastInsertRowid);
    } catch (cause) {
      if (String(cause.message).includes('UNIQUE constraint failed')) throw error(409, 'TENANT_EXISTS', 'That Entra tenant is already configured.');
      throw cause;
    }
    let logoAssetId = null;
    if (prepared.logo) {
      logoAssetId = Number(db.prepare(`
        INSERT INTO organization_assets (organization_id, mime_type, content, width, height, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(organizationId, prepared.logo.mimeType, prepared.logo.bytes, prepared.logo.width, prepared.logo.height, timestamp).lastInsertRowid);
      db.prepare('UPDATE organizations SET logo_asset_id = ? WHERE id = ?').run(logoAssetId, organizationId);
    }
    db.prepare(`
      INSERT INTO workspace_settings (id, time_unassigned_hours, time_assigned_unmarked_hours, organization_id)
      VALUES (?, 1, 24, ?)
    `).run(organizationId, organizationId);
    const adminResult = db.prepare(`
      INSERT INTO users
        (email, name, initials, department, role, organization_id, auth_provider,
         entra_tenant_id, entra_object_id, account_status)
      VALUES (?, ?, ?, '', 'admin', ?, 'entra', ?, NULL, 'pending')
    `).run(prepared.initialAdminEmail, prepared.initialAdminEmail.split('@')[0], initials(prepared.initialAdminEmail.split('@')[0]), organizationId, prepared.entraTenantId);
    const adminId = Number(adminResult.lastInsertRowid);
    recordTenantLifecycle(db, {
      organizationId,
      actorId,
      eventType: 'created',
      organizationName: prepared.name,
      domainSnapshot: prepared.domain,
      occurredAt: timestamp,
    });
    recordUserLifecycle(db, {
      organizationId,
      userId: adminId,
      actorId,
      eventType: 'added',
      roleAfter: 'org_admin',
      userNameSnapshot: prepared.initialAdminEmail.split('@')[0],
      occurredAt: timestamp,
    });
    ensureMetricsCompleteness(db, {
      organizationId,
      exactFrom: timestamp,
      backfilledAt: timestamp,
    });
    return getOrganization(db, organizationId);
  });
}

export function listOrganizations(db) {
  return db.prepare(`
    SELECT o.*, admin.email AS initial_admin_email
    FROM organizations o
    LEFT JOIN users admin
      ON admin.organization_id = o.id AND admin.role = 'admin' AND admin.is_platform_admin = 0
    WHERE o.id <> 1
    GROUP BY o.id
    ORDER BY o.name COLLATE NOCASE
  `).all().map(organizationPayload);
}

export function getOrganization(db, organizationId) {
  return organizationPayload(organizationRow(db, organizationId));
}

export function updateOrganization({ db, organizationId, input, now = new Date(), updateAdmin = true }) {
  const current = db.prepare('SELECT * FROM organizations WHERE id = ?').get(organizationId);
  if (!current || Number(current.id) === 1) throw error(404, 'NOT_FOUND', 'Organization not found.');
  const name = text(input?.name, 'name', 'Organization name');
  const domain = normalizeDomain(input?.domain);
  const timezone = input?.timezone === undefined
    ? (current.timezone ?? 'UTC')
    : normalizeTimezone(input.timezone);
  const initialAdminEmail = updateAdmin ? normalizeEmail(input?.initialAdminEmail) : null;
  if (updateAdmin && initialAdminEmail.split('@')[1] !== domain) {
    throw error(400, 'INVALID_INPUT', 'Initial administrator email must use the organization domain.', 'initialAdminEmail');
  }
  const logo = parseLogo(input?.logo);
  const logoProvided = Object.prototype.hasOwnProperty.call(input ?? {}, 'logo');
  const timestamp = now.toISOString();
  let adminEmailChanged = false;
  return transaction(db, () => {
    let logoAssetId = logoProvided ? null : current.logo_asset_id;
    if (logo) {
      logoAssetId = Number(db.prepare(`
        INSERT INTO organization_assets (organization_id, mime_type, content, width, height, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(organizationId, logo.mimeType, logo.bytes, logo.width, logo.height, timestamp).lastInsertRowid);
    }
    if (updateAdmin) {
      const admin = db.prepare(`
        SELECT id, email, entra_object_id FROM users
        WHERE organization_id = ? AND role = 'admin' AND is_platform_admin = 0
        ORDER BY id
        LIMIT 1
      `).get(organizationId);
      if (!admin) throw error(409, 'ORG_ADMIN_MISSING', 'This organization has no OrgAdmin membership to update.');
      const emailChanged = initialAdminEmail !== normalizeEmail(admin.email);
      adminEmailChanged = emailChanged;
      try {
        db.prepare(`
          UPDATE users
          SET email = ?,
              name = CASE WHEN ? THEN ? ELSE name END,
              initials = CASE WHEN ? THEN ? ELSE initials END,
              entra_tenant_id = ?,
              entra_object_id = CASE WHEN ? THEN NULL ELSE entra_object_id END,
              account_status = CASE WHEN ? THEN 'pending' ELSE account_status END
          WHERE id = ?
        `).run(
          initialAdminEmail,
          emailChanged ? 1 : 0,
          initialAdminEmail.split('@')[0],
          emailChanged ? 1 : 0,
          initials(initialAdminEmail.split('@')[0]),
          current.entra_tenant_id,
          emailChanged ? 1 : 0,
          emailChanged ? 1 : 0,
          admin.id,
        );
      } catch (cause) {
        if (String(cause.message).includes('UNIQUE constraint failed')) {
          throw error(409, 'IDENTITY_EXISTS', 'That email or Entra identity is already assigned to another user.');
        }
        throw cause;
      }
    }
    db.prepare('UPDATE organizations SET name = ?, domain = ?, timezone = ?, logo_asset_id = ?, updated_at = ? WHERE id = ?')
      .run(name, domain, timezone, logoAssetId, timestamp, organizationId);
    if (domain !== current.domain || adminEmailChanged) {
      db.prepare('DELETE FROM sessions WHERE organization_id = ?').run(organizationId);
    }
    return getOrganization(db, organizationId);
  });
}

export function setOrganizationStatus({ db, organizationId, status, now = new Date(), actorId = null }) {
  if (!['active', 'archived'].includes(status)) throw error(400, 'INVALID_INPUT', 'Invalid organization status.');
  const result = transaction(db, () => {
    const current = db.prepare('SELECT * FROM organizations WHERE id = ? AND id <> 1').get(organizationId);
    if (!current) throw error(404, 'NOT_FOUND', 'Organization not found.');
    if (current.status === status) return getOrganization(db, organizationId);
    const occurredAt = now.toISOString();
    db.prepare('UPDATE organizations SET status = ?, updated_at = ? WHERE id = ?').run(status, occurredAt, organizationId);
    recordTenantLifecycle(db, {
      organizationId,
      actorId,
      eventType: status === 'archived' ? 'archived' : 'restored',
      organizationName: current.name,
      domainSnapshot: current.domain,
      occurredAt,
    });
    if (status === 'archived') db.prepare('DELETE FROM sessions WHERE organization_id = ?').run(organizationId);
    return getOrganization(db, organizationId);
  });
  return result;
}

export function getLogo({ db, assetId }) {
  return db.prepare('SELECT mime_type, content, width, height FROM organization_assets WHERE id = ?').get(assetId);
}

export function listMembers(db, organizationId) {
  return db.prepare(`
    SELECT users.*, departments.id AS headed_department_id
    FROM users
    LEFT JOIN departments
      ON departments.head_user_id = users.id
      AND departments.organization_id = users.organization_id
    WHERE users.organization_id = ? AND users.is_platform_admin = 0
    ORDER BY users.name COLLATE NOCASE, users.id
  `).all(organizationId).map(userPayload);
}

export function createMember({ db, organizationId, input, actorId = null, now = new Date() }) {
  const email = normalizeEmail(input?.email);
  const organization = db.prepare('SELECT domain, entra_tenant_id FROM organizations WHERE id = ? AND status = \'active\'').get(organizationId);
  if (!organization) throw error(404, 'NOT_FOUND', 'Organization not found.');
  if (email.split('@')[1] !== organization.domain) throw error(400, 'INVALID_INPUT', 'Member email must use the organization domain.', 'email');
  if (input?.role !== undefined && !['member', 'org_admin'].includes(input.role)) {
    throw error(400, 'INVALID_INPUT', 'Invalid member role.', 'role');
  }
  const role = input?.role === 'org_admin' ? 'admin' : 'member';
  return transaction(db, () => {
    try {
      const result = db.prepare(`
        INSERT INTO users
          (email, name, initials, department, role, organization_id, auth_provider,
           entra_tenant_id, entra_object_id, account_status)
        VALUES (?, ?, ?, '', ?, ?, 'entra', ?, NULL, 'pending')
      `).run(email, email.split('@')[0], initials(email.split('@')[0]), role, organizationId, organization.entra_tenant_id);
      const memberId = Number(result.lastInsertRowid);
      recordUserLifecycle(db, {
        organizationId,
        userId: memberId,
        actorId,
        eventType: 'added',
        roleAfter: role === 'admin' ? 'org_admin' : 'member',
        userNameSnapshot: email.split('@')[0],
        occurredAt: now,
      });
      return userPayload(memberRow(db, memberId, organizationId));
    } catch (cause) {
      if (String(cause.message).includes('UNIQUE constraint failed')) throw error(409, 'MEMBER_EXISTS', 'That member already exists.');
      throw cause;
    }
  });
}

export function updateMember({ db, organizationId, memberId, input, actorId = null, now = new Date() }) {
  const member = memberRow(db, memberId, organizationId);
  if (member?.is_platform_admin) throw error(404, 'NOT_FOUND', 'Member not found.');
  if (!member) throw error(404, 'NOT_FOUND', 'Member not found.');
  const organization = db.prepare('SELECT domain, entra_tenant_id FROM organizations WHERE id = ? AND status = \'active\'').get(organizationId);
  if (!organization) throw error(404, 'NOT_FOUND', 'Organization not found.');
  const nextEmail = input?.email === undefined ? member.email : normalizeEmail(input.email);
  if (nextEmail.split('@')[1] !== organization.domain) throw error(400, 'INVALID_INPUT', 'Member email must use the organization domain.', 'email');
  const nextRole = input?.role === undefined ? member.role : input.role === 'org_admin' ? 'admin' : input.role === 'member' ? 'member' : null;
  const nextStatus = input?.status === undefined ? member.account_status : input.status;
  if (!nextRole || !['pending', 'active', 'disabled'].includes(nextStatus)) throw error(400, 'INVALID_INPUT', 'Invalid member update.');
  if (member.role === 'admin' && (nextRole !== 'admin' || nextStatus !== 'active')) {
    const activeAdmins = db.prepare(`SELECT count(*) AS count FROM users WHERE organization_id = ? AND role = 'admin' AND account_status = 'active'`).get(organizationId).count;
    if (Number(activeAdmins) <= 1) throw error(409, 'LAST_ADMIN', 'The last active organization administrator cannot be disabled or demoted.');
  }
  if (member.headed_department_id && (nextRole !== 'member' || nextStatus === 'disabled')) {
    throw replacementRequired();
  }
  if (member.role === 'member' && nextRole === 'admin') {
    const hasEmailWork = db.prepare(`
      SELECT 1 FROM emails
      WHERE organization_id = ? AND assignee_id = ? AND status = 'assigned'
      UNION ALL
      SELECT 1 FROM rules
      WHERE organization_id = ? AND assignee_id = ? AND enabled = 1
      LIMIT 1
    `).get(organizationId, memberId, organizationId, memberId);
    if (hasEmailWork) {
      throw error(
        409,
        'MEMBER_HAS_EMAIL_WORK',
        'Reassign this member\'s open email and enabled rules before promoting them to OrgAdmin.',
      );
    }
  }
  const occurredAt = now.toISOString();
  transaction(db, () => {
    try {
      db.prepare(`
        UPDATE users
        SET email = ?, role = ?, account_status = ?, entra_tenant_id = ?, entra_object_id = ?,
          department = CASE WHEN ? = 'admin' THEN '' ELSE department END,
          department_id = CASE WHEN ? = 'admin' THEN NULL ELSE department_id END
        WHERE id = ? AND organization_id = ?
      `).run(
        nextEmail,
        nextRole,
        nextStatus,
        organization.entra_tenant_id,
        member.entra_object_id,
        nextRole,
        nextRole,
        memberId,
        organizationId,
      );
    } catch (cause) {
      if (String(cause.message).includes('UNIQUE constraint failed')) throw error(409, 'MEMBER_EXISTS', 'That member already exists.');
      throw cause;
    }
    const roleBefore = member.role === 'admin' ? 'org_admin' : 'member';
    const roleAfter = nextRole === 'admin' ? 'org_admin' : 'member';
    const departmentAfter = nextRole === 'admin' ? null : member.department;
    const departmentIdAfter = nextRole === 'admin' ? null : member.department_id;
    if (member.account_status !== 'disabled' && nextStatus === 'disabled') {
      recordUserLifecycle(db, {
        organizationId,
        userId: memberId,
        actorId,
        eventType: 'disabled',
        departmentIdBefore: member.department_id,
        departmentIdAfter,
        departmentNameBefore: member.department || null,
        departmentNameAfter: departmentAfter || null,
        roleBefore,
        roleAfter,
        userNameSnapshot: member.name,
        occurredAt,
      });
    } else if (member.account_status === 'disabled' && nextStatus !== 'disabled') {
      recordUserLifecycle(db, {
        organizationId,
        userId: memberId,
        actorId,
        eventType: 'reactivated',
        departmentIdBefore: member.department_id,
        departmentIdAfter,
        departmentNameBefore: member.department || null,
        departmentNameAfter: departmentAfter || null,
        roleBefore,
        roleAfter,
        userNameSnapshot: member.name,
        occurredAt,
      });
    }
    if (member.role !== nextRole) {
      recordUserLifecycle(db, {
        organizationId,
        userId: memberId,
        actorId,
        eventType: 'role_changed',
        departmentIdBefore: member.department_id,
        departmentIdAfter,
        departmentNameBefore: member.department || null,
        departmentNameAfter: departmentAfter || null,
        roleBefore,
        roleAfter,
        userNameSnapshot: member.name,
        occurredAt,
      });
    }
    if (nextStatus !== 'active') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(memberId);
  });
  return userPayload(memberRow(db, memberId, organizationId));
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function createAuthTransaction({ db, state, nonce, codeVerifier, redirectPath = '/', expiresAt }) {
  db.prepare(`
    INSERT INTO auth_transactions (state_digest, nonce_digest, nonce, code_verifier, redirect_path, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(digest(state), digest(nonce), nonce, codeVerifier, redirectPath, expiresAt);
}

export function consumeAuthTransaction({ db, state, now = new Date() }) {
  const row = db.prepare('SELECT * FROM auth_transactions WHERE state_digest = ?').get(digest(state));
  if (!row || row.expires_at <= now.toISOString()) {
    if (row) db.prepare('DELETE FROM auth_transactions WHERE state_digest = ?').run(digest(state));
    throw error(400, 'INVALID_AUTH_STATE', 'The Microsoft sign-in request is invalid or expired.');
  }
  db.prepare('DELETE FROM auth_transactions WHERE state_digest = ?').run(digest(state));
  return row;
}

export function resolvePrincipal({ db, claims, now = new Date() }) {
  const tenantId = normalizeTenantId(String(claims?.tid ?? ''));
  const objectId = normalizeTenantId(String(claims?.oid ?? ''));
  const email = normalizeEmail(claims?.email ?? claims?.preferred_username ?? '');
  const platformAdmin = Array.isArray(claims?.roles) && claims.roles.includes('PlatformAdmin');
  const organization = db.prepare('SELECT * FROM organizations WHERE entra_tenant_id = ? AND status = \'active\'').get(tenantId);

  if (platformAdmin) {
    const existing = db.prepare('SELECT * FROM users WHERE entra_tenant_id = ? AND entra_object_id = ?').get(tenantId, objectId);
    const user = existing
      ? db.prepare('UPDATE users SET email = ?, name = ?, initials = ?, auth_provider = \'entra\', account_status = \'active\', is_platform_admin = 1, organization_id = NULL WHERE id = ? RETURNING *').get(email, claims.name || email, initials(claims.name || email), existing.id)
      : db.prepare(`
          INSERT INTO users (email, name, initials, department, role, organization_id, auth_provider, entra_tenant_id, entra_object_id, account_status, is_platform_admin)
          VALUES (?, ?, ?, 'Platform', 'admin', NULL, 'entra', ?, ?, 'active', 1)
          RETURNING *
        `).get(email, claims.name || email, initials(claims.name || email), tenantId, objectId);
    return { user, organization: null, role: 'platform_admin' };
  }

  if (!organization || email.split('@')[1] !== organization.domain) throw error(403, 'ORGANIZATION_ACCESS_DENIED', 'Your organization is not enabled for this workspace.');
  let user = db.prepare('SELECT * FROM users WHERE organization_id = ? AND entra_object_id = ?').get(organization.id, objectId);
  if (!user) user = db.prepare('SELECT * FROM users WHERE organization_id = ? AND lower(email) = ?').get(organization.id, email);
  if (!user) throw error(403, 'MEMBERSHIP_REQUIRED', 'Ask your organization administrator to add your account.');
  if (user.account_status === 'disabled') throw error(403, 'ACCOUNT_DISABLED', 'Your LexFlow account is disabled.');
  if (user.entra_object_id && user.entra_object_id !== objectId) {
    throw error(403, 'IDENTITY_MISMATCH', 'This Microsoft identity does not match the pre-provisioned account.');
  }
  db.prepare(`
    UPDATE users SET entra_tenant_id = ?, entra_object_id = ?, email = ?, name = ?, initials = ?, auth_provider = 'entra', account_status = 'active'
    WHERE id = ?
  `).run(tenantId, objectId, email, claims.name || user.name, initials(claims.name || user.name), user.id);
  user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const department = headedDepartment(db, { userId: user.id, organizationId: organization.id });
  return { user, organization, role: effectiveWorkspaceRole(user, department) };
}

export function publicUser(row) {
  return userPayload(row);
}

export function hashClaim(value) {
  return digest(value);
}
