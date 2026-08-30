import { randomBytes } from 'node:crypto';
import { effectiveWorkspaceRole, headedDepartment } from './department-access.js';
const SESSION_COOKIE = 'lexflow_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export function createSession(db, userId, now = new Date(), organizationId = undefined) {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const org = organizationId === undefined
    ? db.prepare('SELECT organization_id FROM users WHERE id = ?').get(userId)?.organization_id ?? null
    : organizationId;
  db.prepare('INSERT INTO sessions (id, user_id, organization_id, expires_at) VALUES (?, ?, ?, ?)')
    .run(id, userId, org, expiresAt);
  return { id, expiresAt };
}

export function deleteSession(db, sessionId) {
  if (sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
}

export function sessionUser(db, sessionId, now = new Date()) {
  if (!sessionId) return null;

  const row = db.prepare(`
    SELECT users.*, sessions.organization_id AS session_organization_id, sessions.expires_at,
      organizations.name AS organization_name, organizations.domain AS organization_domain,
      organizations.status AS organization_status, organizations.timezone AS organization_timezone,
      organizations.logo_asset_id
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    LEFT JOIN organizations ON organizations.id = sessions.organization_id
    WHERE sessions.id = ?
  `).get(sessionId);

  if (!row || row.expires_at <= now.toISOString() || row.account_status === 'disabled' || row.organization_status === 'archived') {
    if (row) deleteSession(db, sessionId);
    return null;
  }

  return row;
}

export function sessionIdFromRequest(request) {
  const cookie = request.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1) || null;
}

export function sessionCookie(sessionId, secure = false) {
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function expiredSessionCookie(secure = false) {
  return sessionCookie('', secure).replace(`Max-Age=${SESSION_TTL_SECONDS}`, 'Max-Age=0');
}

export function requireUser(db) {
  return function authenticationMiddleware(request, response, next) {
    const sessionId = sessionIdFromRequest(request);
    const user = sessionUser(db, sessionId);
    if (!user) {
      response.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' }
      });
      return;
    }

    user.organization_id = user.session_organization_id ?? user.organization_id;
    const department = headedDepartment(db, {
      userId: user.id,
      organizationId: user.organization_id,
    });
    user.headed_department_id = department ? Number(department.id) : null;
    user.effectiveRole = effectiveWorkspaceRole(user, department);
    request.user = user;
    request.sessionId = sessionId;
    next();
  };
}

export function requireAdmin(request, response, next) {
  if (!['org_admin', 'admin'].includes(request.user.effectiveRole)) {
    response.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Administrator access is required.' }
    });
    return;
  }
  next();
}

export function requireOrgAdmin(request, response, next) {
  if (request.user.effectiveRole !== 'org_admin') {
    response.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Organization administrator access is required.' }
    });
    return;
  }
  next();
}

export function requireDepAdmin(request, response, next) {
  if (request.user.effectiveRole !== 'dep_admin') {
    response.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Department administrator access is required.' }
    });
    return;
  }
  next();
}

export function requirePlatformAdmin(request, response, next) {
  if (!request.user.is_platform_admin) {
    response.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Platform administrator access is required.' }
    });
    return;
  }
  next();
}
