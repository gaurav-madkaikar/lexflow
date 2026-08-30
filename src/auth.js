import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'lexflow_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new TypeError('Password must have at least 8 characters');
  }

  const salt = randomBytes(16);
  const key = Buffer.from(await scrypt(password, salt, 64));
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, saltHex, keyHex, extra] = String(encoded).split('$');
  if (
    algorithm !== 'scrypt'
    || extra !== undefined
    || !/^[a-f0-9]{32}$/i.test(saltHex ?? '')
    || !/^[a-f0-9]{128}$/i.test(keyHex ?? '')
  ) {
    return false;
  }

  const expected = Buffer.from(keyHex, 'hex');
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length));
  return timingSafeEqual(actual, expected);
}

export function createSession(db, userId, now = new Date()) {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(id, userId, expiresAt);
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
    SELECT users.*, sessions.expires_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ?
  `).get(sessionId);

  if (!row || row.expires_at <= now.toISOString()) {
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

    request.user = user;
    request.sessionId = sessionId;
    next();
  };
}

export function requireAdmin(request, response, next) {
  if (request.user.role !== 'admin') {
    response.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Administrator access is required.' }
    });
    return;
  }
  next();
}

export function requireCfo(request, response, next) {
  if (request.user.role !== 'cfo') {
    response.status(403).json({
      error: { code: 'FORBIDDEN', message: 'CFO access is required.' }
    });
    return;
  }
  next();
}
