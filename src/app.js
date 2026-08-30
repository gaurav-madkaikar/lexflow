import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import {
  createSession,
  deleteSession,
  expiredSessionCookie,
  requireAdmin,
  requireCfo,
  requireUser,
  sessionCookie,
  sessionIdFromRequest,
  verifyPassword
} from './auth.js';
import { financeDashboard } from './finance-dashboard.js';
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
import {
  adminVacationSummary,
  getBriefing,
  listBriefings,
  reviewBriefing,
  updateMicrosoftPrincipal,
  vacationPayload,
} from './vacation.js';

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const animeDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../node_modules/animejs/dist/bundles'
);

function safeUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    initials: row.initials,
    department: row.department,
    role: row.role
  };
}

function emailFromRow(row) {
  const provider = row.provider || 'outlook';
  return {
    id: Number(row.id),
    subject: row.subject,
    sender: { name: row.sender_name, address: row.sender_address },
    preview: row.preview,
    receivedAt: row.received_at,
    provider,
    mailboxAddress: row.mailbox_address ?? null,
    webUrl: row.outlook_url,
    outlookUrl: row.outlook_url,
    status: row.status,
    assignedAt: row.assigned_at,
    department: row.assignee_department ?? null,
    assignee: row.assignee_id ? {
      id: Number(row.assignee_id),
      email: row.assignee_email,
      name: row.assignee_name,
      initials: row.assignee_initials,
      department: row.assignee_department
    } : null,
    completedBy: row.completed_by ? {
      id: Number(row.completed_by),
      name: row.completed_by_name
    } : null,
    completedAt: row.completed_at,
    vacationHold: row.hold_id ? {
      intendedUserId: Number(row.hold_user_id),
      intendedUserName: row.hold_user_name,
      heldAt: row.hold_at,
    } : null
  };
}

function listEmails(db, user) {
  const ownership = user.role === 'admin' ? '' : 'WHERE emails.assignee_id = ?';
  const statement = db.prepare(`
    SELECT emails.*,
      assignee.email AS assignee_email,
      assignee.name AS assignee_name,
      assignee.initials AS assignee_initials,
      assignee.department AS assignee_department,
      completed.name AS completed_by_name,
      hold.id AS hold_id,
      hold.intended_user_id AS hold_user_id,
      hold.held_at AS hold_at,
      hold_user.name AS hold_user_name
    FROM emails
    LEFT JOIN users AS assignee ON assignee.id = emails.assignee_id
    LEFT JOIN users AS completed ON completed.id = emails.completed_by
    LEFT JOIN vacation_email_holds AS hold ON hold.email_id = emails.id AND hold.status = 'held'
    LEFT JOIN users AS hold_user ON hold_user.id = hold.intended_user_id
    ${ownership}
    ORDER BY emails.received_at DESC, emails.id DESC
  `);
  const rows = user.role === 'admin' ? statement.all() : statement.all(user.id);
  return rows.map(emailFromRow);
}

function listNotifications(db, userId) {
  return db.prepare(`
    SELECT id, email_id, briefing_id, kind, message, read_at, created_at
    FROM notifications
    WHERE user_id = ? AND read_at IS NULL
    ORDER BY created_at DESC, id DESC
  `).all(userId).map(row => ({
    id: Number(row.id),
    emailId: row.email_id === null ? null : Number(row.email_id),
    briefingId: row.briefing_id === null ? null : Number(row.briefing_id),
    kind: row.kind,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  }));
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
    JOIN users ON users.id = rules.assignee_id
`;

function listRules(db) {
  return db.prepare(`
    ${ruleSelect}
    ORDER BY rules.priority, rules.id
  `).all().map(ruleFromRow);
}

function getRule(db, id) {
  const row = db.prepare(`${ruleSelect} WHERE rules.id = ?`).get(id);
  return row ? ruleFromRow(row) : null;
}

function listActivity(db) {
  return db.prepare(`
    SELECT activity.*, users.name AS actor_name, users.initials AS actor_initials,
      emails.subject
    FROM activity
    LEFT JOIN users ON users.id = activity.actor_id
    LEFT JOIN emails ON emails.id = activity.email_id
    ORDER BY activity.created_at DESC, activity.id DESC
    LIMIT 30
  `).all().map(row => ({
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

function syncSummary(db) {
  const values = Object.fromEntries(
    db.prepare('SELECT key, value FROM sync_state').all().map(row => [row.key, row.value])
  );
  return {
    lastSuccessAt: values.last_sync_at ?? null,
    lastError: values.last_sync_error ?? null
  };
}

function sourceSyncSummary(db, cursorKey) {
  if (!cursorKey) return { lastSuccessAt: null, lastError: null };
  return {
    lastSuccessAt: db.prepare('SELECT value FROM sync_state WHERE key = ?')
      .get(`last_sync_at:${cursorKey}`)?.value ?? null,
    lastError: db.prepare('SELECT value FROM sync_state WHERE key = ?')
      .get(`last_sync_error:${cursorKey}`)?.value ?? null,
  };
}

function integrationPayload(db, integrations) {
  const outlookConfig = integrations?.outlook ?? {};
  const outlookSync = sourceSyncSummary(db, outlookConfig.cursorKey);
  const outlook = {
    configured: Boolean(outlookConfig.configured),
    connected: Boolean(outlookConfig.configured),
    accountEmail: outlookConfig.accountEmail ?? null,
    ...outlookSync,
  };
  const gmail = integrations?.gmail?.status?.() ?? {
    configured: false,
    connected: false,
    accountEmail: null,
    lastSuccessAt: null,
    lastError: null,
  };
  return { outlook, gmail };
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

async function runSync(syncRunner) {
  if (typeof syncRunner === 'function') return syncRunner();
  return syncRunner.run();
}

export function createApp({
  db,
  syncRunner,
  mode = 'demo',
  integrations = {},
  vacationRunner = null,
  cookieSecure = process.env.NODE_ENV === 'production',
  staticDir = publicDirectory,
  clock = () => new Date(),
}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.post('/api/login', async (request, response, next) => {
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
      const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
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

  app.use('/api', requireUser(db));

  app.post('/api/logout', (request, response) => {
    deleteSession(db, sessionIdFromRequest(request));
    response.setHeader('set-cookie', expiredSessionCookie(cookieSecure));
    response.status(204).end();
  });

  app.get('/api/bootstrap', (request, response) => {
    if (request.user.role === 'cfo') {
      response.json({
        user: safeUser(request.user),
        mode: 'finance',
      });
      return;
    }
    const notifications = listNotifications(db, request.user.id);
    const integrationDetails = integrationPayload(db, integrations);
    const payload = {
      user: safeUser(request.user),
      mode,
      mailboxSummary: mailboxSummary(integrationDetails),
      emails: listEmails(db, request.user),
      notifications,
      unreadCount: notifications.filter(item => !item.readAt).length
    };

    if (request.user.role === 'member') {
      payload.vacation = vacationPayload(db, request.user.id);
    }

    if (request.user.role === 'admin') {
      payload.rules = listRules(db);
      payload.team = db.prepare("SELECT * FROM users WHERE role = 'member' ORDER BY name")
        .all().map(member => ({
          ...safeUser(member),
          microsoftPrincipal: member.microsoft_principal ?? null,
          vacation: adminVacationSummary(db, member.id),
        }));
      payload.activity = listActivity(db);
      payload.sync = syncSummary(db);
      payload.departments = listDepartments(db);
      payload.settings = getWorkspaceSettings(db);
      payload.integrations = integrationDetails;
    }

    response.json(payload);
  });

  app.get('/api/finance/dashboard', requireCfo, (request, response, next) => {
    try {
      response.json(financeDashboard({
        period: String(request.query?.period ?? 'mtd').toLocaleLowerCase(),
        reportingCurrency: String(request.query?.reportingCurrency ?? 'USD').toLocaleUpperCase(),
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/vacation', (request, response) => {
    if (request.user.role !== 'member') {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vacation briefings are available to members only.' } });
      return;
    }
    response.json({ vacation: vacationPayload(db, request.user.id) });
  });

  app.post('/api/vacation/refresh', async (request, response, next) => {
    if (request.user.role !== 'member') {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vacation briefings are available to members only.' } });
      return;
    }
    try {
      if (!vacationRunner?.refreshUser) {
        throw Object.assign(new Error('Microsoft Vacation Mode is not configured.'), { status: 503, code: 'MICROSOFT_NOT_CONFIGURED', expose: true });
      }
      response.json({ vacation: await vacationRunner.refreshUser(request.user.id) });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/vacation/manual', async (request, response, next) => {
    if (request.user.role !== 'member') {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vacation Mode controls are available to members only.' } });
      return;
    }
    try {
      if (!vacationRunner?.setManualVacation) {
        throw Object.assign(new Error('Vacation Mode controls are unavailable.'), { status: 503, code: 'VACATION_UNAVAILABLE', expose: true });
      }
      const enabled = request.body?.enabled;
      if (typeof enabled !== 'boolean') return validationError(response, 'Choose whether Vacation Mode is on or off.', 'enabled');
      response.json({ vacation: await vacationRunner.setManualVacation(request.user.id, {
        enabled,
        startsAt: request.body?.startsAt,
        endsAt: request.body?.endsAt,
      }) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/vacation/briefings', (request, response) => {
    if (request.user.role !== 'member') {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vacation briefings are available to members only.' } });
      return;
    }
    response.json({ briefings: listBriefings(db, request.user.id) });
  });

  app.get('/api/vacation/briefings/:id', (request, response) => {
    if (request.user.role !== 'member') {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vacation briefings are available to members only.' } });
      return;
    }
    const briefing = getBriefing(db, request.user.id, resourceId(request.params.id));
    if (!briefing) return notFound(response, 'Return briefing not found.');
    response.json({ briefing });
  });

  app.post('/api/vacation/briefings/:id/reviewed', (request, response) => {
    if (request.user.role !== 'member') {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Vacation briefings are available to members only.' } });
      return;
    }
    const id = resourceId(request.params.id);
    if (!id || !reviewBriefing(db, request.user.id, id, clock())) return notFound(response, 'Return briefing not found.');
    response.json({ briefing: getBriefing(db, request.user.id, id) });
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
      await integrations.gmail.disconnect();
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/departments', requireAdmin, (request, response, next) => {
    try {
      const department = createDepartment({
        db,
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
        member: moveMemberToDepartment({ db, userId, departmentId }),
      });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/team/:id/microsoft-principal', requireAdmin, (request, response, next) => {
    try {
      const userId = resourceId(request.params.id);
      if (!userId) return notFound(response, 'Team member not found.');
      const principal = updateMicrosoftPrincipal(db, userId, request.body?.microsoftPrincipal);
      const member = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      response.json({
        member: {
          ...safeUser(member),
          microsoftPrincipal: principal,
          vacation: adminVacationSummary(db, userId),
        },
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
      response.json(await runSync(syncRunner));
    } catch (error) {
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
      const member = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'member'")
        .get(parsed.value.assigneeId);
      if (!member) return validationError(response, 'Choose a valid team member.', 'assigneeId');

      const now = new Date().toISOString();
      const id = runTransaction(db, () => {
        const result = db.prepare(`
          INSERT INTO rules (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(
          parsed.value.name,
          parsed.value.keywords,
          parsed.value.senderFilter,
          parsed.value.assigneeId,
          parsed.value.priority,
          now
        );
        const ruleId = Number(result.lastInsertRowid);
        applyRuleToUnassigned(db, ruleId);
        return ruleId;
      });
      response.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/rules/:id', requireAdmin, (request, response, next) => {
    try {
      const id = resourceId(request.params.id);
      if (!id) return notFound(response, 'Rule not found.');

      const current = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
      if (!current) return notFound(response, 'Rule not found.');

      const body = request.body && !Array.isArray(request.body) ? request.body : {};
      const parsed = parseRulePatch(body, current);
      if (parsed.error) return validationError(response, parsed.error, parsed.field);

      const member = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'member'")
        .get(parsed.value.assigneeId);
      if (!member) return validationError(response, 'Choose a valid team member.', 'assigneeId');

      runTransaction(db, () => {
        db.prepare(`
          UPDATE rules
          SET name = ?, keywords = ?, sender_filter = ?, assignee_id = ?, priority = ?, enabled = ?
          WHERE id = ?
        `).run(
          parsed.value.name,
          parsed.value.keywords,
          parsed.value.senderFilter,
          parsed.value.assigneeId,
          parsed.value.priority,
          parsed.value.enabled ? 1 : 0,
          id,
        );
        if (parsed.value.enabled) applyRuleToUnassigned(db, id);
      });
      response.json({ rule: getRule(db, id) });
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
    const result = db.prepare('DELETE FROM rules WHERE id = ?').run(id);
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
      if (request.user.role !== 'member') {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the assignee can complete this email.' } });
        return;
      }

      const emailId = resourceId(request.params.id);
      if (!emailId) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
        return;
      }
      const email = db.prepare('SELECT id, assignee_id FROM emails WHERE id = ?').get(emailId);
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
        now: clock(),
      });
      response.json({ email: completed });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/notifications/:id/read', (request, response) => {
    const id = resourceId(request.params.id);
    if (!id) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }
    const notification = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(id);
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
      WHERE id = ? AND user_id = ?
    `).run(new Date().toISOString(), id, request.user.id);
    if (!result.changes) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }
    response.json({ id, read: true });
  });

  app.use('/api', (request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });

  app.use('/vendor/animejs', express.static(animeDirectory));
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
