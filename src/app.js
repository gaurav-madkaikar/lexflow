import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

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
import { applyRuleToUnassigned, completeAssignedEmail } from './workflows.js';

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

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
  return {
    id: Number(row.id),
    subject: row.subject,
    sender: { name: row.sender_name, address: row.sender_address },
    preview: row.preview,
    receivedAt: row.received_at,
    outlookUrl: row.outlook_url,
    status: row.status,
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
    completedAt: row.completed_at
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
      completed.name AS completed_by_name
    FROM emails
    LEFT JOIN users AS assignee ON assignee.id = emails.assignee_id
    LEFT JOIN users AS completed ON completed.id = emails.completed_by
    ${ownership}
    ORDER BY emails.received_at DESC, emails.id DESC
  `);
  const rows = user.role === 'admin' ? statement.all() : statement.all(user.id);
  return rows.map(emailFromRow);
}

function listNotifications(db, userId) {
  return db.prepare(`
    SELECT id, email_id, kind, message, read_at, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
  `).all(userId).map(row => ({
    id: Number(row.id),
    emailId: Number(row.email_id),
    kind: row.kind,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  }));
}

function listRules(db) {
  return db.prepare(`
    SELECT rules.*, users.email AS assignee_email, users.name AS assignee_name,
      users.initials AS assignee_initials, users.department AS assignee_department
    FROM rules
    JOIN users ON users.id = rules.assignee_id
    ORDER BY rules.priority, rules.id
  `).all().map(row => ({
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
  }));
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

function parseRule(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const keywords = typeof body.keywords === 'string'
    ? body.keywords.split(',').map(value => value.trim()).filter(Boolean).join(',')
    : '';
  const senderFilter = typeof body.senderFilter === 'string' ? body.senderFilter.trim() : '';
  const assigneeId = Number(body.assigneeId);
  const priority = Number(body.priority);

  if (!name || name.length > 80) return { error: 'Enter a rule name of 80 characters or fewer.', field: 'name' };
  if (!keywords || keywords.length > 240) return { error: 'Enter one or more comma-separated keywords.', field: 'keywords' };
  if (senderFilter.length > 160) return { error: 'The sender filter is too long.', field: 'senderFilter' };
  if (!Number.isInteger(assigneeId) || assigneeId < 1) return { error: 'Choose an assignee.', field: 'assigneeId' };
  if (!Number.isInteger(priority) || priority < 1 || priority > 999) return { error: 'Priority must be between 1 and 999.', field: 'priority' };
  return { value: { name, keywords, senderFilter, assigneeId, priority } };
}

async function runSync(syncRunner) {
  if (typeof syncRunner === 'function') return syncRunner();
  return syncRunner.run();
}

export function createApp({
  db,
  syncRunner,
  mode = 'demo',
  cookieSecure = process.env.NODE_ENV === 'production',
  staticDir = publicDirectory
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
    const notifications = listNotifications(db, request.user.id);
    const payload = {
      user: safeUser(request.user),
      mode,
      emails: listEmails(db, request.user),
      notifications,
      unreadCount: notifications.filter(item => !item.readAt).length
    };

    if (request.user.role === 'admin') {
      payload.rules = listRules(db);
      payload.team = db.prepare("SELECT * FROM users WHERE role = 'member' ORDER BY name")
        .all().map(safeUser);
      payload.activity = listActivity(db);
      payload.sync = syncSummary(db);
    }

    response.json(payload);
  });

  app.post('/api/sync', requireAdmin, async (request, response, next) => {
    try {
      response.json(await runSync(syncRunner));
    } catch (error) {
      error.status = 502;
      error.code = 'SYNC_FAILED';
      error.message = 'Mailbox sync failed. Review the last sync status and try again.';
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
      applyRuleToUnassigned(db, Number(result.lastInsertRowid));
      response.status(201).json({ id: Number(result.lastInsertRowid) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/rules/:id', requireAdmin, (request, response, next) => {
    try {
      if (typeof request.body?.enabled !== 'boolean') {
        return validationError(response, 'Enabled must be true or false.', 'enabled');
      }
      const id = resourceId(request.params.id);
      if (!id) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found.' } });
        return;
      }
      const result = db.prepare('UPDATE rules SET enabled = ? WHERE id = ?')
        .run(request.body.enabled ? 1 : 0, id);
      if (!result.changes) {
        response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found.' } });
        return;
      }
      if (request.body.enabled) applyRuleToUnassigned(db, id);
      response.json({ id, enabled: request.body.enabled });
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

      const completed = completeAssignedEmail({ db, emailId, userId: request.user.id });
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

  app.use(express.static(staticDir));
  app.get('*splat', (request, response) => {
    response.sendFile(path.join(staticDir, 'index.html'));
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const status = Number.isInteger(error.status) ? error.status : 500;
    const expose = status >= 400 && status < 500;
    response.status(status).json({
      error: {
        code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'),
        message: expose ? error.message : 'Something went wrong. Please try again.'
      }
    });
  });

  return app;
}
