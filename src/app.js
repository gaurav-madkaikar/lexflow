import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import { deriveThreadKey, displayThreadSubject } from './conversations.js';
import { retryUnknownDelivery } from './deliveries.js';
import {
  completeInvite,
  createAdminOrganization,
  decideJoinRequest,
  inspectInvite,
  listJoinRequests,
  lookupOrganization,
  replaceJoinRequestInvite,
  submitJoinRequest,
} from './organizations.js';
import { getOrganizationLogo } from './registration-assets.js';

import {
  createSession,
  deleteSession,
  expiredSessionCookie,
  requireAdmin,
  requireUser,
  sessionCookie,
  sessionIdFromRequest,
  verifyPassword
} from './auth.js';
import {
  applyRuleToUnassigned,
  assignEmailManually,
  completeAssignedEmail,
} from './workflows.js';
import {
  createDepartment,
  getWorkspaceSettings,
  listDepartments,
  moveMemberToDepartment,
  updateWorkspaceSettings,
} from './workspace.js';

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

function safeUser(row) {
  return {
    id: Number(row.id),
    organizationId: Number(row.organization_id),
    email: row.email,
    name: row.name,
    initials: row.initials,
    department: row.department,
    role: row.role,
    mailboxProvider: row.mailbox_provider ?? null,
    registrationStatus: row.registration_status ?? 'active',
  };
}

function deliverySearchUrl(row) {
  if (
    !['accepted', 'unknown'].includes(row.delivery_status)
    || !row.delivery_message_id
    || !row.assignee_email
  ) return null;
  const query = `rfc822msgid:${row.delivery_message_id}`;
  if (row.assignee_mailbox_provider === 'gmail') {
    return `https://mail.google.com/mail/?authuser=${encodeURIComponent(row.assignee_email)}#search/${encodeURIComponent(query)}`;
  }
  if (row.assignee_mailbox_provider === 'outlook') {
    return `https://outlook.office.com/mail/search?q=${encodeURIComponent(row.delivery_message_id)}`;
  }
  return null;
}

function deliveryFromRow(row, role) {
  if (!row.delivery_id) return null;
  return {
    id: Number(row.delivery_id),
    status: row.delivery_status,
    blockReason: row.delivery_block_reason ?? null,
    attemptCount: Number(row.delivery_attempt_count ?? 0),
    acceptedAt: row.delivery_accepted_at ?? null,
    updatedAt: row.delivery_updated_at,
    error: row.delivery_last_error_summary ?? null,
    ...(role === 'member' ? { searchUrl: deliverySearchUrl(row) } : {}),
  };
}

function emailFromRow(row, role = 'admin', deliveryHistory = []) {
  const provider = row.provider || 'outlook';
  const threadKey = row.conversation_public_id || row.thread_key || deriveThreadKey({
    provider,
    mailboxAddress: row.mailbox_address,
    subject: row.subject,
    providerId: row.provider_id,
  });
  return {
    id: Number(row.id),
    subject: row.subject,
    threadKey,
    threadSubject: row.conversation_subject || displayThreadSubject(row.subject),
    conversation: row.conversation_id ? {
      id: Number(row.conversation_id),
      publicId: row.conversation_public_id,
      version: Number(row.conversation_version ?? 1),
      state: row.conversation_completion_state ?? row.status,
    } : null,
    sender: { name: row.sender_name, address: row.sender_address },
    preview: row.preview,
    receivedAt: row.received_at,
    provider,
    mailboxAddress: row.mailbox_address ?? null,
    webUrl: role === 'admin' ? row.outlook_url : null,
    outlookUrl: role === 'admin' ? row.outlook_url : null,
    status: row.status,
    assignedAt: row.assigned_at,
    department: row.assignee_department ?? null,
    assignee: (row.conversation_assignee_id ?? row.assignee_id) ? {
      id: Number(row.conversation_assignee_id ?? row.assignee_id),
      email: row.assignee_email,
      name: row.assignee_name,
      initials: row.assignee_initials,
      department: row.assignee_department,
      mailboxProvider: row.assignee_mailbox_provider ?? null,
    } : null,
    completedBy: row.completed_by ? {
      id: Number(row.completed_by),
      name: row.completed_by_name
    } : null,
    completedAt: row.completed_at,
    delivery: deliveryFromRow(row, role),
    ...(role === 'admin' ? { deliveryHistory } : {}),
  };
}

function adminDeliveryHistory(db, organizationId) {
  const histories = new Map();
  const rows = db.prepare(`
    SELECT deliveries.id, deliveries.conversation_id, deliveries.recipient_id,
           deliveries.status, deliveries.accepted_at, deliveries.updated_at,
           recipients.name AS recipient_name, recipients.email AS recipient_email,
           CASE WHEN deliveries.request_started_at IS NOT NULL
                  OR deliveries.status IN ('accepted', 'unknown')
                  OR EXISTS (
                    SELECT 1 FROM assignment_delivery_attempts AS attempts
                    WHERE attempts.delivery_id = deliveries.id
                      AND attempts.request_started_at IS NOT NULL
                  )
                THEN 1 ELSE 0 END AS externalized
    FROM assignment_deliveries AS deliveries
    JOIN users AS recipients
      ON recipients.organization_id = deliveries.organization_id
     AND recipients.id = deliveries.recipient_id
    WHERE deliveries.organization_id = ?
    ORDER BY deliveries.conversation_id, deliveries.created_at, deliveries.id
  `).all(organizationId);
  for (const row of rows) {
    const conversationId = Number(row.conversation_id);
    const history = histories.get(conversationId) ?? [];
    history.push({
      id: Number(row.id),
      recipient: {
        id: Number(row.recipient_id),
        name: row.recipient_name,
        email: row.recipient_email,
      },
      status: row.status,
      acceptedAt: row.accepted_at ?? null,
      updatedAt: row.updated_at,
      externalized: Number(row.externalized) === 1,
    });
    histories.set(conversationId, history);
  }
  return histories;
}

function listEmails(db, user) {
  const ownership = user.role === 'admin'
    ? ''
    : 'AND coalesce(conversations.current_assignee_id, emails.assignee_id) = ?';
  const statement = db.prepare(`
    SELECT emails.*,
      conversations.public_id AS conversation_public_id,
      conversations.subject AS conversation_subject,
      conversations.version AS conversation_version,
      conversations.completion_state AS conversation_completion_state,
      conversations.current_assignee_id AS conversation_assignee_id,
      assignee.email AS assignee_email,
      assignee.name AS assignee_name,
      assignee.initials AS assignee_initials,
      assignee.department AS assignee_department,
      assignee.mailbox_provider AS assignee_mailbox_provider,
      completed.name AS completed_by_name,
      delivery.id AS delivery_id,
      delivery.status AS delivery_status,
      delivery.block_reason AS delivery_block_reason,
      delivery.attempt_count AS delivery_attempt_count,
      delivery.accepted_at AS delivery_accepted_at,
      delivery.updated_at AS delivery_updated_at,
      delivery.last_error_summary AS delivery_last_error_summary,
      delivery.message_id AS delivery_message_id
    FROM emails
    LEFT JOIN conversations
      ON conversations.id = emails.conversation_id
      AND conversations.organization_id = emails.organization_id
    LEFT JOIN users AS assignee
      ON assignee.id = coalesce(conversations.current_assignee_id, emails.assignee_id)
      AND assignee.organization_id = emails.organization_id
    LEFT JOIN users AS completed
      ON completed.id = emails.completed_by
      AND completed.organization_id = emails.organization_id
    LEFT JOIN assignment_deliveries AS delivery
      ON delivery.organization_id = emails.organization_id
      AND delivery.conversation_id = emails.conversation_id
      AND delivery.recipient_id = coalesce(conversations.current_assignee_id, emails.assignee_id)
    WHERE emails.organization_id = ?
    ${ownership}
    ORDER BY julianday(emails.received_at) DESC, emails.id DESC
  `);
  const rows = user.role === 'admin'
    ? statement.all(user.organization_id)
    : statement.all(user.organization_id, user.id);
  const histories = user.role === 'admin'
    ? adminDeliveryHistory(db, user.organization_id)
    : null;
  return rows.map(row => {
    const history = histories?.get(Number(row.conversation_id)) ?? [];
    const currentRecipientId = row.conversation_assignee_id ?? row.assignee_id;
    return emailFromRow(row, user.role, history.map(delivery => ({
      ...delivery,
      currentRecipient: Number(delivery.recipient.id) === Number(currentRecipientId),
    })));
  });
}

const NOTIFICATION_PAGE_SIZE = 200;

function listNotifications(db, userId, organizationId) {
  return db.prepare(`
    SELECT id, email_id, kind, message, read_at, created_at
    FROM notifications
    WHERE user_id = ? AND organization_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(userId, organizationId, NOTIFICATION_PAGE_SIZE).map(row => ({
    id: Number(row.id),
    emailId: Number(row.email_id),
    kind: row.kind,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  }));
}

function notificationCounts(db, userId, organizationId) {
  const row = db.prepare(`
    SELECT count(*) AS total,
      count(*) FILTER (WHERE read_at IS NULL) AS unread
    FROM notifications
    WHERE user_id = ? AND organization_id = ?
  `).get(userId, organizationId);
  return {
    total: Number(row.total),
    unread: Number(row.unread),
  };
}

function ruleFromRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    keywords: row.keywords,
    senderFilter: row.sender_filter,
    priority: Number(row.priority),
    enabled: Boolean(row.enabled),
    assignee: {
      id: Number(row.assignee_id),
      email: row.assignee_email,
      name: row.assignee_name,
      initials: row.assignee_initials,
      department: row.assignee_department
    }
  };
}

const ruleSelect = `
    SELECT rules.*, users.email AS assignee_email, users.name AS assignee_name,
      users.initials AS assignee_initials, users.department AS assignee_department
    FROM rules
    JOIN users
      ON users.id = rules.assignee_id
      AND users.organization_id = rules.organization_id
`;

function listRules(db, organizationId) {
  return db.prepare(`
    ${ruleSelect}
    WHERE rules.organization_id = ?
    ORDER BY rules.priority, rules.id
  `).all(organizationId).map(ruleFromRow);
}

function getRule(db, organizationId, id) {
  const row = db.prepare(`${ruleSelect} WHERE rules.organization_id = ? AND rules.id = ?`)
    .get(organizationId, id);
  return row ? ruleFromRow(row) : null;
}

function listActivity(db, organizationId) {
  return db.prepare(`
    SELECT activity.*, users.name AS actor_name, users.initials AS actor_initials,
      emails.subject
    FROM activity
    LEFT JOIN users ON users.id = activity.actor_id
    LEFT JOIN emails ON emails.id = activity.email_id
    WHERE activity.organization_id = ?
    ORDER BY activity.created_at DESC, activity.id DESC
    LIMIT 30
  `).all(organizationId).map(row => ({
    id: Number(row.id),
    emailId: row.email_id === null ? null : Number(row.email_id),
    kind: row.kind,
    message: row.message,
    createdAt: row.created_at,
    subject: row.subject,
    actor: row.actor_id ? {
      id: Number(row.actor_id),
      name: row.actor_name,
      initials: row.actor_initials
    } : null
  }));
}

function syncSummary(db, organizationId) {
  const values = Object.fromEntries(
    db.prepare('SELECT key, value FROM sync_state WHERE organization_id = ?')
      .all(organizationId).map(row => [row.key, row.value])
  );
  return {
    lastSuccessAt: values.last_sync_at ?? null,
    lastError: values.last_sync_error ?? null
  };
}

const CONVERSATION_CONFLICT_PAGE_SIZE = 100;
const conversationConflictDetails = Object.freeze({
  native_merge_started_delivery: {
    type: 'merge_blocked',
    message: 'Related provider threads could not be combined because an assignment email had already started sending. Existing assignments were preserved.',
  },
  native_split_started_or_ambiguous: {
    type: 'split_blocked',
    message: 'A provider thread could not be separated safely because its grouping or delivery history is ambiguous. Existing assignments were preserved.',
  },
});

function conversationConflictSummary(db, organizationId) {
  const total = Number(db.prepare(`
    SELECT count(*) AS count FROM conversations
    WHERE organization_id = ? AND trim(coalesce(data_conflict, '')) <> ''
  `).get(organizationId).count);
  const items = db.prepare(`
    SELECT public_id, subject, data_conflict, updated_at
    FROM conversations
    WHERE organization_id = ? AND trim(coalesce(data_conflict, '')) <> ''
    ORDER BY julianday(updated_at) DESC, id DESC
    LIMIT ?
  `).all(organizationId, CONVERSATION_CONFLICT_PAGE_SIZE).map(row => {
    const detail = conversationConflictDetails[row.data_conflict] ?? {
      type: 'review_required',
      message: 'This provider thread needs grouping review. Existing assignments were preserved.',
    };
    return {
      conversationPublicId: row.public_id,
      subject: row.subject,
      type: detail.type,
      message: detail.message,
      detectedAt: row.updated_at,
    };
  });
  return { items, total };
}

function sourceSyncSummary(db, organizationId, cursorKey) {
  if (!cursorKey) return { lastSuccessAt: null, lastError: null };
  return {
    lastSuccessAt: db.prepare('SELECT value FROM sync_state WHERE organization_id = ? AND key = ?')
      .get(organizationId, `last_sync_at:${cursorKey}`)?.value ?? null,
    lastError: db.prepare('SELECT value FROM sync_state WHERE organization_id = ? AND key = ?')
      .get(organizationId, `last_sync_error:${cursorKey}`)?.value ?? null,
  };
}

function integrationPayload(db, integrations, organizationId) {
  const empty = provider => ({
    provider,
    configured: false,
    connected: false,
    accountEmail: null,
    capabilities: { read: false, send: false },
    lastSuccessAt: null,
    lastError: null,
  });
  const details = {};
  for (const provider of ['outlook', 'gmail']) {
    const integration = integrations?.[provider];
    let status = null;
    try {
      status = integration?.status?.({ organizationId }) ?? null;
    } catch {
      status = null;
    }
    if (!status && provider === 'outlook' && integration?.configured) {
      const legacyOrganization = Number(organizationId) === 1;
      status = {
        configured: true,
        connected: legacyOrganization,
        accountEmail: legacyOrganization ? integration.accountEmail ?? null : null,
        capabilities: integration.capabilities ?? { read: true, send: false },
        ...(legacyOrganization
          ? sourceSyncSummary(db, organizationId, integration.cursorKey)
          : { lastSuccessAt: null, lastError: null }),
      };
    }
    details[provider] = {
      ...empty(provider),
      ...(status ?? {}),
      provider,
      capabilities: {
        read: Boolean(status?.capabilities?.read),
        send: Boolean(status?.capabilities?.send),
      },
      authorizationAvailable: Boolean(
        integration?.authorizationAvailable
          ?? (typeof integration?.authorizationUrl === 'function'),
      ),
      disconnectAvailable: Boolean(
        integration?.disconnectAvailable
          ?? (typeof integration?.disconnect === 'function'),
      ),
    };
  }
  return details;
}

function mailboxSummary(details) {
  const providers = Object.entries(details)
    .filter(([, integration]) => integration.connected)
    .map(([provider]) => provider);
  const hasConfiguredIntegration = Object.values(details)
    .some(integration => integration.configured);
  let label = hasConfiguredIntegration ? 'No mailbox connected' : 'Demo mailbox';
  if (providers.length === 1) {
    label = `${providers[0] === 'gmail' ? 'Gmail' : 'Outlook'} connected`;
  } else if (providers.length > 1) {
    label = `${providers.length} mailboxes connected`;
  }
  return { connectedCount: providers.length, label, providers };
}

function validationError(response, message, field) {
  response.status(400).json({
    error: {
      code: 'INVALID_INPUT',
      message,
      ...(field ? { fields: { [field]: message } } : {})
    }
  });
}

function resourceId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function notFound(response, message) {
  return response.status(404).json({
    error: { code: 'NOT_FOUND', message },
  });
}

function deliveryPayload(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    conversationId: Number(row.conversation_id),
    recipientId: Number(row.recipient_id),
    status: row.status,
    blockReason: row.block_reason ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
    acceptedAt: row.accepted_at ?? null,
    updatedAt: row.updated_at,
    error: row.last_error_summary ?? null,
  };
}

function organizationPayload(organization) {
  if (!organization) return null;
  const { logoAssetId, ...safe } = organization;
  return {
    ...safe,
    logoUrl: logoAssetId ? `/api/organization-logos/${logoAssetId}` : null,
  };
}

function invitePayload(invite) {
  return {
    ...invite,
    organization: organizationPayload(invite.organization),
  };
}

function organizationForUser(db, user) {
  const row = db.prepare(`
    SELECT id, name, handle, join_code, normalized_domain, logo_asset_id
    FROM organizations WHERE id = ?
  `).get(user.organization_id);
  if (!row) return null;
  return organizationPayload({
    id: Number(row.id),
    name: row.name,
    handle: row.handle,
    domain: row.normalized_domain,
    logoAssetId: row.logo_asset_id == null ? null : Number(row.logo_asset_id),
    ...(user.role === 'admin' ? { joinCode: row.join_code } : {}),
  });
}

function runTransaction(db, operation) {
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

function parseRule(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const keywords = typeof body.keywords === 'string'
    ? body.keywords.split(',').map(value => value.trim()).filter(Boolean).join(',')
    : '';
  const senderFilter = typeof body.senderFilter === 'string' ? body.senderFilter.trim() : '';
  const assigneeId = Number(body.assigneeId);
  const priority = Number(body.priority);

  if (!name || name.length > 80) return { error: 'Enter a rule name of 80 characters or fewer.', field: 'name' };
  if (keywords.length > 240) return { error: 'Keywords must be 240 characters or fewer.', field: 'keywords' };
  if (senderFilter.length > 160) return { error: 'The sender filter is too long.', field: 'senderFilter' };
  if (!keywords && !senderFilter) return { error: 'Enter keywords or a sender filter.', field: 'keywords' };
  if (!Number.isInteger(assigneeId) || assigneeId < 1) return { error: 'Choose an assignee.', field: 'assigneeId' };
  if (!Number.isInteger(priority) || priority < 1 || priority > 999) return { error: 'Priority must be between 1 and 999.', field: 'priority' };
  return { value: { name, keywords, senderFilter, assigneeId, priority } };
}

const editableRuleFields = ['name', 'keywords', 'senderFilter', 'assigneeId', 'priority', 'enabled'];

function parseRulePatch(body, current) {
  const hasField = (field) => Object.prototype.hasOwnProperty.call(body, field);
  if (!editableRuleFields.some(hasField)) {
    return { error: 'Update at least one rule field.' };
  }

  const value = {
    name: current.name,
    keywords: current.keywords,
    senderFilter: current.sender_filter,
    assigneeId: Number(current.assignee_id),
    priority: Number(current.priority),
    enabled: Boolean(current.enabled),
  };

  if (hasField('name')) {
    if (typeof body.name !== 'string') {
      return { error: 'Enter a rule name of 80 characters or fewer.', field: 'name' };
    }
    value.name = body.name.trim();
  }
  if (hasField('keywords')) {
    if (typeof body.keywords !== 'string') {
      return { error: 'Enter comma-separated keywords.', field: 'keywords' };
    }
    value.keywords = body.keywords
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .join(',');
  }
  if (hasField('senderFilter')) {
    if (typeof body.senderFilter !== 'string') {
      return { error: 'Enter a valid sender filter.', field: 'senderFilter' };
    }
    value.senderFilter = body.senderFilter.trim();
  }
  if (hasField('assigneeId')) value.assigneeId = Number(body.assigneeId);
  if (hasField('priority')) value.priority = Number(body.priority);
  if (hasField('enabled')) {
    if (typeof body.enabled !== 'boolean') {
      return { error: 'Enabled must be true or false.', field: 'enabled' };
    }
    value.enabled = body.enabled;
  }

  if (!value.name || value.name.length > 80) {
    return { error: 'Enter a rule name of 80 characters or fewer.', field: 'name' };
  }
  if (value.keywords.length > 240) {
    return { error: 'Keywords must be 240 characters or fewer.', field: 'keywords' };
  }
  if (value.senderFilter.length > 160) {
    return { error: 'The sender filter is too long.', field: 'senderFilter' };
  }
  if (!value.keywords && !value.senderFilter) {
    return { error: 'Enter keywords or a sender filter.', field: 'keywords' };
  }
  if (!Number.isInteger(value.assigneeId) || value.assigneeId < 1) {
    return { error: 'Choose an assignee.', field: 'assigneeId' };
  }
  if (!Number.isInteger(value.priority) || value.priority < 1 || value.priority > 999) {
    return { error: 'Priority must be between 1 and 999.', field: 'priority' };
  }
  const changed = (
    value.name !== current.name
    || value.keywords !== current.keywords
    || value.senderFilter !== current.sender_filter
    || value.assigneeId !== Number(current.assignee_id)
    || value.priority !== Number(current.priority)
    || value.enabled !== Boolean(current.enabled)
  );
  if (!changed) return { error: 'Change at least one rule field.' };
  return { value };
}

async function runSync(syncRunner, organizationId) {
  if (typeof syncRunner === 'function') return syncRunner({ organizationId });
  return syncRunner.run({ organizationId });
}

export function createApp({
  db,
  syncRunner,
  mode = 'demo',
  appBaseUrl = 'http://127.0.0.1:3000',
  integrations = {},
  deliveryRunner = null,
  conversationHistory = null,
  cookieSecure = new URL(appBaseUrl).protocol === 'https:',
  staticDir = publicDirectory,
  clock = () => new Date(),
}) {
  const app = express();
  app.disable('x-powered-by');
  const registrationJson = express.json({ limit: '3mb' });

  function privateNoStore(request, response, next) {
    response.setHeader('Cache-Control', 'private, no-store');
    response.vary('Cookie');
    next();
  }

  function runDeliveriesSoon(deliveryId = null) {
    const operation = deliveryId && typeof deliveryRunner?.runOne === 'function'
      ? deliveryRunner.runOne(deliveryId)
      : deliveryRunner?.run?.();
    Promise.resolve(operation).catch(() => {
      // Assignment is already committed. Safe delivery state is retained for admin review.
    });
  }

  app.get('/api/organization-logos/:assetId', (request, response) => {
    const logo = getOrganizationLogo({ db, assetId: resourceId(request.params.assetId) });
    if (!logo) return notFound(response, 'Organization logo not found.');
    response.setHeader('Content-Type', logo.mimeType);
    response.setHeader('Content-Length', String(logo.bytes.length));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.end(logo.bytes);
  });

  app.post('/api/registrations/admin', registrationJson, privateNoStore, async (request, response, next) => {
    try {
      const result = await createAdminOrganization({ db, input: request.body, now: clock() });
      response.setHeader('set-cookie', sessionCookie(result.session.id, cookieSecure));
      response.status(201).json({
        user: result.user,
        organization: organizationPayload(result.organization),
      });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.json({ limit: '32kb' }));

  app.get('/api/organizations/lookup', (request, response) => {
    const organization = lookupOrganization({ db, key: request.query?.key });
    if (!organization) return notFound(response, 'Organization not found.');
    response.json({ organization: organizationPayload(organization) });
  });

  app.post('/api/join-requests', privateNoStore, (request, response, next) => {
    try {
      const joinRequest = submitJoinRequest({
        db,
        input: request.body,
        sourceAddress: request.socket.remoteAddress,
        now: clock(),
      });
      response.status(202).json({ request: joinRequest });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/registration-invites/:token', privateNoStore, (request, response, next) => {
    try {
      response.json({
        invite: invitePayload(inspectInvite({
          db,
          token: request.params.token,
          now: clock(),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/registration-invites/:token/complete', privateNoStore, async (request, response, next) => {
    try {
      const result = await completeInvite({
        db,
        token: request.params.token,
        input: request.body,
        now: clock(),
      });
      response.setHeader('set-cookie', sessionCookie(result.session.id, cookieSecure));
      response.status(201).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/login', privateNoStore, async (request, response, next) => {
    try {
      const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
      const password = typeof request.body?.password === 'string' ? request.body.password : '';
      if (!email) {
        validationError(response, 'Enter your email address.', 'email');
        return;
      }
      if (!password) {
        validationError(response, 'Enter your password.', 'password');
        return;
      }
      const user = db.prepare(`
        SELECT * FROM users
        WHERE lower(email) = ? AND registration_status = 'active'
      `).get(email);
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        response.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email or password is incorrect.',
            fields: {
              email: 'Check your email or password.',
              password: 'Check your email or password.'
            }
          }
        });
        return;
      }

      const session = createSession(db, user.id);
      response.setHeader('set-cookie', sessionCookie(session.id, cookieSecure));
      response.json({ user: safeUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', privateNoStore);
  app.use('/api', requireUser(db));

  app.post('/api/logout', (request, response) => {
    deleteSession(db, sessionIdFromRequest(request));
    response.setHeader('set-cookie', expiredSessionCookie(cookieSecure));
    response.status(204).end();
  });

  app.get('/api/membership-requests', requireAdmin, (request, response) => {
    response.json({
      requests: listJoinRequests({
        db,
        organizationId: Number(request.user.organization_id),
      }),
    });
  });

  function decideMembership(decision) {
    return (request, response, next) => {
      try {
        const requestId = resourceId(request.params.id);
        if (!requestId) return notFound(response, 'Membership request not found.');
        const result = decideJoinRequest({
          db,
          organizationId: Number(request.user.organization_id),
          adminId: Number(request.user.id),
          requestId,
          decision,
          appBaseUrl,
          now: clock(),
        });
        response.json(result);
      } catch (error) {
        next(error);
      }
    };
  }

  app.post('/api/membership-requests/:id/approve', requireAdmin, decideMembership('approve'));
  app.post('/api/membership-requests/:id/reject', requireAdmin, decideMembership('reject'));
  app.post('/api/membership-requests/:id/replace-invite', requireAdmin, (request, response, next) => {
    try {
      const requestId = resourceId(request.params.id);
      if (!requestId) return notFound(response, 'Membership request not found.');
      const result = replaceJoinRequestInvite({
        db,
        organizationId: Number(request.user.organization_id),
        adminId: Number(request.user.id),
        requestId,
        appBaseUrl,
        now: clock(),
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/bootstrap', (request, response) => {
    const organizationId = Number(request.user.organization_id);
    const notifications = listNotifications(db, request.user.id, organizationId);
    const notificationSummary = notificationCounts(db, request.user.id, organizationId);
    const integrationDetails = integrationPayload(db, integrations, organizationId);
    const payload = {
      user: safeUser(request.user),
      organization: organizationForUser(db, request.user),
      mode,
      mailboxSummary: mailboxSummary(integrationDetails),
      emails: listEmails(db, request.user),
      notifications,
      unreadCount: notificationSummary.unread,
      notificationTotal: notificationSummary.total
    };

    if (request.user.role === 'admin') {
      const conflicts = conversationConflictSummary(db, organizationId);
      payload.rules = listRules(db, organizationId);
      payload.team = db.prepare(`
        SELECT * FROM users
        WHERE organization_id = ? AND role = 'member' AND registration_status = 'active'
        ORDER BY name
      `).all(organizationId).map(safeUser);
      payload.activity = listActivity(db, organizationId);
      payload.sync = syncSummary(db, organizationId);
      payload.departments = listDepartments(db, organizationId);
      payload.settings = getWorkspaceSettings(db, organizationId);
      payload.integrations = integrationDetails;
      payload.membershipRequests = listJoinRequests({ db, organizationId });
      payload.conversationConflicts = conflicts.items;
      payload.conversationConflictTotal = conflicts.total;
    }

    response.json(payload);
  });

  for (const provider of ['gmail', 'outlook']) {
    const label = provider === 'gmail' ? 'Gmail' : 'Outlook';
    app.get(`/api/integrations/${provider}/authorize`, requireAdmin, (request, response, next) => {
      try {
        const authorizationUrl = integrations[provider]?.authorizationUrl?.({
          sessionId: request.sessionId,
          organizationId: Number(request.user.organization_id),
          adminUserId: Number(request.user.id),
        });
        if (!authorizationUrl) {
          const error = new Error(`${label} connection is not configured on this server.`);
          error.status = 503;
          error.code = `${provider.toUpperCase()}_NOT_CONFIGURED`;
          error.expose = true;
          throw error;
        }
        response.redirect(303, authorizationUrl);
      } catch (error) {
        next(error);
      }
    });

    app.get(`/api/integrations/${provider}/callback`, requireAdmin, async (request, response) => {
      const state = typeof request.query?.state === 'string' ? request.query.state : '';
      const code = typeof request.query?.code === 'string' ? request.query.code : '';
      if (!integrations[provider]?.completeAuthorization || !state) {
        response.redirect(303, `/?integration=${provider}-error`);
        return;
      }

      try {
        await integrations[provider].completeAuthorization({
          sessionId: request.sessionId,
          organizationId: Number(request.user.organization_id),
          adminUserId: Number(request.user.id),
          state,
          code: request.query?.error ? '' : code,
        });
        if (!code || request.query?.error) throw new Error(`${label} authorization was cancelled.`);
        runDeliveriesSoon();
        response.redirect(303, `/?integration=${provider}-connected`);
      } catch {
        response.redirect(303, `/?integration=${provider}-error`);
      }
    });

    app.delete(`/api/integrations/${provider}`, requireAdmin, async (request, response, next) => {
      try {
        if (!integrations[provider]?.disconnect) {
          return notFound(response, `${label} connection is not available.`);
        }
        await integrations[provider].disconnect({
          organizationId: Number(request.user.organization_id),
          adminUserId: Number(request.user.id),
        });
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    });
  }

  app.post('/api/departments', requireAdmin, (request, response, next) => {
    try {
      const department = createDepartment({
        db,
        organizationId: Number(request.user.organization_id),
        name: request.body?.name,
        now: clock(),
      });
      response.status(201).json({ department });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/team/:id/department', requireAdmin, (request, response, next) => {
    try {
      const userId = resourceId(request.params.id);
      const departmentId = resourceId(request.body?.departmentId);
      if (!userId) return notFound(response, 'Team member not found.');
      if (!departmentId) {
        return validationError(response, 'Choose a valid department.', 'departmentId');
      }
      response.json({
        member: moveMemberToDepartment({
          db,
          organizationId: Number(request.user.organization_id),
          userId,
          departmentId,
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/settings', requireAdmin, (request, response, next) => {
    try {
      response.json({
        settings: updateWorkspaceSettings({
          db,
          organizationId: Number(request.user.organization_id),
          timeUnassignedHours: Number(request.body?.timeUnassignedHours),
          timeAssignedUnmarkedHours: Number(request.body?.timeAssignedUnmarkedHours),
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/sync', requireAdmin, async (request, response, next) => {
    try {
      const organizationId = Number(request.user.organization_id);
      const connected = Object.values(integrationPayload(db, integrations, organizationId))
        .some(integration => integration.connected);
      const demoAvailable = mode === 'demo' && organizationId === 1;
      if (!connected && !demoAvailable) {
        const error = new Error('No mailbox is connected for this organization.');
        error.status = 409;
        error.code = 'MAILBOX_NOT_CONNECTED';
        error.expose = true;
        throw error;
      }
      const result = await runSync(syncRunner, organizationId);
      runDeliveriesSoon();
      response.json(result);
    } catch (error) {
      if (Number(error.status) >= 400 && Number(error.status) < 500) {
        next(error);
        return;
      }
      error.status = 502;
      error.code = 'SYNC_FAILED';
      error.message = 'Mailbox sync failed. Review the last sync status and try again.';
      error.expose = true;
      next(error);
    }
  });

  app.post('/api/rules', requireAdmin, (request, response, next) => {
    try {
      const parsed = parseRule(request.body ?? {});
      if (parsed.error) return validationError(response, parsed.error, parsed.field);
      const organizationId = Number(request.user.organization_id);
      const member = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND organization_id = ? AND role = 'member' AND registration_status = 'active'
      `).get(parsed.value.assigneeId, organizationId);
      if (!member) return validationError(response, 'Choose a valid team member.', 'assigneeId');

      const now = new Date().toISOString();
      const id = runTransaction(db, () => {
        const result = db.prepare(`
          INSERT INTO rules
            (organization_id, name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
          organizationId,
          parsed.value.name,
          parsed.value.keywords,
          parsed.value.senderFilter,
          parsed.value.assigneeId,
          parsed.value.priority,
          now
        );
        const ruleId = Number(result.lastInsertRowid);
        applyRuleToUnassigned(db, ruleId, organizationId, {
          trustedAppOrigin: appBaseUrl,
        });
        return ruleId;
      });
      runDeliveriesSoon();
      response.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/rules/:id', requireAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Rule not found.');

      const organizationId = Number(request.user.organization_id);
      const current = db.prepare('SELECT * FROM rules WHERE id = ? AND organization_id = ?')
        .get(id, organizationId);
      if (!current) return notFound(response, 'Rule not found.');

      const body = request.body && !Array.isArray(request.body) ? request.body : {};
      const parsed = parseRulePatch(body, current);
      if (parsed.error) return validationError(response, parsed.error, parsed.field);

      const member = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND organization_id = ? AND role = 'member' AND registration_status = 'active'
      `).get(parsed.value.assigneeId, organizationId);
      if (!member) return validationError(response, 'Choose a valid team member.', 'assigneeId');

      runTransaction(db, () => {
        db.prepare(`
          UPDATE rules
          SET name = ?, keywords = ?, sender_filter = ?, assignee_id = ?, priority = ?, enabled = ?
          WHERE id = ? AND organization_id = ?
        `).run(
          parsed.value.name,
          parsed.value.keywords,
          parsed.value.senderFilter,
          parsed.value.assigneeId,
          parsed.value.priority,
          parsed.value.enabled ? 1 : 0,
          id,
          organizationId,
        );
        if (parsed.value.enabled) {
          applyRuleToUnassigned(db, id, organizationId, {
            trustedAppOrigin: appBaseUrl,
          });
        }
      });
      runDeliveriesSoon();
      response.json({ rule: getRule(db, organizationId, id) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/rules/:id', requireAdmin, (request, response) => {
    const id = resourceId(request.params.id);
    if (!id) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found.' } });
      return;
    }
    const result = db.prepare('DELETE FROM rules WHERE id = ? AND organization_id = ?')
      .run(id, request.user.organization_id);
    if (!result.changes) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found.' } });
      return;
    }
    response.status(204).end();
  });

  app.post('/api/emails/:id/assign', requireAdmin, (request, response, next) => {
    try {
      const emailId = resourceId(request.params.id);
      const assigneeId = resourceId(request.body?.assigneeId);
      if (!emailId) return notFound(response, 'Email not found.');
      if (!assigneeId) {
        return validationError(response, 'Choose a valid team member.', 'assigneeId');
      }

      const result = assignEmailManually({
        db,
        emailId,
        assigneeId,
        adminId: Number(request.user.id),
        organizationId: Number(request.user.organization_id),
        trustedAppOrigin: appBaseUrl,
        now: clock(),
      });
      runDeliveriesSoon(result.delivery?.id ?? null);
      response.json({
        changed: result.changed,
        emailId,
        assigneeId: Number(result.email.assignee_id),
        assignedAt: result.email.assigned_at,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/emails/:id/complete', (request, response, next) => {
    try {
      if (request.user.role !== 'member') {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the assignee can complete this email.' } });
        return;
      }

      const emailId = resourceId(request.params.id);
      if (!emailId) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
        return;
      }
      const email = db.prepare(`
        SELECT id, assignee_id FROM emails
        WHERE id = ? AND organization_id = ?
      `).get(emailId, request.user.organization_id);
      if (!email) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
        return;
      }
      if (Number(email.assignee_id) !== Number(request.user.id)) {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'This email is assigned to another team member.' } });
        return;
      }

      const completed = completeAssignedEmail({
        db,
        emailId,
        userId: request.user.id,
        organizationId: Number(request.user.organization_id),
        now: clock(),
      });
      response.json({ email: completed });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/emails/:id/conversation', async (request, response, next) => {
    try {
      const emailId = resourceId(request.params.id);
      if (!emailId || !conversationHistory?.getForEmail) {
        return notFound(response, 'Conversation not found.');
      }
      const result = await conversationHistory.getForEmail({
        emailId,
        userId: Number(request.user.id),
        organizationId: Number(request.user.organization_id),
      });
      response.setHeader('Cache-Control', 'private, no-store');
      response.json(result);
    } catch (error) {
      if (Number(error?.status) >= 500) {
        error.status = 502;
        error.code = 'CONVERSATION_HISTORY_UNAVAILABLE';
        error.message = 'Conversation history is temporarily unavailable. Try again.';
        error.expose = true;
      }
      next(error);
    }
  });

  app.get('/api/conversations/:publicId', (request, response) => {
    const publicId = typeof request.params.publicId === 'string'
      ? request.params.publicId.trim()
      : '';
    const conversation = db.prepare(`
      SELECT id, current_assignee_id
      FROM conversations
      WHERE public_id = ? AND organization_id = ?
    `).get(publicId, request.user.organization_id);
    const authorized = conversation && (
      request.user.role === 'admin'
      || Number(conversation.current_assignee_id) === Number(request.user.id)
    );
    if (!authorized) return notFound(response, 'Conversation not found.');
    const anchor = db.prepare(`
      SELECT id FROM emails
      WHERE organization_id = ? AND conversation_id = ?
      ORDER BY julianday(received_at) DESC, id DESC
      LIMIT 1
    `).get(request.user.organization_id, conversation.id);
    if (!anchor) {
      response.status(410).json({
        error: {
          code: 'CONVERSATION_NO_LONGER_AVAILABLE',
          message: 'This conversation is no longer retained in LexFlow.',
        },
      });
      return;
    }
    response.setHeader('Cache-Control', 'private, no-store');
    response.json({ emailId: Number(anchor.id), conversationPublicId: publicId });
  });

  app.get('/api/deliveries/:id', (request, response) => {
    const id = resourceId(request.params.id);
    if (!id || request.user.role !== 'admin') {
      return notFound(response, 'Assignment delivery not found.');
    }
    const delivery = db.prepare(`
      SELECT * FROM assignment_deliveries
      WHERE id = ? AND organization_id = ?
    `).get(id, request.user.organization_id);
    if (!delivery) return notFound(response, 'Assignment delivery not found.');
    response.setHeader('Cache-Control', 'private, no-store');
    response.json({ delivery: deliveryPayload(delivery) });
  });

  app.post('/api/deliveries/:id/retry', (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id || request.user.role !== 'admin') {
        return notFound(response, 'Assignment delivery not found.');
      }
      const existing = db.prepare(`
        SELECT id FROM assignment_deliveries
        WHERE id = ? AND organization_id = ?
      `).get(id, request.user.organization_id);
      if (!existing) return notFound(response, 'Assignment delivery not found.');
      if (request.body?.duplicateRiskConfirmed !== true) {
        return validationError(
          response,
          'Confirm that retrying may send a duplicate assignment email.',
          'duplicateRiskConfirmed',
        );
      }
      const delivery = retryUnknownDelivery({
        db,
        deliveryId: id,
        organizationId: Number(request.user.organization_id),
        duplicateRiskConfirmed: true,
        now: clock(),
      });
      runDeliveriesSoon(id);
      response.status(202).json({ delivery: deliveryPayload(delivery) });
    } catch (error) {
      if (error?.code === 'unknown_delivery_not_found') {
        return notFound(response, 'Assignment delivery not found.');
      }
      next(error);
    }
  });

  app.post('/api/notifications/:id/read', (request, response) => {
    const id = resourceId(request.params.id);
    if (!id) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }
    const notification = db.prepare(`
      SELECT user_id FROM notifications
      WHERE id = ? AND organization_id = ?
    `).get(id, request.user.organization_id);
    if (!notification) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }
    if (Number(notification.user_id) !== Number(request.user.id)) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'This notification belongs to another user.' } });
      return;
    }
    const result = db.prepare(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, ?)
      WHERE id = ? AND user_id = ? AND organization_id = ?
    `).run(new Date().toISOString(), id, request.user.id, request.user.organization_id);
    if (!result.changes) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }
    response.json({ id, read: true });
  });

  app.use('/api', (request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });

  app.use(express.static(staticDir));
  app.get('*splat', (request, response) => {
    response.sendFile(path.join(staticDir, 'index.html'));
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const status = Number.isInteger(error.status) ? error.status : 500;
    const expose = (status >= 400 && status < 500) || error.expose === true;
    response.status(status).json({
      error: {
        code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'),
        message: expose ? error.message : 'Something went wrong. Please try again.',
        ...(expose && error.field ? { fields: { [error.field]: error.message } } : {}),
      }
    });
  });

  return app;
}
