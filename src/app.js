import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { isRulePriority, RULE_PRIORITY_ERROR } from '../public/rule-priorities.js';

import {
  createSession,
  deleteSession,
  expiredSessionCookie,
  requireAdmin,
  requireDepAdmin,
  requireUser,
  sessionCookie,
  sessionIdFromRequest,
  requireOrgAdmin,
  requirePlatformAdmin,
} from './auth.js';
import { createEntraAuth } from './entra-auth.js';
import {
  getDepartmentMetrics,
  getMemberMetrics,
  getOrganizationMetrics,
  getPlatformMetrics,
  normalizeMetricsQuery,
} from './metrics.js';
import {
  createMember,
  createOrganization,
  getLogo,
  getOrganization,
  listMembers,
  listOrganizations,
  organizationPayload,
  setOrganizationStatus,
  updateMember,
  updateOrganization,
} from './tenants.js';
import {
  applyRuleToUnassigned,
  assignEmailManually,
  completeAssignedEmail,
} from './workflows.js';
import {
  createDepartment,
  deleteDepartment,
  getWorkspaceSettings,
  listDepartmentMembers,
  listDepartments,
  listEscalationRecipients,
  moveMemberToDepartment,
  replaceEscalationRecipients,
  setDepartmentHead,
  updateDepartment,
  updateWorkspaceSettings,
} from './workspace.js';

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const chartBundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/chart.js/dist/chart.umd.js');
const animeBundle = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../node_modules/animejs/dist/bundles/anime.esm.js',
);

function safeUser(row) {
  return {
    id: Number(row.id),
    organizationId: row.organization_id == null ? null : Number(row.organization_id),
    departmentId: row.department_id == null ? null : Number(row.department_id),
    headedDepartmentId: row.headed_department_id == null ? null : Number(row.headed_department_id),
    email: row.email,
    name: row.name,
    initials: row.initials,
    department: row.department,
    role: row.effectiveRole ?? (row.is_platform_admin ? 'platform_admin' : row.role === 'admin' ? 'org_admin' : 'member'),
    status: row.account_status ?? 'active',
  };
}

function emailFromRow(row) {
  const provider = row.provider || 'outlook';
  return {
    id: Number(row.id),
    conversationId: row.conversation_task_id == null ? null : Number(row.conversation_task_id),
    messageCount: Number(row.conversation_message_count ?? 1),
    reopened: row.conversation_reopened === 1,
    hasAttachments: Boolean(row.conversation_has_attachments ?? row.has_attachments),
    searchText: row.conversation_search_text ?? '',
    subject: row.subject,
    sender: { name: row.sender_name, address: row.sender_address },
    preview: row.preview,
    receivedAt: row.received_at,
    provider,
    mailboxAddress: row.mailbox_address ?? null,
    webUrl: row.outlook_url,
    outlookUrl: row.outlook_url,
    sourceState: row.source_state ?? 'active',
    sourceRemovedAt: row.source_removed_at ?? null,
    sourceRemovalReason: row.source_removed_reason ?? null,
    status: row.conversation_status ?? row.status,
    assignedAt: row.conversation_assigned_at ?? row.assigned_at,
    departmentId: row.department_id == null ? null : Number(row.department_id),
    department: row.email_department ?? row.assignee_department ?? null,
    sharedMailbox: row.department_mailbox ?? row.mailbox_address ?? null,
    assignee: (row.conversation_assignee_id ?? row.assignee_id) ? {
      id: Number(row.conversation_assignee_id ?? row.assignee_id),
      email: row.assignee_email,
      name: row.assignee_name,
      initials: row.assignee_initials,
      department: row.assignee_department
    } : null,
    completedBy: row.completed_by ? {
      id: Number(row.completed_by),
      name: row.completed_by_name
    } : null,
    completedAt: row.conversation_completed_at ?? row.completed_at,
    priority: Number(row.conversation_priority ?? 30),
  };
}

function listEmails(db, user) {
  const departmentAccess = user.effectiveRole === 'dep_admin';
  const ownership = departmentAccess
    ? 'AND emails.department_id = ?'
    : 'AND emails.assignee_id = ?';
  const statement = db.prepare(`
    SELECT latest.*,
      conversations.id AS conversation_task_id,
      conversations.status AS conversation_status,
      conversations.assignee_id AS conversation_assignee_id,
      conversations.message_count AS conversation_message_count,
      conversations.has_attachments AS conversation_has_attachments,
      conversations.completed_at AS conversation_completed_at,
      COALESCE(
        (SELECT cycles.started_at FROM assignment_cycles cycles
         WHERE cycles.conversation_id = conversations.id
         ORDER BY cycles.started_at DESC, cycles.id DESC LIMIT 1),
        (SELECT MAX(messages.assigned_at) FROM emails messages
         WHERE messages.conversation_id = conversations.id
           AND messages.assignee_id = conversations.assignee_id)
      ) AS conversation_assigned_at,
      COALESCE((SELECT cycles.priority FROM assignment_cycles cycles
         WHERE cycles.conversation_id = conversations.id
           AND cycles.completed_at IS NULL AND cycles.superseded_at IS NULL
         ORDER BY cycles.started_at DESC, cycles.id DESC LIMIT 1), 30) AS conversation_priority,
      (SELECT group_concat(
        messages.subject || ' ' || messages.sender_name || ' ' || messages.sender_address || ' ' || messages.preview,
        ' '
      ) FROM emails messages WHERE messages.conversation_id = conversations.id) AS conversation_search_text,
      CASE WHEN conversations.status <> 'completed'
        AND EXISTS (
          SELECT 1 FROM task_events completed_event
          JOIN emails completed_email ON completed_email.id = completed_event.email_id
          WHERE completed_email.conversation_id = conversations.id
            AND completed_event.event_type = 'completed'
        ) THEN 1 ELSE 0 END AS conversation_reopened,
      assignee.email AS assignee_email,
      assignee.name AS assignee_name,
      assignee.initials AS assignee_initials,
      assignee.department AS assignee_department,
      departments.name AS email_department,
      departments.shared_mailbox AS department_mailbox,
      completed.name AS completed_by_name
    FROM conversations
    JOIN emails AS latest ON latest.id = conversations.latest_email_id
    LEFT JOIN users AS assignee ON assignee.id = conversations.assignee_id
    LEFT JOIN users AS completed ON completed.id = latest.completed_by
    LEFT JOIN departments
      ON departments.id = conversations.department_id
      AND departments.organization_id = conversations.organization_id
    WHERE conversations.organization_id = ? ${ownership.replaceAll('emails.', 'conversations.')}
    ORDER BY conversations.latest_received_at DESC, conversations.id DESC
  `);
  const rows = statement.all(
    user.organization_id,
    departmentAccess ? user.headed_department_id : user.id,
  );
  const deletedRows = db.prepare(`
    SELECT emails.*,
      NULL AS conversation_task_id,
      1 AS conversation_message_count,
      emails.has_attachments AS conversation_has_attachments,
      NULL AS conversation_completed_at,
      emails.assigned_at AS conversation_assigned_at,
      30 AS conversation_priority,
      '' AS conversation_search_text,
      0 AS conversation_reopened,
      assignee.email AS assignee_email,
      assignee.name AS assignee_name,
      assignee.initials AS assignee_initials,
      assignee.department AS assignee_department,
      departments.name AS email_department,
      departments.shared_mailbox AS department_mailbox,
      completed.name AS completed_by_name
    FROM emails
    LEFT JOIN users AS assignee ON assignee.id = emails.assignee_id
    LEFT JOIN users AS completed ON completed.id = emails.completed_by
    LEFT JOIN departments
      ON departments.id = emails.department_id
      AND departments.organization_id = emails.organization_id
    WHERE emails.organization_id = ? AND emails.source_state <> 'active'
      ${departmentAccess ? 'AND emails.department_id = ?' : 'AND emails.assignee_id = ?'}
    ORDER BY emails.received_at DESC, emails.id DESC
  `).all(
    user.organization_id,
    departmentAccess ? user.headed_department_id : user.id,
  );
  const existingIds = new Set(rows.map(row => Number(row.id)));
  return [...rows, ...deletedRows.filter(row => !existingIds.has(Number(row.id)))].map(emailFromRow);
}

function visibleConversationRow(db, user, conversationId) {
  if (user.effectiveRole === 'dep_admin' && user.headed_department_id) {
    return db.prepare(`SELECT * FROM conversations WHERE id = ? AND organization_id = ? AND department_id = ?`)
      .get(conversationId, user.organization_id, user.headed_department_id) ?? null;
  }
  if (user.effectiveRole === 'member') {
    return db.prepare(`SELECT * FROM conversations WHERE id = ? AND organization_id = ? AND assignee_id = ?`)
      .get(conversationId, user.organization_id, user.id) ?? null;
  }
  return null;
}

function visibleEmailRow(db, user, emailId) {
  if (user.effectiveRole === 'dep_admin' && user.headed_department_id) {
    return db.prepare(`
      SELECT * FROM emails
      WHERE id = ? AND organization_id = ? AND department_id = ?
    `).get(emailId, user.organization_id, user.headed_department_id) ?? null;
  }
  if (user.effectiveRole === 'member') {
    return db.prepare(`
      SELECT * FROM emails
      WHERE id = ? AND organization_id = ? AND assignee_id = ?
    `).get(emailId, user.organization_id, user.id) ?? null;
  }
  return null;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function safeOutlookUrl(value) {
  const webUrl = safeHttpUrl(value);
  if (!webUrl) return null;
  const hostname = new URL(webUrl).hostname.toLocaleLowerCase();
  return ['outlook.office.com', 'outlook.office365.com'].includes(hostname) ? webUrl : null;
}

function outlookImmutableId(email) {
  const mailbox = String(email.mailbox_address ?? '').trim().toLocaleLowerCase();
  const providerId = String(email.provider_id ?? '').trim();
  if (!mailbox || !providerId) return null;
  const prefix = `outlook:${mailbox}:`;
  if (!providerId.toLocaleLowerCase().startsWith(prefix)) return null;
  return providerId.slice(prefix.length).trim() || null;
}

function listNotifications(db, userId, organizationId) {
  return db.prepare(`
    SELECT id, email_id, kind, message, read_at, created_at
    FROM notifications
    WHERE user_id = ? AND organization_id = ?
    ORDER BY created_at DESC, id DESC
  `).all(userId, organizationId).map(row => ({
    id: Number(row.id),
    emailId: Number(row.email_id),
    kind: row.kind,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  }));
}

function pendingTaskSummary(db, user, unreadNotifications) {
  const departmentId = user.effectiveRole === 'dep_admin'
    ? Number(user.headed_department_id)
    : null;
  const counts = db.prepare(`
    SELECT
      SUM(CASE
        WHEN status = 'assigned' AND assignee_id = ?
          AND (? IS NULL OR department_id = ?)
        THEN 1 ELSE 0
      END) AS assigned_to_me,
      SUM(CASE
        WHEN ? IS NOT NULL AND status = 'unassigned' AND department_id = ?
        THEN 1 ELSE 0
      END) AS unassigned_department
    FROM (
      SELECT status, assignee_id, department_id, organization_id FROM conversations
      WHERE EXISTS (
        SELECT 1 FROM emails
        WHERE emails.conversation_id = conversations.id AND emails.source_state = 'active'
      )
      UNION ALL
      SELECT status, assignee_id, department_id, organization_id
      FROM emails WHERE conversation_id IS NULL AND source_state = 'active'
    ) AS workflow_tasks
    WHERE organization_id = ?
  `).get(
    user.id,
    departmentId,
    departmentId,
    departmentId,
    departmentId,
    user.organization_id,
  );
  return {
    assignedToMe: Number(counts.assigned_to_me) || 0,
    unassignedDepartment: Number(counts.unassigned_department) || 0,
    unreadNotifications: Number(unreadNotifications) || 0,
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
    hasAttachments: Boolean(row.has_attachments),
    departmentId: Number(row.department_id),
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
    JOIN users ON users.id = rules.assignee_id AND users.organization_id = rules.organization_id
`;

function listRules(db, organizationId, departmentId) {
  return db.prepare(`
    ${ruleSelect}
    WHERE rules.organization_id = ? AND rules.department_id = ?
    ORDER BY rules.priority, rules.id
  `).all(organizationId, departmentId).map(ruleFromRow);
}

function getRule(db, organizationId, departmentId, id) {
  const row = db.prepare(`${ruleSelect} WHERE rules.organization_id = ? AND rules.department_id = ? AND rules.id = ?`)
    .get(organizationId, departmentId, id);
  return row ? ruleFromRow(row) : null;
}

function listActivity(db, organizationId, departmentId) {
  return db.prepare(`
    SELECT activity.*, users.name AS actor_name, users.initials AS actor_initials,
      emails.subject
    FROM activity
    LEFT JOIN users ON users.id = activity.actor_id
    LEFT JOIN emails ON emails.id = activity.email_id
    WHERE activity.organization_id = ? AND activity.department_id = ?
    ORDER BY activity.created_at DESC, activity.id DESC
    LIMIT 30
  `).all(organizationId, departmentId).map(row => ({
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

function listEscalationDeliveries(db, organizationId, departmentId) {
  return db.prepare(`
    SELECT deliveries.id, deliveries.level, deliveries.recipient_email, deliveries.state,
      deliveries.sent_at, deliveries.last_error, deliveries.created_at, conversations.subject
    FROM escalation_deliveries deliveries
    JOIN conversations ON conversations.id = deliveries.conversation_id
    WHERE deliveries.organization_id = ? AND deliveries.department_id = ?
    ORDER BY COALESCE(deliveries.sent_at, deliveries.created_at) DESC, deliveries.id DESC
    LIMIT 20
  `).all(organizationId, departmentId).map(row => ({
    id: Number(row.id), level: Number(row.level), recipient: row.recipient_email,
    state: row.state, subject: row.subject, sentAt: row.sent_at,
    error: row.last_error, createdAt: row.created_at,
  }));
}

function syncSummary(db, organizationId) {
  const values = Object.fromEntries(
    db.prepare('SELECT key, value FROM sync_state WHERE organization_id = ?').all(organizationId).map(row => [row.key, row.value])
  );
  return {
    lastSuccessAt: values.last_sync_at ?? null,
    lastError: values.last_sync_error ?? null
  };
}

function sourceSyncSummary(db, organizationId, cursorKey) {
  if (!cursorKey) return { lastSuccessAt: null, lastError: null };
  return {
    lastSuccessAt: db.prepare('SELECT value FROM sync_state WHERE organization_id = ? AND key = ?')
      .get(organizationId, Number(organizationId) === 1 ? `last_sync_at:${cursorKey}` : `organization:${organizationId}:last_sync_at:${cursorKey}`)?.value ?? null,
    lastError: db.prepare('SELECT value FROM sync_state WHERE organization_id = ? AND key = ?')
      .get(organizationId, Number(organizationId) === 1 ? `last_sync_error:${cursorKey}` : `organization:${organizationId}:last_sync_error:${cursorKey}`)?.value ?? null,
  };
}

function integrationPayload(db, integrations, organizationId = 1, syncRunner = null) {
  const outlookConfig = integrations?.outlook ?? {};
  const outlook = outlookConfig.status?.(organizationId) ?? {
    configured: Boolean(outlookConfig.configured),
    connected: Boolean(outlookConfig.connected ?? outlookConfig.configured),
    accountEmail: outlookConfig.accountEmail ?? null,
    mailboxCount: 0,
    ...sourceSyncSummary(db, organizationId, outlookConfig.cursorKey),
  };
  const gmail = integrations?.gmail?.status?.(organizationId) ?? {
    configured: false,
    connected: false,
    accountEmail: null,
    lastSuccessAt: null,
    lastError: null,
  };
  const runtime = typeof syncRunner?.status === 'function'
    ? syncRunner.status(organizationId)
    : {
        inProgress: false,
        startedAt: null,
        completedAt: null,
        sequence: 0,
        outcome: null,
      };
  return { outlook: { ...outlook, ...runtime }, gmail };
}

function mailboxSummary(details) {
  const providers = Object.entries(details)
    .filter(([, integration]) => integration.connected)
    .map(([provider]) => provider);
  let label = 'No mailbox connected';
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
  if (body.hasAttachments !== undefined && typeof body.hasAttachments !== 'boolean') {
    return { error: 'Choose whether attachments are required.', field: 'hasAttachments' };
  }
  const hasAttachments = body.hasAttachments === true;

  if (!name || name.length > 80) return { error: 'Enter a rule name of 80 characters or fewer.', field: 'name' };
  if (keywords.length > 240) return { error: 'Keywords must be 240 characters or fewer.', field: 'keywords' };
  if (senderFilter.length > 160) return { error: 'The sender filter is too long.', field: 'senderFilter' };
  if (!keywords && !senderFilter) return { error: 'Enter keywords or a sender filter.', field: 'keywords' };
  if (!Number.isInteger(assigneeId) || assigneeId < 1) return { error: 'Choose an assignee.', field: 'assigneeId' };
  if (!isRulePriority(priority)) return { error: RULE_PRIORITY_ERROR, field: 'priority' };
  return { value: { name, keywords, senderFilter, assigneeId, priority, hasAttachments } };
}

const editableRuleFields = ['name', 'keywords', 'senderFilter', 'assigneeId', 'priority', 'enabled', 'hasAttachments'];

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
    hasAttachments: Boolean(current.has_attachments),
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
  if (hasField('hasAttachments')) {
    if (typeof body.hasAttachments !== 'boolean') {
      return { error: 'Choose whether attachments are required.', field: 'hasAttachments' };
    }
    value.hasAttachments = body.hasAttachments;
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
  if (!isRulePriority(value.priority)) {
    return { error: RULE_PRIORITY_ERROR, field: 'priority' };
  }
  const changed = (
    value.name !== current.name
    || value.keywords !== current.keywords
    || value.senderFilter !== current.sender_filter
    || value.assigneeId !== Number(current.assignee_id)
    || value.priority !== Number(current.priority)
    || value.enabled !== Boolean(current.enabled)
    || value.hasAttachments !== Boolean(current.has_attachments)
  );
  if (!changed) return { error: 'Change at least one rule field.' };
  return { value };
}

async function runSync(syncRunner, organizationId) {
  if (typeof syncRunner === 'function') return syncRunner(organizationId);
  return syncRunner.run(organizationId);
}

export function createApp({
  db,
  syncRunner,
  mode = 'demo',
  integrations = {},
  entraAuth = null,
  entraConfig = null,
  cookieSecure = process.env.NODE_ENV === 'production',
  staticDir = publicDirectory,
  clock = () => new Date(),
}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/vendor/chart.js', (request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.sendFile(chartBundle);
  });

  app.get('/vendor/animejs.js', (request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.type('text/javascript').sendFile(animeBundle);
  });

  const identity = entraAuth ?? createEntraAuth({ db, config: entraConfig, clock });

  app.get('/api/auth/outlook/start', async (request, response, next) => {
    try {
      response.redirect(303, await identity.authorizationUrl({ redirectPath: request.query?.returnTo }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/auth/outlook/callback', async (request, response) => {
    try {
      const result = await identity.callback({
        code: request.query?.code,
        state: request.query?.state,
        error: request.query?.error,
      });
      const session = createSession(db, result.user.id, clock(), result.user.organization_id);
      response.setHeader('set-cookie', sessionCookie(session.id, cookieSecure));
      response.redirect(303, result.redirectPath || '/');
    } catch (error) {
      response.redirect(303, `/?auth=error&message=${encodeURIComponent(error.expose ? error.message : 'Microsoft sign-in failed.')}`);
    }
  });

  app.get('/api/organization-logos/:assetId', (request, response) => {
    const logo = getLogo({ db, assetId: resourceId(request.params.assetId) });
    if (!logo) return notFound(response, 'Organization logo not found.');
    response.setHeader('Content-Type', logo.mime_type);
    response.setHeader('Content-Length', String(logo.content.length));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.end(logo.content);
  });

  app.use('/api', requireUser(db));

  app.post('/api/logout', (request, response) => {
    deleteSession(db, sessionIdFromRequest(request));
    response.setHeader('set-cookie', expiredSessionCookie(cookieSecure));
    response.status(204).end();
  });

  app.get('/api/bootstrap', (request, response) => {
    const payload = {
      user: safeUser(request.user),
      organization: request.user.organization_id ? organizationPayload({
        id: request.user.organization_id,
        name: request.user.organization_name,
        domain: request.user.organization_domain,
        status: request.user.organization_status,
        timezone: request.user.organization_timezone,
        logo_asset_id: request.user.logo_asset_id,
      }) : null,
      mode,
    };

    if (request.user.effectiveRole === 'org_admin') {
      const integrationDetails = integrationPayload(db, integrations, request.user.organization_id, syncRunner);
      payload.members = listMembers(db, request.user.organization_id);
      payload.departments = listDepartments(db, request.user.organization_id);
      payload.settings = getWorkspaceSettings(db, request.user.organization_id);
      payload.integrations = integrationDetails;
      payload.mailboxSummary = mailboxSummary(integrationDetails);
    } else if (request.user.effectiveRole === 'dep_admin') {
      const departmentId = request.user.headed_department_id;
      const notifications = listNotifications(db, request.user.id, request.user.organization_id);
      payload.department = listDepartments(db, request.user.organization_id)
        .find(item => item.id === Number(departmentId)) ?? null;
      payload.emails = listEmails(db, request.user);
      payload.rules = listRules(db, request.user.organization_id, departmentId);
      payload.escalations = {
        intervalHours: getWorkspaceSettings(db, request.user.organization_id).escalationIntervalHours,
        recipients: listEscalationRecipients(db, request.user.organization_id, departmentId),
      };
      payload.activity = listActivity(db, request.user.organization_id, departmentId);
      payload.notifications = notifications;
      payload.unreadCount = notifications.filter(item => !item.readAt).length;
      payload.pendingTasks = pendingTaskSummary(db, request.user, payload.unreadCount);
      payload.team = db.prepare(`
        SELECT * FROM users
        WHERE organization_id = ? AND department_id = ? AND role = 'member'
          AND account_status = 'active'
        ORDER BY name COLLATE NOCASE, id
      `).all(request.user.organization_id, departmentId).map(row => safeUser({
        ...row,
        effectiveRole: Number(row.id) === Number(request.user.id) ? 'dep_admin' : 'member',
      }));
    } else if (request.user.effectiveRole === 'member') {
      const notifications = listNotifications(db, request.user.id, request.user.organization_id);
      payload.emails = listEmails(db, request.user);
      payload.notifications = notifications;
      payload.unreadCount = notifications.filter(item => !item.readAt).length;
      payload.pendingTasks = pendingTaskSummary(db, request.user, payload.unreadCount);
    }

    if (request.user.effectiveRole === 'platform_admin') {
      payload.organizations = listOrganizations(db);
    }

    response.json(payload);
  });

  app.get('/api/metrics/platform', requirePlatformAdmin, (request, response, next) => {
    try {
      const period = normalizeMetricsQuery({
        query: request.query,
        timezone: 'Asia/Kolkata',
        now: clock(),
      });
      response.json(getPlatformMetrics({ db, period }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/metrics/organization', requireOrgAdmin, (request, response, next) => {
    try {
      let departmentId = request.query?.departmentId ?? null;
      if (departmentId !== null && !['unassigned', 'organization-wide'].includes(departmentId)) {
        departmentId = resourceId(departmentId);
        if (!departmentId || !db.prepare(`
          SELECT 1 FROM departments WHERE id = ? AND organization_id = ?
        `).get(departmentId, request.user.organization_id)) {
          return notFound(response, 'Metrics filter not found.');
        }
      }
      const period = normalizeMetricsQuery({
        query: request.query,
        timezone: request.user.organization_timezone ?? 'Asia/Kolkata',
        now: clock(),
      });
      response.json(getOrganizationMetrics({
        db,
        organizationId: Number(request.user.organization_id),
        departmentId,
        period,
        now: clock(),
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/metrics/department', requireDepAdmin, (request, response, next) => {
    try {
      const employeeId = request.query?.employeeId == null ? null : resourceId(request.query.employeeId);
      if (request.query?.employeeId != null && !employeeId) {
        return notFound(response, 'Metrics filter not found.');
      }
      const period = normalizeMetricsQuery({
        query: request.query,
        timezone: request.user.organization_timezone ?? 'Asia/Kolkata',
        now: clock(),
      });
      response.json(getDepartmentMetrics({
        db,
        organizationId: Number(request.user.organization_id),
        departmentId: Number(request.user.headed_department_id),
        employeeId,
        period,
        now: clock(),
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/metrics/me', (request, response, next) => {
    try {
      if (request.user.effectiveRole !== 'member') {
        response.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Member access is required.' },
        });
        return;
      }
      const period = normalizeMetricsQuery({
        query: request.query,
        timezone: request.user.organization_timezone ?? 'Asia/Kolkata',
        now: clock(),
      });
      response.json(getMemberMetrics({
        db,
        organizationId: Number(request.user.organization_id),
        userId: Number(request.user.id),
        period,
        now: clock(),
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/platform/organizations', requirePlatformAdmin, (request, response) => {
    response.json({ organizations: listOrganizations(db) });
  });

  app.post('/api/platform/organizations', requirePlatformAdmin, (request, response, next) => {
    try {
      response.status(201).json({ organization: createOrganization({
        db,
        input: request.body,
        actorId: request.user.id,
        now: clock(),
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/platform/organizations/:id', requirePlatformAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Organization not found.');
      const current = getOrganization(db, id);
      if (!current) return notFound(response, 'Organization not found.');
      const organization = updateOrganization({ db, organizationId: id, input: { ...request.body, entraTenantId: current.entraTenantId }, now: clock() });
      response.json({ organization });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/platform/organizations/:id/archive', requirePlatformAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Organization not found.');
      response.json({ organization: setOrganizationStatus({
        db,
        organizationId: id,
        status: 'archived',
        actorId: request.user.id,
        now: clock(),
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/platform/organizations/:id/restore', requirePlatformAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Organization not found.');
      response.json({ organization: setOrganizationStatus({
        db,
        organizationId: id,
        status: 'active',
        actorId: request.user.id,
        now: clock(),
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/organization', requireOrgAdmin, (request, response) => {
    response.json({ organization: getOrganization(db, request.user.organization_id) });
  });

  app.patch('/api/organization', requireOrgAdmin, (request, response, next) => {
    try {
      const current = getOrganization(db, request.user.organization_id);
      response.json({ organization: updateOrganization({
        db,
        organizationId: request.user.organization_id,
        input: { ...request.body, entraTenantId: current.entraTenantId },
        updateAdmin: false,
        now: clock(),
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/members', requireOrgAdmin, (request, response) => {
    response.json({ members: listMembers(db, request.user.organization_id) });
  });

  app.post('/api/members', requireOrgAdmin, (request, response, next) => {
    try {
      response.status(201).json({ member: createMember({
        db,
        organizationId: request.user.organization_id,
        input: request.body,
        actorId: request.user.id,
        now: clock(),
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/members/:id', requireOrgAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Member not found.');
      response.json({ member: updateMember({
        db,
        organizationId: request.user.organization_id,
        memberId: id,
        input: request.body,
        actorId: request.user.id,
        now: clock(),
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/integrations/outlook/authorize', requireOrgAdmin, (request, response, next) => {
    try {
      const authorizationUrl = integrations.outlook?.authorizationUrl?.({
        sessionId: request.sessionId,
        organizationId: request.user.organization_id,
      });
      if (!authorizationUrl) {
        const error = new Error('Microsoft 365 connection is not configured on this server.');
        error.status = 503;
        error.code = 'OUTLOOK_NOT_CONFIGURED';
        error.expose = true;
        throw error;
      }
      response.redirect(303, authorizationUrl);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/integrations/outlook/callback', requireOrgAdmin, async (request, response) => {
    const state = typeof request.query?.state === 'string' ? request.query.state : '';
    if (!integrations.outlook?.completeAuthorization || !state) {
      response.redirect(303, '/?integration=outlook-error');
      return;
    }
    try {
      await integrations.outlook.completeAuthorization({
        sessionId: request.sessionId,
        state,
        tenantId: request.query?.tenant,
        adminConsent: request.query?.admin_consent,
        providerError: request.query?.error,
      });
      response.redirect(303, '/?integration=outlook-connected');
    } catch {
      response.redirect(303, '/?integration=outlook-error');
    }
  });

  app.delete('/api/integrations/outlook', requireOrgAdmin, (request, response, next) => {
    try {
      if (!integrations.outlook?.disconnect) return notFound(response, 'Microsoft 365 connection is not available.');
      integrations.outlook.disconnect({ organizationId: request.user.organization_id });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/integrations/gmail/authorize', requireAdmin, (request, response, next) => {
    try {
      const authorizationUrl = integrations.gmail?.authorizationUrl?.({
        sessionId: request.sessionId,
      });
      if (!authorizationUrl) {
        const error = new Error('Gmail connection is not configured on this server.');
        error.status = 503;
        error.code = 'GMAIL_NOT_CONFIGURED';
        error.expose = true;
        throw error;
      }
      response.redirect(303, authorizationUrl);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/integrations/gmail/callback', requireAdmin, async (request, response) => {
    const state = typeof request.query?.state === 'string' ? request.query.state : '';
    const code = typeof request.query?.code === 'string' ? request.query.code : '';
    if (!integrations.gmail?.completeAuthorization || !state) {
      response.redirect(303, '/?integration=gmail-error');
      return;
    }

    try {
      await integrations.gmail?.completeAuthorization?.({
        sessionId: request.sessionId,
        state,
        code: request.query?.error ? '' : code,
      });
      if (!code || request.query?.error) throw new Error('Gmail authorization was cancelled.');
      response.redirect(303, '/?integration=gmail-connected');
    } catch {
      response.redirect(303, '/?integration=gmail-error');
    }
  });

  app.delete('/api/integrations/gmail', requireAdmin, async (request, response, next) => {
    try {
      if (!integrations.gmail?.disconnect) {
        return notFound(response, 'Gmail connection is not available.');
      }
      await integrations.gmail.disconnect({ organizationId: request.user.organization_id });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/departments', requireOrgAdmin, (request, response, next) => {
    try {
      const department = createDepartment({
        db,
        name: request.body?.name,
        sharedMailbox: request.body?.sharedMailbox,
        organizationId: request.user.organization_id,
        now: clock(),
      });
      response.status(201).json({ department });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/departments/:id', requireOrgAdmin, (request, response, next) => {
    try {
      const departmentId = resourceId(request.params.id);
      if (!departmentId) return notFound(response, 'Department not found.');
      response.json({ department: updateDepartment({
        db,
        departmentId,
        name: request.body?.name,
        sharedMailbox: request.body?.sharedMailbox,
        organizationId: request.user.organization_id,
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/departments/:id', requireOrgAdmin, (request, response, next) => {
    try {
      const departmentId = resourceId(request.params.id);
      if (!departmentId) return notFound(response, 'Department not found.');
      response.json({
        department: deleteDepartment({
          db,
          departmentId,
          organizationId: request.user.organization_id,
          actorId: request.user.id,
          now: clock(),
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/departments/:id/head', requireOrgAdmin, (request, response, next) => {
    try {
      const departmentId = resourceId(request.params.id);
      const memberId = resourceId(request.body?.memberId);
      if (!departmentId) return notFound(response, 'Department not found.');
      if (!memberId) return validationError(response, 'Choose a valid department member.', 'memberId');
      response.json({
        department: setDepartmentHead({
          db,
          departmentId,
          memberId,
          organizationId: request.user.organization_id,
          actorId: request.user.id,
          now: clock(),
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/departments/:id/members', requireOrgAdmin, (request, response, next) => {
    try {
      const departmentId = resourceId(request.params.id);
      if (!departmentId || !db.prepare('SELECT id FROM departments WHERE id = ? AND organization_id = ?').get(departmentId, request.user.organization_id)) {
        return notFound(response, 'Department not found.');
      }
      response.json({ members: listDepartmentMembers(db, departmentId, request.user.organization_id) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/team/:id/department', requireOrgAdmin, (request, response, next) => {
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
          userId,
          departmentId,
          organizationId: request.user.organization_id,
          actorId: request.user.id,
          now: clock(),
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/settings', requireOrgAdmin, (request, response, next) => {
    try {
      response.json({
        settings: updateWorkspaceSettings({
          db,
          organizationId: request.user.organization_id,
          timeUnassignedHours: Number(request.body?.timeUnassignedHours),
          timeAssignedUnmarkedHours: Number(request.body?.timeAssignedUnmarkedHours),
          escalationIntervalHours: request.body?.escalationIntervalHours == null
            ? undefined : Number(request.body.escalationIntervalHours),
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/escalations', requireDepAdmin, (request, response) => {
    const organizationId = Number(request.user.organization_id);
    const departmentId = Number(request.user.headed_department_id);
    response.json({
      intervalHours: getWorkspaceSettings(db, organizationId).escalationIntervalHours,
      recipients: listEscalationRecipients(db, organizationId, departmentId),
      deliveries: listEscalationDeliveries(db, organizationId, departmentId),
    });
  });

  app.put('/api/escalations', requireDepAdmin, (request, response, next) => {
    try {
      const recipients = request.body?.recipients;
      if (!Array.isArray(recipients)) return validationError(response, 'Provide an ordered list of escalation recipients.', 'recipients');
      if (!recipients.every(value => typeof value === 'string')) {
        return validationError(response, 'Each escalation recipient must be an email address.', 'recipients');
      }
      const organizationId = Number(request.user.organization_id);
      const departmentId = Number(request.user.headed_department_id);
      response.json({
        intervalHours: getWorkspaceSettings(db, organizationId).escalationIntervalHours,
        recipients: replaceEscalationRecipients({
          db, organizationId, departmentId, recipients, now: clock(),
        }),
        deliveries: listEscalationDeliveries(db, organizationId, departmentId),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/sync', requireDepAdmin, async (request, response, next) => {
    try {
      const result = await runSync(syncRunner, request.user.organization_id);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/rules', requireDepAdmin, (request, response, next) => {
    try {
      const parsed = parseRule(request.body ?? {});
      if (parsed.error) return validationError(response, parsed.error, parsed.field);
      const member = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND organization_id = ? AND department_id = ?
          AND role = 'member' AND account_status = 'active'
      `).get(parsed.value.assigneeId, request.user.organization_id, request.user.headed_department_id);
      if (!member) return validationError(response, 'Choose a valid team member.', 'assigneeId');

      const now = new Date().toISOString();
      const id = runTransaction(db, () => {
        const result = db.prepare(`
          INSERT INTO rules
            (name, keywords, sender_filter, assignee_id, priority, enabled, created_at,
             organization_id, department_id, has_attachments)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
        `).run(
          parsed.value.name,
          parsed.value.keywords,
          parsed.value.senderFilter,
          parsed.value.assigneeId,
          parsed.value.priority,
          now,
          request.user.organization_id,
          request.user.headed_department_id,
          parsed.value.hasAttachments ? 1 : 0,
        );
        const ruleId = Number(result.lastInsertRowid);
        applyRuleToUnassigned(db, ruleId, request.user.organization_id, request.user.headed_department_id);
        return ruleId;
      });
      response.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/rules/:id', requireDepAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Rule not found.');

      const current = db.prepare(`
        SELECT * FROM rules
        WHERE id = ? AND organization_id = ? AND department_id = ?
      `).get(id, request.user.organization_id, request.user.headed_department_id);
      if (!current) return notFound(response, 'Rule not found.');

      const body = request.body && !Array.isArray(request.body) ? request.body : {};
      const parsed = parseRulePatch(body, current);
      if (parsed.error) return validationError(response, parsed.error, parsed.field);

      const member = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND organization_id = ? AND department_id = ?
          AND role = 'member' AND account_status = 'active'
      `).get(parsed.value.assigneeId, request.user.organization_id, request.user.headed_department_id);
      if (!member) return validationError(response, 'Choose a valid team member.', 'assigneeId');

      runTransaction(db, () => {
        db.prepare(`
          UPDATE rules
          SET name = ?, keywords = ?, sender_filter = ?, assignee_id = ?, priority = ?, enabled = ?,
              has_attachments = ?
          WHERE id = ? AND organization_id = ? AND department_id = ?
        `).run(
          parsed.value.name,
          parsed.value.keywords,
          parsed.value.senderFilter,
          parsed.value.assigneeId,
          parsed.value.priority,
          parsed.value.enabled ? 1 : 0,
          parsed.value.hasAttachments ? 1 : 0,
          id,
          request.user.organization_id,
          request.user.headed_department_id,
        );
        if (parsed.value.enabled) {
          applyRuleToUnassigned(db, id, request.user.organization_id, request.user.headed_department_id);
        }
      });
      response.json({
        rule: getRule(db, request.user.organization_id, request.user.headed_department_id, id),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/rules/:id', requireDepAdmin, (request, response) => {
    const id = resourceId(request.params.id);
    if (!id) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found.' } });
      return;
    }
    const result = db.prepare(`
      DELETE FROM rules WHERE id = ? AND organization_id = ? AND department_id = ?
    `).run(id, request.user.organization_id, request.user.headed_department_id);
    if (!result.changes) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found.' } });
      return;
    }
    response.status(204).end();
  });

  app.get('/api/conversations/:id/messages', (request, response) => {
    const conversationId = resourceId(request.params.id);
    if (!conversationId || !visibleConversationRow(db, request.user, conversationId)) {
      return notFound(response, 'Conversation not found.');
    }
    const rows = db.prepare(`
      SELECT emails.*,
        departments.name AS email_department,
        departments.shared_mailbox AS department_mailbox,
        assignee.email AS assignee_email,
        assignee.name AS assignee_name,
        assignee.initials AS assignee_initials,
        assignee.department AS assignee_department,
        completed.name AS completed_by_name
      FROM emails
      LEFT JOIN departments ON departments.id = emails.department_id
      LEFT JOIN users assignee ON assignee.id = emails.assignee_id
      LEFT JOIN users completed ON completed.id = emails.completed_by
      WHERE emails.conversation_id = ? AND emails.organization_id = ?
      ORDER BY emails.received_at, emails.id
    `).all(conversationId, request.user.organization_id);
    response.json({ messages: rows.map(emailFromRow) });
  });

  app.get('/api/emails/:id/open-link', async (request, response, next) => {
    try {
      const emailId = resourceId(request.params.id);
      if (!emailId) return notFound(response, 'Email not found.');
      const email = visibleEmailRow(db, request.user, emailId);
      if (!email) return notFound(response, 'Email not found.');

      const provider = String(email.provider || 'outlook').toLocaleLowerCase();
      if (provider !== 'outlook') {
        const webUrl = safeHttpUrl(email.outlook_url);
        if (!webUrl) {
          response.status(409).json({
            error: { code: 'EMAIL_LINK_UNAVAILABLE', message: 'This email has no available web link.' },
          });
          return;
        }
        response.json({ webUrl });
        return;
      }

      const immutableId = outlookImmutableId(email);
      if (!immutableId) return notFound(response, 'Email not found.');
      if (typeof integrations?.outlook?.resolveWebLink !== 'function') {
        response.status(503).json({
          error: {
            code: 'OUTLOOK_LINK_NOT_CONFIGURED',
            message: 'Microsoft Graph is not configured to open this message.',
          },
        });
        return;
      }
      const webUrl = safeOutlookUrl(await integrations.outlook.resolveWebLink({
        organizationId: Number(request.user.organization_id),
        mailboxAddress: email.mailbox_address,
        immutableId,
        subject: email.subject,
        receivedAt: email.received_at,
      }));
      if (!webUrl) {
        response.status(502).json({
          error: { code: 'OUTLOOK_LINK_FAILED', message: 'Outlook returned an invalid message link.' },
        });
        return;
      }
      response.json({ webUrl });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/emails/:id/assign', requireDepAdmin, (request, response, next) => {
    try {
      const emailId = resourceId(request.params.id);
      const assigneeId = resourceId(request.body?.assigneeId);
      const priority = Number(request.body?.priority ?? 30);
      if (!emailId) return notFound(response, 'Email not found.');
      if (!assigneeId) {
        return validationError(response, 'Choose a valid team member.', 'assigneeId');
      }
      if (!isRulePriority(priority)) return validationError(response, RULE_PRIORITY_ERROR, 'priority');

      const result = assignEmailManually({
        db,
        emailId,
        assigneeId,
        actorId: Number(request.user.id),
        organizationId: request.user.organization_id,
        departmentId: request.user.headed_department_id,
        priority,
        now: clock(),
      });
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
      if (!['member', 'dep_admin'].includes(request.user.effectiveRole)) {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the assignee can complete this email.' } });
        return;
      }

      const emailId = resourceId(request.params.id);
      if (!emailId) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
        return;
      }
      const email = db.prepare('SELECT id, assignee_id FROM emails WHERE id = ? AND organization_id = ?').get(emailId, request.user.organization_id);
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
        organizationId: request.user.organization_id,
        now: clock(),
      });
      response.json({ email: completed });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/notifications/read-all', (request, response) => {
    const result = db.prepare(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, ?)
      WHERE user_id = ? AND organization_id = ? AND read_at IS NULL
    `).run(clock().toISOString(), request.user.id, request.user.organization_id);
    response.json({ read: true, count: result.changes });
  });

  app.post('/api/notifications/:id/read', (request, response) => {
    const id = resourceId(request.params.id);
    if (!id) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }
    const notification = db.prepare('SELECT user_id FROM notifications WHERE id = ? AND organization_id = ?').get(id, request.user.organization_id);
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
