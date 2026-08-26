function integerSetting(env, name, fallback) {
  const raw = String(env[name] ?? '').trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new TypeError(`${name} must be an integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }
  return value;
}

function applicationBaseUrl(env, port) {
  const raw = String(env.APP_BASE_URL ?? '').trim() || `http://127.0.0.1:${port}`;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError('APP_BASE_URL must be a valid HTTP(S) URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
    || (url.pathname && url.pathname !== '/')
  ) {
    throw new TypeError('APP_BASE_URL must be an HTTP(S) origin without credentials, a path, query, or hash');
  }
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLoopback) {
    throw new TypeError('APP_BASE_URL must use HTTPS unless it is a loopback development origin');
  }
  return url.origin;
}

function encryptionKey(raw) {
  if (!raw) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw) || raw.length % 4 !== 0) {
    throw new TypeError('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== raw) {
    throw new TypeError('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return decoded;
}

const GMAIL_REQUESTED_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'email',
]);
const OUTLOOK_REQUESTED_SCOPES = Object.freeze([
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.Send',
]);

export function loadConfig(env = process.env) {
  const port = integerSetting(env, 'PORT', 3000);
  if (port < 1 || port > 65_535) {
    throw new RangeError('PORT must be between 1 and 65535');
  }

  const syncIntervalSeconds = integerSetting(env, 'SYNC_INTERVAL_SECONDS', 60);
  if (syncIntervalSeconds !== 0 && (syncIntervalSeconds < 60 || syncIntervalSeconds > 86_400)) {
    throw new RangeError('SYNC_INTERVAL_SECONDS must be 0 or between 60 and 86400');
  }

  const graph = {
    tenantId: String(env.GRAPH_TENANT_ID ?? '').trim(),
    clientId: String(env.GRAPH_CLIENT_ID ?? '').trim(),
    clientSecret: String(env.GRAPH_CLIENT_SECRET ?? '').trim(),
    mailbox: String(env.GRAPH_MAILBOX ?? '').trim(),
    authMode: 'application',
    capabilities: { read: true, send: false },
  };

  const appBaseUrl = applicationBaseUrl(env, port);
  const googleClientId = String(env.GOOGLE_CLIENT_ID ?? '').trim();
  const googleClientSecret = String(env.GOOGLE_CLIENT_SECRET ?? '').trim();
  const outlookTenantId = String(env.OUTLOOK_TENANT_ID ?? '').trim();
  const outlookClientId = String(env.OUTLOOK_CLIENT_ID ?? '').trim();
  const outlookClientSecret = String(env.OUTLOOK_CLIENT_SECRET ?? '').trim();
  const tokenEncryptionKeyRaw = String(env.TOKEN_ENCRYPTION_KEY ?? '').trim();
  const suppliedGoogleClientParts = [googleClientId, googleClientSecret].filter(Boolean).length;
  if (
    suppliedGoogleClientParts > 0
    && (suppliedGoogleClientParts !== 2 || !tokenEncryptionKeyRaw)
  ) {
    throw new Error(
      'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and TOKEN_ENCRYPTION_KEY must be configured together'
    );
  }
  const gmailConfigured = suppliedGoogleClientParts === 2 && Boolean(tokenEncryptionKeyRaw);
  const outlookClientParts = [outlookTenantId, outlookClientId, outlookClientSecret];
  const suppliedOutlookParts = outlookClientParts.filter(Boolean).length;
  if (
    suppliedOutlookParts > 0
    && (suppliedOutlookParts !== outlookClientParts.length || !tokenEncryptionKeyRaw)
  ) {
    throw new Error(
      'OUTLOOK_TENANT_ID, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and TOKEN_ENCRYPTION_KEY must be configured together'
    );
  }
  const outlookConfigured = suppliedOutlookParts === outlookClientParts.length
    && Boolean(tokenEncryptionKeyRaw);
  const tokenEncryptionKey = encryptionKey(tokenEncryptionKeyRaw);
  const graphConfigured = [
    graph.tenantId,
    graph.clientId,
    graph.clientSecret,
    graph.mailbox,
  ].every(Boolean);
  const configuredProviders = [graphConfigured, gmailConfigured, outlookConfigured]
    .filter(Boolean).length;
  const mode = configuredProviders > 1
    ? 'mixed'
    : graphConfigured
      ? 'graph'
      : gmailConfigured
        ? 'gmail'
        : outlookConfigured
          ? 'outlook'
          : 'demo';

  return {
    port,
    appBaseUrl,
    databasePath: String(env.DATABASE_PATH ?? '').trim() || 'data/lexflow.db',
    syncIntervalSeconds,
    mode,
    graph,
    gmail: {
      configured: gmailConfigured,
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: `${appBaseUrl}/api/integrations/gmail/callback`,
      tokenEncryptionKey,
      requestedScopes: [...GMAIL_REQUESTED_SCOPES],
    },
    outlook: {
      configured: outlookConfigured,
      tenantId: outlookTenantId,
      clientId: outlookClientId,
      clientSecret: outlookClientSecret,
      redirectUri: `${appBaseUrl}/api/integrations/outlook/callback`,
      tokenEncryptionKey,
      requestedScopes: [...OUTLOOK_REQUESTED_SCOPES],
    },
    liveMailConfigured: graphConfigured || gmailConfigured || outlookConfigured,
  };
}
