import assert from 'node:assert/strict';
import test from 'node:test';

import { createSession } from '../src/auth.js';
import { createDatabase } from '../src/db.js';
import { createOutlookIntegration } from '../src/outlook.js';
import { createOrganization } from '../src/tenants.js';
import { createDepartment } from '../src/workspace.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

function graphToken() {
  return 'application-access-token';
}

function setup(context, { clock = () => new Date('2026-08-30T09:00:00.000Z'), fetchImpl } = {}) {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const now = clock();
  const organization = createOrganization({
    db,
    now,
    input: {
      name: 'Acme',
      domain: 'acme.test',
      entraTenantId: tenantId,
      initialAdminEmail: 'admin@acme.test',
      initialAdminObjectId: '22222222-2222-4222-8222-222222222222',
    },
  });
  const admin = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role = 'admin'").get(organization.id);
  const session = createSession(db, admin.id, now, organization.id);
  createDepartment({ db, organizationId: organization.id, name: 'Legal', sharedMailbox: 'legal@acme.test', now });
  const integration = createOutlookIntegration({
    db,
    clock,
    config: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://lexflow.test/api/integrations/outlook/callback',
    },
    fetchImpl: fetchImpl ?? (async () => ({ ok: true, status: 200, async json() { return { access_token: graphToken() }; } })),
  });
  return { db, integration, organization, session };
}

async function connect(integration, organization, session) {
  const authorization = new URL(integration.authorizationUrl({
    sessionId: session.id,
    organizationId: organization.id,
  }));
  await integration.completeAuthorization({
    sessionId: session.id,
    state: authorization.searchParams.get('state'),
    tenantId,
    adminConsent: 'True',
  });
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
  };
}

test('OrgAdmin consent connects every department shared mailbox without storing user tokens', async (context) => {
  const { db, integration, organization, session } = setup(context);
  const authorization = new URL(integration.authorizationUrl({ sessionId: session.id, organizationId: organization.id }));
  assert.equal(authorization.hostname, 'login.microsoftonline.com');
  assert.equal(authorization.pathname, `/${tenantId}/v2.0/adminconsent`);
  assert.equal(authorization.searchParams.get('scope'), 'https://graph.microsoft.com/.default');

  await integration.completeAuthorization({
    sessionId: session.id,
    state: authorization.searchParams.get('state'),
    tenantId,
    adminConsent: 'True',
  });

  assert.equal(integration.status(organization.id).connected, true);
  assert.equal(integration.status(organization.id).mailboxCount, 1);
  const sources = integration.sources();
  assert.equal(sources.length, 1);
  assert.equal(sources[0].organizationId, organization.id);
  assert.equal(
    sources[0].departmentId,
    db.prepare("SELECT id FROM departments WHERE organization_id = ? AND name = 'Legal'").get(organization.id).id,
  );
  assert.equal(sources[0].mailboxAddress, 'legal@acme.test');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM outlook_connections').get().count, 1);
});

test('Graph status prefers aggregate outcomes and ignores stale removed-mailbox cursors', async (context) => {
  const { db, integration, organization, session } = setup(context);
  await connect(integration, organization, session);
  const prefix = `organization:${organization.id}:`;
  const insertState = db.prepare('INSERT INTO sync_state (key, value, organization_id) VALUES (?, ?, ?)');
  insertState.run(`${prefix}last_sync_at:mail_cursor:graph:legal@acme.test`, '2026-08-30T08:00:00.000Z', organization.id);
  insertState.run(`${prefix}last_sync_at:mail_cursor:graph:removed@acme.test`, '2026-08-30T08:59:00.000Z', organization.id);
  insertState.run(`${prefix}last_sync_error:mail_cursor:graph:removed@acme.test`, 'Stale mailbox failure.', organization.id);

  let status = integration.status(organization.id);
  assert.equal(status.lastSuccessAt, '2026-08-30T08:00:00.000Z');
  assert.equal(status.lastError, null);

  insertState.run(`${prefix}outlook:last_success_at`, '2026-08-30T08:30:00.000Z', organization.id);
  insertState.run(`${prefix}outlook:last_error`, 'Microsoft Graph synchronization needs attention.', organization.id);
  status = integration.status(organization.id);
  assert.equal(status.lastSuccessAt, '2026-08-30T08:30:00.000Z');
  assert.equal(status.lastError, 'Microsoft Graph synchronization needs attention.');
});

test('Microsoft 365 consent rejects the wrong tenant and replayed state', async (context) => {
  const { integration, organization, session } = setup(context);
  let authorization = new URL(integration.authorizationUrl({ sessionId: session.id, organizationId: organization.id }));
  await assert.rejects(
    integration.completeAuthorization({
      sessionId: session.id,
      state: authorization.searchParams.get('state'),
      tenantId: '33333333-3333-4333-8333-333333333333',
      adminConsent: 'True',
    }),
    error => error.code === 'OUTLOOK_TENANT_MISMATCH',
  );

  authorization = new URL(integration.authorizationUrl({ sessionId: session.id, organizationId: organization.id }));
  const state = authorization.searchParams.get('state');
  await integration.completeAuthorization({
    sessionId: session.id,
    state,
    tenantId,
    adminConsent: 'True',
  });
  await assert.rejects(
    integration.completeAuthorization({
      sessionId: session.id,
      state,
      tenantId,
      adminConsent: 'True',
    }),
    error => error.code === 'OUTLOOK_CONSENT_INVALID',
  );
});

test('shared-mailbox link resolution translates an immutable message into a matching regular webLink', async (context) => {
  const requests = [];
  const receivedAt = '2026-08-30T08:40:00.000Z';
  const internetMessageId = "<case'o@example.test>";
  const regularWebLink = 'https://outlook.office.com/mail/deeplink/read/regular-message';
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('/oauth2/v2.0/token')) {
      return jsonResponse({ access_token: graphToken(), expires_in: 3600 });
    }
    const requestUrl = new URL(url);
    if (requestUrl.pathname.endsWith('/messages/immutable-message')) {
      return jsonResponse({
        internetMessageId,
        subject: 'Matter update',
        receivedDateTime: receivedAt,
      });
    }
    return jsonResponse({
      value: [
        {
          webLink: 'https://outlook.office.com/mail/deeplink/read/other-copy',
          subject: 'Another copy',
          receivedDateTime: receivedAt,
        },
        {
          webLink: regularWebLink,
          subject: 'Matter update',
          receivedDateTime: receivedAt,
        },
      ],
    });
  };
  const { integration, organization, session } = setup(context, { fetchImpl });
  await connect(integration, organization, session);

  const resolved = await integration.resolveWebLink({
    organizationId: organization.id,
    mailboxAddress: 'LEGAL@ACME.TEST',
    immutableId: 'immutable-message',
    subject: 'Matter update',
    receivedAt,
  });

  assert.equal(resolved, regularWebLink);
  const graphRequests = requests.filter(request => request.url.startsWith('https://graph.microsoft.com/'));
  assert.equal(graphRequests.length, 2);
  assert.equal(graphRequests[0].options.headers.prefer, 'IdType="ImmutableId"');
  assert.equal(new URL(graphRequests[0].url).searchParams.get('$select'), 'internetMessageId,subject,receivedDateTime');
  assert.equal(graphRequests[1].options.headers.prefer, undefined);
  assert.equal(
    new URL(graphRequests[1].url).searchParams.get('$filter'),
    "internetMessageId eq '<case''o@example.test>'",
  );
  assert.equal(new URL(graphRequests[1].url).searchParams.get('$select'), 'webLink,subject,receivedDateTime');
});

test('shared-mailbox link resolution caches briefly and disconnect invalidates cached links', async (context) => {
  let now = new Date('2026-08-30T09:00:00.000Z');
  let graphRequestCount = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes('/oauth2/v2.0/token')) {
      return jsonResponse({ access_token: graphToken(), expires_in: 3600 });
    }
    graphRequestCount += 1;
    const requestUrl = new URL(url);
    if (!requestUrl.pathname.endsWith('/messages')) {
      return jsonResponse({
        internetMessageId: '<cached@example.test>',
        subject: 'Cached matter',
        receivedDateTime: '2026-08-30T08:45:00.000Z',
      });
    }
    return jsonResponse({
      value: [{
        webLink: 'https://outlook.office365.com/mail/deeplink/read/current-message',
        subject: 'Cached matter',
        receivedDateTime: '2026-08-30T08:45:00.000Z',
      }],
    });
  };
  const harness = setup(context, { clock: () => now, fetchImpl });
  await connect(harness.integration, harness.organization, harness.session);
  const input = {
    organizationId: harness.organization.id,
    mailboxAddress: 'legal@acme.test',
    immutableId: 'cache-message',
    subject: 'Cached matter',
    receivedAt: '2026-08-30T08:45:00.000Z',
  };

  await harness.integration.resolveWebLink(input);
  await harness.integration.resolveWebLink(input);
  assert.equal(graphRequestCount, 2);

  now = new Date(now.getTime() + (2 * 60 * 1000) + 1);
  await harness.integration.resolveWebLink(input);
  assert.equal(graphRequestCount, 4);

  harness.integration.disconnect({ organizationId: harness.organization.id });
  await connect(harness.integration, harness.organization, harness.session);
  await harness.integration.resolveWebLink(input);
  assert.equal(graphRequestCount, 6);
});

test('shared-mailbox link resolution exposes safe failures without leaking message identifiers', async (context) => {
  const fetchImpl = async (url) => {
    if (String(url).includes('/oauth2/v2.0/token')) {
      return jsonResponse({ access_token: graphToken(), expires_in: 3600 });
    }
    const requestUrl = new URL(url);
    if (requestUrl.pathname.endsWith('/messages/missing-identifier')) {
      return jsonResponse({ subject: 'Missing identifier' });
    }
    if (requestUrl.pathname.endsWith('/messages/upstream-failure')) {
      return jsonResponse({}, 503);
    }
    if (requestUrl.pathname.endsWith('/messages/unsafe-link')) {
      return jsonResponse({
        internetMessageId: '<unsafe@example.test>',
        subject: 'Unsafe link',
        receivedDateTime: '2026-08-30T08:50:00.000Z',
      });
    }
    return jsonResponse({
      value: [{
        webLink: 'https://example.test/not-outlook',
        subject: 'Unsafe link',
        receivedDateTime: '2026-08-30T08:50:00.000Z',
      }],
    });
  };
  const { integration, organization, session } = setup(context, { fetchImpl });
  await connect(integration, organization, session);
  const base = {
    organizationId: organization.id,
    mailboxAddress: 'legal@acme.test',
    subject: 'Unsafe link',
    receivedAt: '2026-08-30T08:50:00.000Z',
  };

  for (const [immutableId, expectedCode] of [
    ['missing-identifier', 'OUTLOOK_MESSAGE_UNAVAILABLE'],
    ['upstream-failure', 'OUTLOOK_LINK_FAILED'],
    ['unsafe-link', 'OUTLOOK_LINK_UNAVAILABLE'],
  ]) {
    await assert.rejects(
      integration.resolveWebLink({ ...base, immutableId }),
      error => {
        assert.equal(error.code, expectedCode);
        assert.equal(error.expose, true);
        assert.equal(error.message.includes(immutableId), false);
        assert.equal(error.message.includes(graphToken()), false);
        return true;
      },
    );
  }
});
