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
    mailbox: String(env.GRAPH_MAILBOX ?? '').trim()
  };

  return {
    port,
    databasePath: String(env.DATABASE_PATH ?? '').trim() || 'data/lexflow.db',
    syncIntervalSeconds,
    mode: Object.values(graph).every(Boolean) ? 'graph' : 'demo',
    graph,
    bootstrapPasswords: {
      admin: String(env.BOOTSTRAP_ADMIN_PASSWORD ?? ''),
      maya: String(env.BOOTSTRAP_MAYA_PASSWORD ?? ''),
      priya: String(env.BOOTSTRAP_PRIYA_PASSWORD ?? '')
    }
  };
}
