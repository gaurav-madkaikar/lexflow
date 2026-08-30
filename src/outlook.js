import { createHash, randomBytes } from 'node:crypto';

import { GraphMailSource } from './mail-sources.js';

const CONSENT_TTL_MS = 10 * 60 * 1000;
const LINK_CACHE_TTL_MS = 2 * 60 * 1000;
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const OUTLOOK_WEB_HOSTS = new Set(['outlook.office.com', 'outlook.office365.com']);

function integrationError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.expose = true;
  return error;
}

function digest(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function stateValue() {
  return randomBytes(32).toString('base64url');
}

function safeOutlookWebLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !OUTLOOK_WEB_HOSTS.has(url.hostname.toLocaleLowerCase())) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function sameInstant(left, right) {
  if (!left || !right) return false;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function scopedStateKey(key, organizationId) {
  return Number(organizationId) === 1 ? key : `organization:${organizationId}:${key}`;
}

export function createOutlookIntegration({ db, config = {}, clock = () => new Date(), fetchImpl = fetch }) {
  const clientId = String(config.clientId ?? '').trim();
  const clientSecret = String(config.clientSecret ?? '').trim();
  const redirectUri = String(config.redirectUri ?? '').trim();
  const configured = Boolean(clientId && clientSecret && redirectUri);
  const tokenCache = new Map();
  const linkCache = new Map();

  async function accessToken(tenantId, { force = false } = {}) {
    if (!configured) throw integrationError(503, 'OUTLOOK_NOT_CONFIGURED', 'Microsoft 365 connection is not configured on this server.');
    const cached = tokenCache.get(String(tenantId).toLocaleLowerCase());
    if (!force && cached && cached.expiresAt > clock().getTime() + 60_000) return cached.token;
    const response = await fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: GRAPH_SCOPE,
          grant_type: 'client_credentials',
        }),
      },
    );
    if (!response.ok) throw integrationError(502, 'OUTLOOK_TOKEN_FAILED', 'Microsoft 365 consent could not be verified.');
    const payload = await response.json();
    const token = payload.access_token;
    if (!token) throw integrationError(502, 'OUTLOOK_TOKEN_FAILED', 'Microsoft 365 returned no access token.');
    const expiresIn = Number(payload.expires_in);
    tokenCache.set(String(tenantId).toLocaleLowerCase(), {
      token,
      expiresAt: clock().getTime() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000,
    });
    return token;
  }

  function authorizationUrl({ sessionId, organizationId }) {
    if (!configured) throw integrationError(503, 'OUTLOOK_NOT_CONFIGURED', 'Microsoft 365 connection is not configured on this server.');
    const organization = db.prepare("SELECT entra_tenant_id FROM organizations WHERE id = ? AND status = 'active'").get(organizationId);
    if (!organization?.entra_tenant_id) throw integrationError(409, 'OUTLOOK_TENANT_MISSING', 'This organization has no Entra tenant ID.');
    const state = stateValue();
    const expiresAt = new Date(clock().getTime() + CONSENT_TTL_MS).toISOString();
    db.prepare(`
      INSERT INTO outlook_consent_states (state_digest, session_id, organization_id, tenant_id, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(digest(state), sessionId, organizationId, organization.entra_tenant_id, expiresAt);
    const url = new URL(`https://login.microsoftonline.com/${encodeURIComponent(organization.entra_tenant_id)}/v2.0/adminconsent`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', GRAPH_SCOPE);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async function completeAuthorization({ sessionId, state, tenantId, adminConsent, providerError }) {
    const transaction = db.prepare('SELECT * FROM outlook_consent_states WHERE state_digest = ?').get(digest(state));
    if (transaction) db.prepare('DELETE FROM outlook_consent_states WHERE state_digest = ?').run(digest(state));
    if (!transaction || transaction.session_id !== sessionId || new Date(transaction.expires_at) <= clock()) {
      throw integrationError(400, 'OUTLOOK_CONSENT_INVALID', 'Microsoft 365 connection state is invalid or expired.');
    }
    if (providerError || String(adminConsent).toLocaleLowerCase() !== 'true') {
      throw integrationError(400, 'OUTLOOK_CONSENT_DENIED', 'Microsoft 365 administrator consent was not granted.');
    }
    if (String(tenantId).toLocaleLowerCase() !== String(transaction.tenant_id).toLocaleLowerCase()) {
      throw integrationError(403, 'OUTLOOK_TENANT_MISMATCH', 'Microsoft 365 consent was granted for a different tenant.');
    }
    const timestamp = clock().toISOString();
    db.prepare(`
      INSERT INTO outlook_connections (organization_id, tenant_id, connected_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(organization_id) DO UPDATE SET tenant_id = excluded.tenant_id, updated_at = excluded.updated_at
    `).run(transaction.organization_id, transaction.tenant_id, timestamp, timestamp);
  }

  function status(organizationId) {
    const connection = db.prepare('SELECT * FROM outlook_connections WHERE organization_id = ?').get(organizationId);
    const mailboxes = db.prepare(`
      SELECT DISTINCT lower(trim(shared_mailbox)) AS mailbox
      FROM departments
      WHERE organization_id = ? AND trim(shared_mailbox) <> ''
      ORDER BY mailbox
    `).all(organizationId).map(row => row.mailbox);
    const stateValue = key => db.prepare('SELECT value FROM sync_state WHERE organization_id = ? AND key = ?')
      .get(organizationId, scopedStateKey(key, organizationId))?.value ?? null;
    const aggregateSuccess = stateValue('outlook:last_success_at');
    const aggregateError = stateValue('outlook:last_error');
    const currentSuccesses = mailboxes
      .map(mailbox => stateValue(`last_sync_at:mail_cursor:graph:${mailbox}`))
      .filter(Boolean)
      .sort((left, right) => new Date(right) - new Date(left));
    const currentError = mailboxes
      .map(mailbox => stateValue(`last_sync_error:mail_cursor:graph:${mailbox}`))
      .find(Boolean) ?? null;
    return {
      configured,
      connected: Boolean(connection),
      accountEmail: connection ? `${mailboxes.length} department shared mailbox${mailboxes.length === 1 ? '' : 'es'}` : null,
      mailboxCount: mailboxes.length,
      lastSuccessAt: aggregateSuccess ?? currentSuccesses[0] ?? null,
      lastError: aggregateError ?? currentError,
    };
  }

  function sources() {
    if (!configured) return [];
    return db.prepare(`
      SELECT c.organization_id, c.tenant_id, d.id AS department_id, d.shared_mailbox
      FROM outlook_connections c
      JOIN organizations o ON o.id = c.organization_id AND o.status = 'active'
      JOIN departments d ON d.organization_id = c.organization_id AND trim(d.shared_mailbox) <> ''
      GROUP BY c.organization_id, d.id, lower(d.shared_mailbox)
      ORDER BY c.organization_id, lower(d.shared_mailbox)
    `).all().map(row => {
      const source = new GraphMailSource({
        tenantId: row.tenant_id,
        clientId,
        clientSecret,
        mailbox: row.shared_mailbox,
        accessTokenProvider: () => accessToken(row.tenant_id),
        fetchImpl,
      });
      source.organizationId = Number(row.organization_id);
      source.departmentId = Number(row.department_id);
      source.isCurrentConnection = () => Boolean(db.prepare(`
        SELECT 1 FROM outlook_connections c
        JOIN departments d ON d.organization_id = c.organization_id
        WHERE c.organization_id = ? AND d.id = ? AND lower(d.shared_mailbox) = lower(?)
      `).get(row.organization_id, row.department_id, row.shared_mailbox));
      return source;
    });
  }

  async function resolveWebLink({ organizationId, mailboxAddress, immutableId, subject, receivedAt }) {
    if (!configured) {
      throw integrationError(503, 'OUTLOOK_NOT_CONFIGURED', 'Microsoft 365 connection is not configured on this server.');
    }
    const normalizedMailbox = String(mailboxAddress ?? '').trim().toLocaleLowerCase();
    const messageId = String(immutableId ?? '').trim();
    const organization = Number(organizationId);
    if (!Number.isInteger(organization) || organization < 1 || !normalizedMailbox || !messageId) {
      throw integrationError(404, 'OUTLOOK_MESSAGE_UNAVAILABLE', 'This Outlook message is no longer available.');
    }

    const connection = db.prepare(`
      SELECT c.tenant_id
      FROM outlook_connections c
      JOIN organizations o
        ON o.id = c.organization_id
        AND o.status = 'active'
      JOIN departments d
        ON d.organization_id = c.organization_id
        AND lower(trim(d.shared_mailbox)) = ?
      WHERE c.organization_id = ?
      LIMIT 1
    `).get(normalizedMailbox, organization);
    if (!connection?.tenant_id) {
      throw integrationError(409, 'OUTLOOK_NOT_CONNECTED', 'Microsoft Graph is not connected for this shared mailbox.');
    }

    const now = clock().getTime();
    for (const [key, value] of linkCache) {
      if (value.expiresAt <= now) linkCache.delete(key);
    }
    const cacheKey = `${organization}:${normalizedMailbox}:${messageId}`;
    const cached = linkCache.get(cacheKey);
    if (cached) return cached.webUrl;

    let token;
    try {
      token = await accessToken(connection.tenant_id);
    } catch (error) {
      if (error?.expose) throw error;
      throw integrationError(502, 'OUTLOOK_LINK_FAILED', 'Outlook could not prepare this message link. Please try again.');
    }
    const graphHeaders = { authorization: `Bearer ${token}` };

    async function graphJson(url, { immutable = false, missingMessage = false } = {}) {
      let response;
      try {
        response = await fetchImpl(url, {
          headers: {
            ...graphHeaders,
            ...(immutable ? { prefer: 'IdType="ImmutableId"' } : {}),
          },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw integrationError(502, 'OUTLOOK_LINK_FAILED', 'Outlook could not prepare this message link. Please try again.');
      }
      if (!response.ok) {
        if (missingMessage && response.status === 404) {
          throw integrationError(404, 'OUTLOOK_MESSAGE_UNAVAILABLE', 'This Outlook message is no longer available.');
        }
        throw integrationError(502, 'OUTLOOK_LINK_FAILED', 'Outlook could not prepare this message link. Please try again.');
      }
      try {
        return await response.json();
      } catch {
        throw integrationError(502, 'OUTLOOK_LINK_FAILED', 'Outlook could not prepare this message link. Please try again.');
      }
    }

    const immutableUrl = new URL(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(normalizedMailbox)}/messages/${encodeURIComponent(messageId)}`,
    );
    immutableUrl.searchParams.set('$select', 'internetMessageId,subject,receivedDateTime');
    const immutableMessage = await graphJson(immutableUrl, { immutable: true, missingMessage: true });
    const internetMessageId = String(immutableMessage?.internetMessageId ?? '').trim();
    if (!internetMessageId) {
      throw integrationError(409, 'OUTLOOK_MESSAGE_UNAVAILABLE', 'This Outlook message is no longer available.');
    }

    const regularUrl = new URL(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(normalizedMailbox)}/messages`,
    );
    const escapedInternetMessageId = internetMessageId.replaceAll("'", "''");
    regularUrl.searchParams.set('$filter', `internetMessageId eq '${escapedInternetMessageId}'`);
    regularUrl.searchParams.set('$select', 'webLink,subject,receivedDateTime');
    regularUrl.searchParams.set('$top', '25');
    const regularMessages = await graphJson(regularUrl);
    if (!Array.isArray(regularMessages?.value)) {
      throw integrationError(502, 'OUTLOOK_LINK_FAILED', 'Outlook could not prepare this message link. Please try again.');
    }

    const candidates = regularMessages.value
      .map(message => ({
        ...message,
        safeWebUrl: safeOutlookWebLink(message?.webLink),
      }))
      .filter(message => message.safeWebUrl);
    const storedSubject = String(subject ?? '');
    const match = candidates.find(message => (
      message.subject === storedSubject
      && sameInstant(message.receivedDateTime, receivedAt)
    )) ?? candidates[0];
    if (!match) {
      throw integrationError(409, 'OUTLOOK_LINK_UNAVAILABLE', 'Outlook could not find a current link for this message.');
    }

    linkCache.set(cacheKey, {
      webUrl: match.safeWebUrl,
      expiresAt: now + LINK_CACHE_TTL_MS,
    });
    return match.safeWebUrl;
  }

  function disconnect({ organizationId }) {
    const connection = db.prepare('SELECT tenant_id FROM outlook_connections WHERE organization_id = ?').get(organizationId);
    db.prepare('DELETE FROM outlook_connections WHERE organization_id = ?').run(organizationId);
    db.prepare("DELETE FROM sync_state WHERE organization_id = ? AND key LIKE '%mail_cursor:graph:%'").run(organizationId);
    if (connection?.tenant_id) tokenCache.delete(String(connection.tenant_id).toLocaleLowerCase());
    const cachePrefix = `${Number(organizationId)}:`;
    for (const cacheKey of linkCache.keys()) {
      if (cacheKey.startsWith(cachePrefix)) linkCache.delete(cacheKey);
    }
  }

  return { configured, authorizationUrl, completeAuthorization, disconnect, resolveWebLink, sources, status };
}

export { GRAPH_SCOPE };
