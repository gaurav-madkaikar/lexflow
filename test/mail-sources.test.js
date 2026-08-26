import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase } from '../src/db.js';
import { createGmailIntegration, GmailMailSource } from '../src/gmail.js';
import { createMailSource, GraphMailSource } from '../src/mail-sources.js';
import {
  replaceConnectionGeneration,
  resolveMailboxConnection,
} from '../src/mailbox-connections.js';
import { createOutlookIntegration } from '../src/outlook.js';

function jsonResponse(status, payload, headers = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLocaleLowerCase(), String(value)]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return normalizedHeaders.get(String(name).toLocaleLowerCase()) ?? null;
      },
    },
    async json() {
      return structuredClone(payload);
    },
    async text() {
      return typeof payload === 'string' ? payload : JSON.stringify(payload);
    },
  };
}

function gmailMessage({
  id,
  threadId = `thread-${id}`,
  internalDate = '1786696200000',
  subject = 'Urgent NDA amendment for ACME',
  from = 'ACME Legal <legal@acme.test>',
  internetMessageId = `<${id}@example.test>`,
  inReplyTo = '',
  references = '',
  snippet = 'Please review the NDA amendment.',
  labelIds = ['INBOX'],
} = {}) {
  return {
    id,
    threadId,
    internalDate,
    snippet,
    labelIds,
    payload: {
      headers: [
        { name: 'subject', value: subject },
        { name: 'FROM', value: from },
        { name: 'Message-ID', value: internetMessageId },
        { name: 'In-Reply-To', value: inReplyTo },
        { name: 'References', value: references },
      ],
    },
  };
}

function createGmailSource(fetchImpl, options = {}) {
  return new GmailMailSource({
    accountEmail: 'Owner@Gmail.Test',
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    refreshToken: 'refresh-fixture',
    fetchImpl,
    clock: () => new Date('2026-08-14T09:00:00.000Z'),
    ...options,
  });
}

test('legacy Graph factory requires its own complete application credentials', () => {
  assert.equal(createMailSource({ mode: 'mixed', graph: {} }).provider, 'demo');
  assert.equal(createMailSource({
    mode: 'mixed',
    graph: {
      tenantId: 'tenant',
      clientId: 'client',
      clientSecret: 'secret',
      mailbox: 'legacy@example.test',
    },
  }).provider, 'outlook');
});

function insertOrganizationAdmin(db, {
  organizationId,
  handle,
  email,
  userId,
  sessionId,
}) {
  const timestamp = '2026-08-26T08:00:00.000Z';
  if (organizationId !== 1) {
    db.prepare(`
      INSERT INTO organizations
        (id, handle, join_code, name, normalized_domain, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      organizationId,
      handle,
      `${handle}-join`,
      `${handle} organization`,
      `${handle}.example.test`,
      timestamp,
      timestamp,
    );
  }
  db.prepare(`
    INSERT INTO users
      (id, organization_id, email, name, initials, department, role,
       password_hash, registration_status, mailbox_provider)
    VALUES (?, ?, ?, ?, 'AD', 'Operations', 'admin', 'unused', 'active', NULL)
  `).run(userId, organizationId, email, `${handle} admin`);
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, '2026-08-27T00:00:00.000Z')
  `).run(sessionId, userId);
}

async function authorizeIntegration(integration, { sessionId, code }) {
  const authorization = new URL(integration.authorizationUrl({ sessionId }));
  await integration.completeAuthorization({
    sessionId,
    code,
    state: authorization.searchParams.get('state'),
  });
  return authorization;
}

test('Gmail token rejection tells the admin to reconnect from Settings', async () => {
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://oauth2.googleapis.com');
    return jsonResponse(400, { error: 'invalid_grant' });
  };

  await assert.rejects(
    createGmailSource(fetchImpl).fetchChanges(null),
    error => (
      error.status === 502
        && error.code === 'GMAIL_AUTH_FAILED'
        && /reconnect gmail.*settings/i.test(error.message)
    ),
  );
});

test('Gmail send capability is explicit and an accepted digest preserves its MIME bytes', async () => {
  const calls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/messages/send')) {
      return jsonResponse(200, { id: 'gmail-sent-42' });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const rawMime = Buffer.from([
    ...Buffer.from('Message-ID: <lexflow-42@example.test>\r\n\r\nDigest '),
    0xc3,
    0xa9,
  ]);
  const source = createGmailSource(fetchImpl, {
    capabilities: { read: true, send: true },
  });

  assert.deepEqual(source.capabilities, { read: true, send: true });
  assert.deepEqual(await source.sendAssignmentDigest({ rawMime }), {
    providerMessageId: 'gmail-sent-42',
  });

  const sendCall = calls.find(call => call.url.pathname.endsWith('/users/me/messages/send'));
  assert.equal(sendCall.options.method, 'POST');
  assert.equal(sendCall.options.headers.authorization, 'Bearer access-fixture');
  assert.equal(sendCall.options.headers['content-type'], 'application/json');
  assert.deepEqual(
    Buffer.from(JSON.parse(sendCall.options.body).raw, 'base64url'),
    rawMime,
  );
});

test('Gmail blocks read-only delivery and safely classifies provider rejection and uncertainty', async () => {
  let gmailCalls = 0;
  const readOnly = createGmailSource(async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture' });
    }
    gmailCalls += 1;
    return jsonResponse(200, { id: 'must-not-send' });
  });
  assert.deepEqual(readOnly.capabilities, { read: true, send: false });
  await assert.rejects(
    readOnly.sendAssignmentDigest({ rawMime: 'Subject: blocked\r\n\r\nBody' }),
    error => (
      error.code === 'GMAIL_SEND_NOT_AUTHORIZED'
      && error.retryable === false
      && error.ambiguous === false
    ),
  );
  assert.equal(gmailCalls, 0);

  const rejected = createGmailSource(async (input) => {
    const url = new URL(String(input));
    return url.origin === 'https://oauth2.googleapis.com'
      ? jsonResponse(200, { access_token: 'access-fixture' })
      : jsonResponse(403, { error: { message: 'raw provider secret' } });
  }, { capabilities: { read: true, send: true } });
  await assert.rejects(
    rejected.sendAssignmentDigest({ rawMime: 'refresh-fixture raw body' }),
    error => {
      assert.equal(error.code, 'GMAIL_SEND_FORBIDDEN');
      assert.equal(error.retryable, false);
      assert.equal(error.ambiguous, false);
      assert.doesNotMatch(error.message, /raw provider secret|refresh-fixture|raw body/u);
      return true;
    },
  );

  const uncertain = createGmailSource(async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture' });
    }
    throw new Error('socket closed with secret');
  }, { capabilities: { read: true, send: true } });
  await assert.rejects(
    uncertain.sendAssignmentDigest({ rawMime: 'sensitive MIME' }),
    error => (
      error.code === 'GMAIL_SEND_UNCERTAIN'
      && error.ambiguous === true
      && !/socket|secret|sensitive/u.test(error.message)
    ),
  );
});

test('Gmail reconciles an assignment Message-ID without importing Sent mail', async () => {
  const calls = [];
  const source = createGmailSource(async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture' });
    }
    return jsonResponse(200, { messages: [{ id: 'sent-provider-id' }] });
  }, { capabilities: { read: true, send: true } });

  assert.deepEqual(await source.reconcileMessageId({
    internetMessageId: '<lexflow-delivery@example.test>',
  }), {
    found: true,
    providerMessageId: 'sent-provider-id',
  });
  const lookup = calls.find(call => call.url.origin === 'https://gmail.googleapis.com');
  assert.equal(lookup.url.pathname, '/gmail/v1/users/me/messages');
  assert.equal(lookup.url.searchParams.get('q'), 'rfc822msgid:<lexflow-delivery@example.test>');
  assert.equal(lookup.url.searchParams.get('maxResults'), '1');
});

test('Gmail initial sync imports only the first 500-result Inbox page and maps metadata', async () => {
  const calls = [];
  const details = new Map([
    ['gmail-1', gmailMessage({ id: 'gmail-1' })],
    ['gmail-2', gmailMessage({
      id: 'gmail-2',
      internalDate: '1786695000000',
      subject: '',
      from: 'sender@example.test',
      snippet: '',
    })],
  ]);
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, {
        access_token: 'access-fixture',
        expires_in: 3600,
        token_type: 'Bearer',
      });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, {
        emailAddress: 'owner@gmail.test',
        historyId: '1200',
      });
    }
    if (url.pathname.endsWith('/users/me/messages')) {
      assert.equal(url.searchParams.get('labelIds'), 'INBOX');
      assert.equal(url.searchParams.get('maxResults'), '500');
      assert.equal(url.searchParams.has('pageToken'), false);
      return jsonResponse(200, {
        messages: [null, { id: 'gmail-1' }, { id: 'gmail-2' }],
        nextPageToken: 'page-that-must-not-be-fetched',
      });
    }
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    if (details.has(messageId)) return jsonResponse(200, details.get(messageId));
    throw new Error(`Unexpected request: ${url}`);
  };

  const source = createGmailSource(fetchImpl);
  const result = await source.fetchChanges(null);

  assert.equal(source.provider, 'gmail');
  assert.equal(source.mailboxAddress, 'Owner@Gmail.Test');
  assert.equal(source.cursorKey, 'mail_cursor:gmail');
  assert.equal(result.nextCursor, '1200');
  assert.deepEqual(result.removedProviderIds, []);
  assert.equal(result.reconciliationRequired, undefined);
  assert.equal(result.messages.length, 2);
  assert.deepEqual(result.messages[0], {
    providerId: 'gmail:owner@gmail.test:gmail-1',
    provider: 'gmail',
    mailboxAddress: 'Owner@Gmail.Test',
    subject: 'Urgent NDA amendment for ACME',
    senderName: 'ACME Legal',
    senderAddress: 'legal@acme.test',
    preview: 'Please review the NDA amendment.',
    receivedAt: '2026-08-14T08:30:00.000Z',
    nativeConversationId: 'thread-gmail-1',
    internetMessageId: '<gmail-1@example.test>',
    inReplyTo: null,
    references: null,
    webUrl: 'https://mail.google.com/mail/?authuser=Owner%40Gmail.Test#inbox/thread-gmail-1',
    outlookUrl: 'https://mail.google.com/mail/?authuser=Owner%40Gmail.Test#inbox/thread-gmail-1',
  });
  assert.equal(result.messages[1].subject, '(No subject)');
  assert.equal(result.messages[1].senderName, 'sender@example.test');
  assert.equal(result.messages[1].receivedAt, '2026-08-14T08:10:00.000Z');

  const tokenCall = calls.find(call => call.url.origin === 'https://oauth2.googleapis.com');
  assert.equal(tokenCall.options.method, 'POST');
  assert.deepEqual(Object.fromEntries(tokenCall.options.body), {
    client_id: 'google-client-id',
    client_secret: 'google-client-secret',
    refresh_token: 'refresh-fixture',
    grant_type: 'refresh_token',
  });
  const gmailCalls = calls.filter(call => call.url.origin === 'https://gmail.googleapis.com');
  assert.ok(gmailCalls.every(call => call.options.headers.authorization === 'Bearer access-fixture'));
  assert.equal(
    gmailCalls.filter(call => call.url.pathname.endsWith('/users/me/messages')).length,
    1,
  );
  const detailCalls = gmailCalls.filter(call => /\/users\/me\/messages\/gmail-/u.test(call.url.pathname));
  assert.ok(detailCalls.length > 0);
  assert.deepEqual(detailCalls[0].url.searchParams.getAll('metadataHeaders'), [
    'Subject',
    'From',
    'Message-ID',
    'In-Reply-To',
    'References',
  ]);
});

test('Gmail defensively imports no more than 500 IDs when a list response exceeds the requested cap', async () => {
  const listedIds = Array.from({ length: 501 }, (_, index) => `gmail-${index + 1}`);
  const requestedDetails = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '1250' });
    }
    if (url.pathname.endsWith('/users/me/messages')) {
      assert.equal(url.searchParams.get('maxResults'), '500');
      return jsonResponse(200, { messages: listedIds.map(id => ({ id })) });
    }
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    requestedDetails.push(messageId);
    return jsonResponse(200, gmailMessage({ id: messageId }));
  };

  const result = await createGmailSource(fetchImpl).fetchChanges(null);

  assert.equal(result.messages.length, 500);
  assert.equal(requestedDetails.length, 500);
  assert.equal(requestedDetails.includes('gmail-501'), false);
});

test('Gmail skips vanished, non-Inbox, and invalid message details without dropping valid siblings', async () => {
  const listedIds = [
    'gmail-valid',
    'gmail-vanished',
    'gmail-moved',
    'gmail-missing-labels',
    'gmail-missing-id',
    'gmail-null-date',
    'gmail-empty-date',
    'gmail-nondigit-date',
    'gmail-negative-date',
    'gmail-out-of-range-date',
    'gmail-invalid-headers',
    'gmail-null-header',
  ];
  const details = new Map([
    ['gmail-valid', gmailMessage({ id: 'gmail-valid' })],
    ['gmail-moved', gmailMessage({ id: 'gmail-moved', labelIds: ['ARCHIVE'] })],
    ['gmail-missing-labels', { ...gmailMessage({ id: 'gmail-missing-labels' }), labelIds: undefined }],
    ['gmail-missing-id', { ...gmailMessage({ id: 'gmail-missing-id' }), id: undefined }],
    ['gmail-null-date', gmailMessage({ id: 'gmail-null-date', internalDate: null })],
    ['gmail-empty-date', gmailMessage({ id: 'gmail-empty-date', internalDate: '' })],
    ['gmail-nondigit-date', gmailMessage({ id: 'gmail-nondigit-date', internalDate: 'not-a-timestamp' })],
    ['gmail-negative-date', gmailMessage({ id: 'gmail-negative-date', internalDate: '-1' })],
    ['gmail-out-of-range-date', gmailMessage({
      id: 'gmail-out-of-range-date',
      internalDate: '8640000000000001',
    })],
    ['gmail-invalid-headers', {
      ...gmailMessage({ id: 'gmail-invalid-headers' }),
      payload: { headers: { Subject: 'not-an-array' } },
    }],
    ['gmail-null-header', {
      ...gmailMessage({ id: 'gmail-null-header' }),
      payload: { headers: [null, { name: 'Subject', value: 'Valid after null header' }] },
    }],
  ]);
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '1300' });
    }
    if (url.pathname.endsWith('/users/me/messages')) {
      return jsonResponse(200, { messages: listedIds.map(id => ({ id })) });
    }
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    if (messageId === 'gmail-vanished') return jsonResponse(404, {});
    if (details.has(messageId)) return jsonResponse(200, details.get(messageId));
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await createGmailSource(fetchImpl).fetchChanges(null);

  assert.equal(result.nextCursor, '1300');
  assert.deepEqual(result.messages.map(message => message.providerId), [
    'gmail:owner@gmail.test:gmail-valid',
    'gmail:owner@gmail.test:gmail-invalid-headers',
    'gmail:owner@gmail.test:gmail-null-header',
  ]);
  assert.equal(result.messages[1].subject, '(No subject)');
  assert.equal(result.messages[1].senderName, 'Unknown sender');
  assert.equal(result.messages[2].subject, 'Valid after null header');
});

test('Gmail does not swallow non-404 message-detail failures', async () => {
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '1350' });
    }
    if (url.pathname.endsWith('/users/me/messages')) {
      return jsonResponse(200, {
        messages: [{ id: 'gmail-valid' }, { id: 'gmail-server-error' }],
      });
    }
    if (url.pathname.endsWith('/gmail-valid')) {
      return jsonResponse(200, gmailMessage({ id: 'gmail-valid' }));
    }
    if (url.pathname.endsWith('/gmail-server-error')) return jsonResponse(500, {});
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    createGmailSource(fetchImpl).fetchChanges(null),
    error => error.status === 502 && error.code === 'GMAIL_SYNC_FAILED',
  );
});

test('Gmail retries 429 responses twice with one- and two-second fallback delays', async () => {
  const delays = [];
  let profileAttempts = 0;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      profileAttempts += 1;
      return profileAttempts < 3
        ? jsonResponse(429, {})
        : jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '1400' });
    }
    if (url.pathname.endsWith('/users/me/messages')) return jsonResponse(200, { messages: [] });
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await createGmailSource(fetchImpl, {
    delay: async milliseconds => delays.push(milliseconds),
  }).fetchChanges(null);

  assert.equal(result.nextCursor, '1400');
  assert.equal(profileAttempts, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
});

test('Gmail honors a short Retry-After delay before retrying a 429 response', async () => {
  const delays = [];
  let profileAttempts = 0;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      profileAttempts += 1;
      return profileAttempts === 1
        ? jsonResponse(429, {}, { 'Retry-After': '3' })
        : jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '1450' });
    }
    if (url.pathname.endsWith('/users/me/messages')) return jsonResponse(200, { messages: [] });
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await createGmailSource(fetchImpl, {
    delay: async milliseconds => delays.push(milliseconds),
  }).fetchChanges(null);

  assert.equal(result.nextCursor, '1450');
  assert.equal(profileAttempts, 2);
  assert.deepEqual(delays, [3_000]);
});

test('Gmail honors a short HTTP-date Retry-After value before retrying', async () => {
  const delays = [];
  let profileAttempts = 0;
  const retryAt = new Date('2026-08-14T09:00:04.000Z').toUTCString();
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      profileAttempts += 1;
      return profileAttempts === 1
        ? jsonResponse(429, {}, { 'Retry-After': retryAt })
        : jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '1475' });
    }
    if (url.pathname.endsWith('/users/me/messages')) return jsonResponse(200, { messages: [] });
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await createGmailSource(fetchImpl, {
    delay: async milliseconds => delays.push(milliseconds),
  }).fetchChanges(null);

  assert.equal(result.nextCursor, '1475');
  assert.equal(profileAttempts, 2);
  assert.deepEqual(delays, [4_000]);
});

test('Gmail safely fails after exhausting the 429 retry budget', async () => {
  const delays = [];
  let profileAttempts = 0;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    profileAttempts += 1;
    return profileAttempts === 2
      ? jsonResponse(429, {}, { 'Retry-After': 'not-a-delay' })
      : jsonResponse(429, {});
  };

  await assert.rejects(
    createGmailSource(fetchImpl, {
      delay: async milliseconds => delays.push(milliseconds),
    }).fetchChanges(null),
    error => {
      assert.equal(error.status, 502);
      assert.equal(error.code, 'GMAIL_SYNC_FAILED');
      assert.match(error.message, /Gmail synchronization failed \(429\)/);
      assert.doesNotMatch(error.message, /refresh-fixture|access-fixture|Owner@Gmail\.Test/);
      return true;
    },
  );
  assert.equal(profileAttempts, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
});

test('Gmail immediately and safely fails when Retry-After exceeds 30 seconds', async () => {
  const delays = [];
  let profileAttempts = 0;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    profileAttempts += 1;
    return jsonResponse(429, {}, { 'Retry-After': '31' });
  };

  await assert.rejects(
    createGmailSource(fetchImpl, {
      delay: async milliseconds => delays.push(milliseconds),
    }).fetchChanges(null),
    error => {
      assert.equal(error.status, 502);
      assert.equal(error.code, 'GMAIL_SYNC_FAILED');
      assert.match(error.message, /Gmail synchronization failed \(429\)/);
      assert.doesNotMatch(error.message, /refresh-fixture|access-fixture|Owner@Gmail\.Test/);
      return true;
    },
  );
  assert.equal(profileAttempts, 1);
  assert.deepEqual(delays, []);
});

test('Gmail incremental sync mirrors Inbox additions and removals while advancing history', async () => {
  const requestedMessages = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/history')) {
      assert.equal(url.searchParams.get('startHistoryId'), '1200');
      assert.deepEqual(url.searchParams.getAll('historyTypes'), [
        'messageAdded',
        'messageDeleted',
        'labelAdded',
        'labelRemoved',
      ]);
      assert.equal(url.searchParams.has('labelId'), false);
      return jsonResponse(200, {
        history: [
          {
            messagesAdded: [
              { message: { id: 'gmail-3', labelIds: ['INBOX'] } },
              { message: { id: 'gmail-missing-history-labels' } },
              { message: { id: 'gmail-spam', labelIds: ['SPAM'] } },
              { message: { id: 'gmail-added-then-removed', labelIds: ['INBOX'] } },
            ],
            labelsAdded: [
              { message: { id: 'gmail-moved' }, labelIds: ['INBOX'] },
              { message: { id: 'gmail-starred' }, labelIds: ['STARRED'] },
            ],
          },
          {
            messagesDeleted: [
              { message: { id: 'gmail-deleted' } },
              { message: { id: 'gmail-deleted-then-readded' } },
            ],
            labelsAdded: [
              { message: { id: 'gmail-deleted-then-readded' }, labelIds: ['INBOX'] },
            ],
            labelsRemoved: [
              { message: { id: 'gmail-archived' }, labelIds: ['INBOX'] },
              { message: { id: 'gmail-star-change' }, labelIds: ['STARRED'] },
              { message: { id: 'gmail-added-then-removed' }, labelIds: ['INBOX'] },
            ],
          },
        ],
        historyId: '1202',
      });
    }
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    requestedMessages.push(messageId);
    if (messageId === 'gmail-deleted') return jsonResponse(404, {});
    if (['gmail-archived', 'gmail-added-then-removed'].includes(messageId)) {
      return jsonResponse(200, gmailMessage({ id: messageId, labelIds: ['ARCHIVE'] }));
    }
    return jsonResponse(200, gmailMessage({ id: messageId }));
  };

  const result = await createGmailSource(fetchImpl).fetchChanges('1200');

  assert.equal(result.nextCursor, '1202');
  assert.deepEqual(requestedMessages.toSorted(), [
    'gmail-3',
    'gmail-added-then-removed',
    'gmail-archived',
    'gmail-deleted',
    'gmail-deleted-then-readded',
    'gmail-missing-history-labels',
    'gmail-moved',
  ]);
  assert.deepEqual(result.messages.map(message => message.providerId).toSorted(), [
    'gmail:owner@gmail.test:gmail-3',
    'gmail:owner@gmail.test:gmail-deleted-then-readded',
    'gmail:owner@gmail.test:gmail-missing-history-labels',
    'gmail:owner@gmail.test:gmail-moved',
  ]);
  assert.deepEqual(result.removedProviderIds.toSorted(), [
    'gmail:owner@gmail.test:gmail-added-then-removed',
    'gmail:owner@gmail.test:gmail-archived',
    'gmail:owner@gmail.test:gmail-deleted',
  ]);
  assert.equal(
    result.messages.some(message => result.removedProviderIds.includes(message.providerId)),
    false,
  );
});

test('Gmail incremental sync rejects unknown or malformed touched-message metadata', async () => {
  const invalidDetails = [
    { ...gmailMessage({ id: 'gmail-touched' }), labelIds: undefined },
    gmailMessage({ id: 'different-message', labelIds: ['ARCHIVE'] }),
    gmailMessage({ id: 'gmail-touched', internalDate: 'not-a-timestamp' }),
  ];

  for (const detail of invalidDetails) {
    const fetchImpl = async (input) => {
      const url = new URL(String(input));
      if (url.origin === 'https://oauth2.googleapis.com') {
        return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
      }
      if (url.pathname.endsWith('/users/me/history')) {
        return jsonResponse(200, {
          history: [{ messagesAdded: [{ message: { id: 'gmail-touched' } }] }],
          historyId: '1201',
        });
      }
      if (url.pathname.endsWith('/gmail-touched')) return jsonResponse(200, detail);
      throw new Error(`Unexpected request: ${url}`);
    };

    await assert.rejects(
      createGmailSource(fetchImpl).fetchChanges('1200'),
      error => error.status === 502 && error.code === 'GMAIL_INVALID_RESPONSE',
    );
  }
});

test('Gmail reconciliation exhaustively classifies retained messages by current Inbox state', async () => {
  const requestedMessages = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    requestedMessages.push(messageId);
    if (messageId === 'gmail-deleted') return jsonResponse(404, {});
    if (messageId === 'gmail-archived') {
      return jsonResponse(200, gmailMessage({ id: messageId, labelIds: ['ARCHIVE'] }));
    }
    return jsonResponse(200, gmailMessage({ id: messageId }));
  };
  const source = createGmailSource(fetchImpl);
  const providerIds = [
    'gmail:owner@gmail.test:gmail-present',
    'gmail:owner@gmail.test:gmail-deleted',
    'gmail:owner@gmail.test:gmail-archived',
  ];

  assert.equal(source.reconciliationKey, 'mail_reconciliation:gmail:inbox-membership:v1');
  const result = await source.reconcileInbox(providerIds);

  assert.deepEqual(requestedMessages.toSorted(), [
    'gmail-archived',
    'gmail-deleted',
    'gmail-present',
  ]);
  assert.deepEqual(result, {
    presentProviderIds: ['gmail:owner@gmail.test:gmail-present'],
    removedProviderIds: [
      'gmail:owner@gmail.test:gmail-deleted',
      'gmail:owner@gmail.test:gmail-archived',
    ],
  });
  assert.equal(new Set([
    ...result.presentProviderIds,
    ...result.removedProviderIds,
  ]).size, providerIds.length);
});

test('Gmail reconciliation rejects malformed or mismatched message metadata', async () => {
  for (const detail of [
    { id: 'gmail-retained' },
    gmailMessage({ id: 'different-message' }),
  ]) {
    const fetchImpl = async (input) => {
      const url = new URL(String(input));
      if (url.origin === 'https://oauth2.googleapis.com') {
        return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
      }
      return jsonResponse(200, detail);
    };

    await assert.rejects(
      createGmailSource(fetchImpl).reconcileInbox([
        'gmail:owner@gmail.test:gmail-retained',
      ]),
      error => error.status === 502 && error.code === 'GMAIL_INVALID_RESPONSE',
    );
  }
});

test('Gmail authorization and disconnect clear the versioned reconciliation marker', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  db.prepare(`
    INSERT INTO users (id, email, name, initials, department, role, password_hash)
    VALUES (1, 'admin@example.test', 'Admin', 'AD', 'Legal', 'admin', 'unused')
  `).run();
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES ('admin-session', 1, '2026-08-15T00:00:00.000Z')
  `).run();

  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/revoke')) return jsonResponse(200, {});
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, {
        access_token: 'authorization-access-token',
        refresh_token: 'authorization-refresh-token',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'openid',
          'email',
        ].join(' '),
      });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test' });
    }
    if (url.origin === 'https://openidconnect.googleapis.com') {
      return jsonResponse(200, {
        sub: 'google-subject-owner',
        email: 'owner@gmail.test',
        email_verified: true,
      });
    }
    return jsonResponse(200, {});
  };
  const integration = createGmailIntegration({
    db,
    gmail: {
      configured: true,
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      redirectUri: 'http://127.0.0.1:3000/api/integrations/gmail/callback',
      tokenEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    },
    fetchImpl,
    clock: () => new Date('2026-08-14T09:00:00.000Z'),
  });
  const reconciliationKey = 'mail_reconciliation:gmail:inbox-membership:v1';
  const setMarker = () => db.prepare(`
    INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, 'complete')
  `).run(reconciliationKey);

  setMarker();
  const authorizationUrl = new URL(integration.authorizationUrl({ sessionId: 'admin-session' }));
  const state = authorizationUrl.searchParams.get('state');
  assert.deepEqual(authorizationUrl.searchParams.get('scope').split(' ').sort(), [
    'email',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'openid',
  ]);
  await integration.completeAuthorization({
    sessionId: 'admin-session',
    state,
    code: 'authorization-code',
  });
  assert.equal(db.prepare('SELECT value FROM sync_state WHERE key = ?').get(reconciliationKey), undefined);
  assert.deepEqual(integration.status().capabilities, { read: true, send: true });
  assert.deepEqual(integration.sources()[0].capabilities, { read: true, send: true });
  assert.equal(
    resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' }).providerAccountId,
    'google-subject-owner',
  );

  setMarker();
  await integration.disconnect();
  assert.equal(db.prepare('SELECT value FROM sync_state WHERE key = ?').get(reconciliationKey), undefined);
});

test('Gmail OAuth persists tenant capabilities and invalidates only the replaced generation', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'first',
    email: 'admin@first.example.test',
    userId: 11,
    sessionId: 'first-session',
  });
  insertOrganizationAdmin(db, {
    organizationId: 2,
    handle: 'second',
    email: 'admin@second.example.test',
    userId: 22,
    sessionId: 'second-session',
  });
  const accounts = new Map([
    ['first-code', { access: 'access-first-v1', refresh: 'refresh-first-v1', email: 'mail@first.example.test', sub: 'google-first' }],
    ['first-reconnect', { access: 'access-first-v2', refresh: 'refresh-first-v2', email: 'mail@first.example.test', sub: 'google-first' }],
    ['second-code', { access: 'access-second', refresh: 'refresh-second', email: 'mail@second.example.test', sub: 'google-second' }],
  ]);
  let currentAccess = null;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      const account = accounts.get(options.body.get('code'));
      currentAccess = account.access;
      return jsonResponse(200, {
        access_token: account.access,
        refresh_token: account.refresh,
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'openid',
          'email',
        ].join(' '),
      });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      const account = [...accounts.values()].find(candidate => candidate.access === currentAccess);
      return jsonResponse(200, { emailAddress: account.email });
    }
    if (url.origin === 'https://openidconnect.googleapis.com') {
      const account = [...accounts.values()].find(candidate => candidate.access === currentAccess);
      return jsonResponse(200, {
        sub: account.sub,
        email: account.email,
        email_verified: true,
      });
    }
    if (url.pathname.endsWith('/revoke')) return jsonResponse(200, {});
    throw new Error(`Unexpected request: ${url}`);
  };
  const settings = {
    configured: true,
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    redirectUri: 'http://127.0.0.1:3000/api/integrations/gmail/callback',
    tokenEncryptionKey: Buffer.alloc(32, 8),
  };
  const integration = createGmailIntegration({
    db,
    gmail: settings,
    fetchImpl,
    clock: () => new Date('2026-08-26T09:00:00.000Z'),
  });
  assert.equal(integration.authorizationAvailable, true);
  assert.equal(integration.disconnectAvailable, true);

  await authorizeIntegration(integration, { sessionId: 'first-session', code: 'first-code' });
  await authorizeIntegration(integration, { sessionId: 'second-session', code: 'second-code' });
  const firstConnection = resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' });
  const secondConnection = resolveMailboxConnection({ db, organizationId: 2, provider: 'gmail' });
  assert.deepEqual(firstConnection.capabilities, ['read', 'send']);
  assert.deepEqual(secondConnection.capabilities, ['read', 'send']);
  assert.equal(firstConnection.providerAccountId, 'google-first');
  assert.equal(secondConnection.providerAccountId, 'google-second');
  assert.notEqual(firstConnection.encryptedGrant, 'refresh-first-v1');
  assert.notEqual(secondConnection.encryptedGrant, 'refresh-second');

  const restarted = createGmailIntegration({ db, gmail: settings, fetchImpl });
  const firstSourceV1 = restarted.sources({ organizationId: 1 })[0];
  const secondSource = restarted.sources({ organizationId: 2 })[0];
  assert.deepEqual(firstSourceV1.capabilities, { read: true, send: true });
  assert.deepEqual(secondSource.capabilities, { read: true, send: true });
  assert.equal(firstSourceV1.organizationId, 1);
  assert.equal(secondSource.organizationId, 2);
  assert.notEqual(firstSourceV1.connectionId, secondSource.connectionId);
  assert.equal(firstSourceV1.isCurrentConnection(), true);

  await authorizeIntegration(restarted, {
    sessionId: 'first-session',
    code: 'first-reconnect',
  });
  const firstSourceV2 = restarted.sources({ organizationId: 1 })[0];
  assert.equal(firstSourceV1.isCurrentConnection(), false);
  assert.equal(firstSourceV2.connectionId, firstSourceV1.connectionId);
  assert.equal(firstSourceV2.connectionGeneration, firstSourceV1.connectionGeneration + 1);
  assert.equal(secondSource.isCurrentConnection(), true);

  await restarted.disconnect({ organizationId: 1 });
  assert.deepEqual(restarted.sources({ organizationId: 1 }), []);
  assert.equal(restarted.status({ organizationId: 1 }).connected, false);
  assert.equal(restarted.status({ organizationId: 2 }).connected, true);
  assert.equal(secondSource.isCurrentConnection(), true);
});

test('Gmail rejects invalid verified identity claims and a changed stable subject', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'identity',
    email: 'admin@identity.example.test',
    userId: 31,
    sessionId: 'identity-session',
  });
  const claims = new Map([
    ['unverified', { sub: 'google-owner', email: 'owner@gmail.test', email_verified: false }],
    ['wrong-email', { sub: 'google-owner', email: 'other@gmail.test', email_verified: true }],
    ['blank-subject', { sub: ' ', email: 'owner@gmail.test', email_verified: true }],
    ['long-subject', { sub: 'x'.repeat(256), email: 'owner@gmail.test', email_verified: true }],
    ['stable-v1', { sub: 'google-owner', email: 'owner@gmail.test', email_verified: true }],
    ['stable-v2', { sub: 'different-google-owner', email: 'owner@gmail.test', email_verified: true }],
  ]);
  let currentCode = null;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      currentCode = options.body.get('code');
      return jsonResponse(200, {
        access_token: `access-${currentCode}`,
        refresh_token: `refresh-${currentCode}`,
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'openid',
          'email',
        ].join(' '),
      });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test' });
    }
    if (url.origin === 'https://openidconnect.googleapis.com') {
      return jsonResponse(200, claims.get(currentCode));
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const integration = createGmailIntegration({
    db,
    gmail: {
      configured: true,
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      redirectUri: 'http://127.0.0.1:3000/api/integrations/gmail/callback',
      tokenEncryptionKey: Buffer.alloc(32, 9),
    },
    fetchImpl,
    clock: () => new Date('2026-08-26T09:00:00.000Z'),
  });

  for (const code of ['unverified', 'wrong-email', 'blank-subject', 'long-subject']) {
    await assert.rejects(
      authorizeIntegration(integration, { sessionId: 'identity-session', code }),
      error => error.status === 502 && error.code === 'GMAIL_IDENTITY_VERIFICATION_FAILED',
    );
    assert.equal(resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' }), null);
  }

  await authorizeIntegration(integration, {
    sessionId: 'identity-session',
    code: 'stable-v1',
  });
  const stable = resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' });
  assert.equal(stable.providerAccountId, 'google-owner');
  await assert.rejects(
    authorizeIntegration(integration, {
      sessionId: 'identity-session',
      code: 'stable-v2',
    }),
    error => error.status === 409 && error.code === 'MAILBOX_IDENTITY_MISMATCH',
  );
  assert.equal(
    resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' }).providerAccountId,
    'google-owner',
  );
});

test('Gmail requires disconnect before replacing a legacy email identity', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'legacy',
    email: 'admin@legacy.example.test',
    userId: 41,
    sessionId: 'legacy-session',
  });
  const legacy = replaceConnectionGeneration({
    db,
    organizationId: 1,
    provider: 'gmail',
    account: {
      mailboxAddress: 'owner@gmail.test',
      providerAccountId: 'owner@gmail.test',
      adminUserId: 41,
      encryptedGrant: 'legacy-encrypted-grant',
      grantKind: 'oauth',
      capabilities: ['read', 'send'],
    },
    now: new Date('2026-08-26T08:00:00.000Z'),
  });
  db.prepare(`
    INSERT INTO conversations
      (id, organization_id, public_id, subject, created_at, updated_at)
    VALUES (1, 1, 'legacy-conversation', 'Legacy thread', ?, ?)
  `).run('2026-08-26T08:00:00.000Z', '2026-08-26T08:00:00.000Z');
  db.prepare(`
    INSERT INTO conversation_sources
      (organization_id, conversation_id, mailbox_identity_id,
       last_resolved_connection_id, provider, normalized_mailbox,
       native_conversation_id, created_at, updated_at)
    VALUES (1, 1, ?, ?, 'gmail', 'owner@gmail.test', 'legacy-thread', ?, ?)
  `).run(
    legacy.mailboxIdentityId,
    legacy.id,
    '2026-08-26T08:00:00.000Z',
    '2026-08-26T08:00:00.000Z',
  );

  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/revoke')) return jsonResponse(200, {});
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, {
        access_token: 'verified-access',
        refresh_token: 'verified-refresh',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'openid',
          'email',
        ].join(' '),
      });
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test' });
    }
    if (url.origin === 'https://openidconnect.googleapis.com') {
      return jsonResponse(200, {
        sub: 'verified-google-owner',
        email: 'owner@gmail.test',
        email_verified: true,
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const integration = createGmailIntegration({
    db,
    gmail: {
      configured: true,
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      redirectUri: 'http://127.0.0.1:3000/api/integrations/gmail/callback',
      tokenEncryptionKey: Buffer.alloc(32, 10),
    },
    fetchImpl,
    clock: () => new Date('2026-08-26T09:00:00.000Z'),
  });

  await assert.rejects(
    authorizeIntegration(integration, { sessionId: 'legacy-session', code: 'upgrade' }),
    error => error.status === 409 && error.code === 'GMAIL_LEGACY_IDENTITY_UPGRADE_REQUIRED',
  );
  assert.equal(
    resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' }).mailboxIdentityId,
    legacy.mailboxIdentityId,
  );

  await integration.disconnect({ organizationId: 1, adminUserId: 41 });
  await authorizeIntegration(integration, { sessionId: 'legacy-session', code: 'upgrade' });
  const upgraded = resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' });
  assert.equal(upgraded.providerAccountId, 'verified-google-owner');
  assert.notEqual(upgraded.mailboxIdentityId, legacy.mailboxIdentityId);
  const retainedSource = db.prepare(`
    SELECT mailbox_identity_id, last_resolved_connection_id
    FROM conversation_sources WHERE id = 1
  `).get();
  assert.deepEqual(
    { ...retainedSource },
    {
      mailbox_identity_id: legacy.mailboxIdentityId,
      last_resolved_connection_id: legacy.id,
    },
  );
});

test('Gmail performs a fresh Inbox sync when its history cursor is stale', async () => {
  const paths = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    paths.push(url.pathname);
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/history')) return jsonResponse(404, {});
    if (url.pathname.endsWith('/users/me/profile')) {
      return jsonResponse(200, { emailAddress: 'owner@gmail.test', historyId: '2000' });
    }
    if (url.pathname.endsWith('/users/me/messages')) {
      assert.equal(url.searchParams.get('maxResults'), '500');
      assert.equal(url.searchParams.get('labelIds'), 'INBOX');
      assert.equal(url.searchParams.has('pageToken'), false);
      return jsonResponse(200, {
        messages: [{ id: 'gmail-recovered' }],
        nextPageToken: 'page-that-must-not-be-fetched',
      });
    }
    if (url.pathname.endsWith('/gmail-recovered')) {
      return jsonResponse(200, gmailMessage({ id: 'gmail-recovered' }));
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await createGmailSource(fetchImpl).fetchChanges('expired-history-id');

  assert.equal(result.nextCursor, '2000');
  assert.equal(result.reconciliationRequired, true);
  assert.equal(result.messages[0].providerId, 'gmail:owner@gmail.test:gmail-recovered');
  assert.ok(paths.some(path => path.endsWith('/users/me/history')));
  assert.ok(paths.some(path => path.endsWith('/users/me/profile')));
  assert.equal(paths.filter(path => path.endsWith('/users/me/messages')).length, 1);
});

test('Outlook delta sync keeps pagination, removal, and provider mapping intact', async () => {
  const calls = [];
  const nextLink = 'https://graph.microsoft.com/v1.0/delta-next';
  const deltaLink = 'https://graph.microsoft.com/v1.0/delta-final';
  const fetchImpl = async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });
    if (url.startsWith('https://login.microsoftonline.com/')) {
      return jsonResponse(200, { access_token: 'graph-access' });
    }
    if (url === nextLink) {
      return jsonResponse(200, {
        value: [{
          id: ' graph-2 ',
          conversationId: 'conversation-2',
          internetMessageId: '<graph-2@example.test>',
          internetMessageHeaders: [],
          subject: '',
          from: null,
          bodyPreview: '',
          receivedDateTime: '2026-08-14T08:10:00.000Z',
          webLink: null,
        }],
        '@odata.deltaLink': deltaLink,
      });
    }
    return jsonResponse(200, {
      value: [
        {
          id: 'graph-1',
          conversationId: 'conversation-1',
          internetMessageId: '<graph-1@example.test>',
          internetMessageHeaders: [
            { name: 'In-Reply-To', value: '<earlier@example.test>' },
            { name: 'References', value: '<root@example.test> <earlier@example.test>' },
          ],
          subject: 'Graph message',
          from: { emailAddress: { name: 'Graph Sender', address: 'sender@graph.test' } },
          bodyPreview: 'Graph preview',
          receivedDateTime: '2026-08-14T08:30:00.000Z',
          webLink: 'https://outlook.office.com/mail/graph-1',
        },
        { id: 'removed', '@removed': { reason: 'deleted' } },
      ],
      '@odata.nextLink': nextLink,
    });
  };
  const source = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'Shared@Example.Test',
    fetchImpl,
  });

  const result = await source.fetchChanges(null);

  assert.equal(result.nextCursor, deltaLink);
  assert.deepEqual(result.messages.map(message => message.providerId), ['graph-1', 'graph-2']);
  assert.deepEqual(result.removedProviderIds, ['removed']);
  assert.deepEqual(result.messages[0], {
    providerId: 'graph-1',
    provider: 'outlook',
    mailboxAddress: 'Shared@Example.Test',
    subject: 'Graph message',
    senderName: 'Graph Sender',
    senderAddress: 'sender@graph.test',
    preview: 'Graph preview',
    receivedAt: '2026-08-14T08:30:00.000Z',
    nativeConversationId: 'conversation-1',
    internetMessageId: '<graph-1@example.test>',
    inReplyTo: '<earlier@example.test>',
    references: '<root@example.test> <earlier@example.test>',
    webUrl: 'https://outlook.office.com/mail/graph-1',
    outlookUrl: 'https://outlook.office.com/mail/graph-1',
  });
  assert.equal(result.messages[1].subject, '(No subject)');
  assert.equal(result.messages[1].senderName, 'Unknown sender');
  assert.equal(result.messages[1].nativeConversationId, 'conversation-2');
  const graphCalls = calls.filter(call => call.url.startsWith('https://graph.microsoft.com/'));
  assert.equal(graphCalls.length, 2);
  assert.ok(graphCalls.every(call => call.options.headers.authorization === 'Bearer graph-access'));
  assert.ok(graphCalls.every(call => call.options.headers.prefer === 'IdType="ImmutableId"'));
  const selectedFields = new URL(graphCalls[0].url).searchParams.get('$select').split(',');
  for (const field of [
    'conversationId',
    'internetMessageId',
    'internetMessageHeaders',
  ]) {
    assert.ok(selectedFields.includes(field));
  }
});

test('Outlook delta traverses safely while retaining only the newest 500 messages', async () => {
  const graphCalls = [];
  const message = index => ({
    id: `graph-${String(index).padStart(4, '0')}`,
    conversationId: `conversation-${index}`,
    subject: `Message ${index}`,
    from: { emailAddress: { name: 'Sender', address: 'sender@example.test' } },
    receivedDateTime: new Date(Date.UTC(2026, 7, 1, 0, 0, index)).toISOString(),
    bodyPreview: `Preview ${index}`,
  });
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === 'login.microsoftonline.com') {
      return jsonResponse(200, { access_token: 'graph-access' });
    }
    graphCalls.push(url);
    if (url.searchParams.get('page') === '2') {
      return jsonResponse(200, {
        value: Array.from({ length: 400 }, (_, offset) => message(400 + offset)),
        '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/me/delta-bounded',
      });
    }
    return jsonResponse(200, {
      value: Array.from({ length: 400 }, (_, index) => message(index)),
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages/delta?page=2',
    });
  };
  const source = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'shared@example.test',
    fetchImpl,
  });

  const result = await source.fetchChanges(null);
  assert.equal(result.messages.length, 500);
  assert.equal(result.messages.some(item => item.providerId === 'graph-0000'), false);
  assert.equal(result.messages.some(item => item.providerId === 'graph-0799'), true);
  assert.equal(graphCalls[0].searchParams.get('$top'), '500');

  const looping = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'shared@example.test',
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      if (url.hostname === 'login.microsoftonline.com') {
        return jsonResponse(200, { access_token: 'graph-access' });
      }
      return jsonResponse(200, {
        value: [],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages/delta?page=loop',
      });
    },
  });
  await assert.rejects(
    looping.fetchChanges(null),
    /repeated pagination link/u,
  );
});

test('Outlook reconciliation checks the scoped Inbox using immutable provider IDs', async () => {
  const messageCalls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'login.microsoftonline.com') {
      return jsonResponse(200, { access_token: 'graph-access' });
    }
    messageCalls.push({ url, options });
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    return messageId === 'graph-gone'
      ? jsonResponse(404, {})
      : jsonResponse(200, { id: messageId });
  };
  const source = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'Shared@Example.Test',
    fetchImpl,
  });

  assert.equal(
    source.reconciliationKey,
    'mail_reconciliation:outlook:inbox-membership:v1:shared@example.test',
  );
  const result = await source.reconcileInbox(['graph-present', 'graph-gone']);

  assert.deepEqual(result, {
    presentProviderIds: ['graph-present'],
    removedProviderIds: ['graph-gone'],
  });
  assert.equal(messageCalls.length, 2);
  for (const { url, options } of messageCalls) {
    assert.equal(
      url.pathname.startsWith('/v1.0/users/Shared%40Example.Test/mailFolders/inbox/messages/'),
      true,
    );
    assert.equal(url.searchParams.get('$select'), 'id');
    assert.equal(options.headers.authorization, 'Bearer graph-access');
    assert.equal(options.headers.prefer, 'IdType="ImmutableId"');
  }
});

test('Graph sends MIME only with send capability and accepts only 202', async () => {
  const graphCalls = [];
  const source = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'Shared@Example.Test',
    capabilities: { read: true, send: true },
    fetchImpl: async (input, options = {}) => {
      const url = new URL(String(input));
      if (url.hostname === 'login.microsoftonline.com') {
        return jsonResponse(200, { access_token: 'graph-access' });
      }
      graphCalls.push({ url, options });
      return jsonResponse(202, '');
    },
  });
  const rawMime = Buffer.from('Message-ID: <lexflow-graph@example.test>\r\n\r\nGraph digest');

  assert.deepEqual(source.capabilities, { read: true, send: true });
  assert.deepEqual(await source.sendAssignmentDigest({ rawMime }), {
    providerMessageId: null,
  });
  assert.equal(graphCalls.length, 1);
  assert.equal(
    graphCalls[0].url.pathname,
    '/v1.0/users/Shared%40Example.Test/sendMail',
  );
  assert.equal(graphCalls[0].options.method, 'POST');
  assert.equal(graphCalls[0].options.headers.authorization, 'Bearer graph-access');
  assert.equal(graphCalls[0].options.headers['content-type'], 'text/plain');
  assert.deepEqual(Buffer.from(graphCalls[0].options.body, 'base64'), rawMime);
});

test('Graph delegated send uses me and safely rejects read-only, forbidden, and non-202 responses', async () => {
  const readOnly = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'shared@example.test',
    fetchImpl: async () => {
      throw new Error('must not call provider');
    },
  });
  assert.deepEqual(readOnly.capabilities, { read: true, send: false });
  await assert.rejects(
    readOnly.sendAssignmentDigest({ rawMime: 'blocked' }),
    error => error.code === 'GRAPH_SEND_NOT_AUTHORIZED' && error.ambiguous === false,
  );

  const paths = [];
  const forbidden = new GraphMailSource({
    tenantId: 'unused',
    clientId: 'unused',
    clientSecret: 'unused',
    mailbox: 'shared@example.test',
    authMode: 'delegated',
    accessTokenProvider: async () => 'delegated-access',
    capabilities: { read: true, send: true },
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      paths.push(url.pathname);
      return jsonResponse(403, { error: { message: 'provider secret' } });
    },
  });
  await assert.rejects(
    forbidden.sendAssignmentDigest({ rawMime: 'sensitive body' }),
    error => {
      assert.equal(error.code, 'GRAPH_SEND_FORBIDDEN');
      assert.equal(error.ambiguous, false);
      assert.equal(error.retryable, false);
      assert.doesNotMatch(error.message, /provider secret|sensitive body/u);
      return true;
    },
  );
  assert.deepEqual(paths, ['/v1.0/me/sendMail']);

  const unexpectedSuccess = new GraphMailSource({
    tenantId: 'tenant',
    clientId: 'client',
    clientSecret: 'secret',
    mailbox: 'shared@example.test',
    capabilities: { read: true, send: true },
    fetchImpl: async (input) => (
      new URL(String(input)).hostname === 'login.microsoftonline.com'
        ? jsonResponse(200, { access_token: 'graph-access' })
        : jsonResponse(200, {})
    ),
  });
  await assert.rejects(
    unexpectedSuccess.sendAssignmentDigest({ rawMime: 'digest' }),
    error => error.code === 'GRAPH_SEND_INVALID_RESPONSE' && error.ambiguous === false,
  );
});

test('Graph delegated sync and reconciliation stay under the signed-in me mailbox', async () => {
  const graphCalls = [];
  const source = new GraphMailSource({
    tenantId: 'unused',
    clientId: 'unused',
    clientSecret: 'unused',
    mailbox: 'owner@outlook.test',
    authMode: 'delegated',
    accessTokenProvider: async () => 'delegated-access',
    capabilities: { read: true, send: true },
    fetchImpl: async (input, options = {}) => {
      const url = new URL(String(input));
      graphCalls.push({ url, options });
      if (url.pathname.endsWith('/messages/delta')) {
        return jsonResponse(200, {
          value: [],
          '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/me/delta-finished',
        });
      }
      if (url.pathname.endsWith('/messages/immutable-1')) {
        return jsonResponse(200, { id: 'immutable-1' });
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  await source.fetchChanges(null);
  await source.reconcileInbox(['immutable-1']);
  await assert.rejects(
    source.fetchChanges('https://attacker.example.test/stolen-delta'),
    /invalid pagination link/u,
  );

  assert.deepEqual(graphCalls.map(call => call.url.pathname), [
    '/v1.0/me/mailFolders/inbox/messages/delta',
    '/v1.0/me/mailFolders/inbox/messages/immutable-1',
  ]);
  assert.ok(graphCalls.every(call => call.options.headers.prefer === 'IdType="ImmutableId"'));
});

test('Gmail conversation history resolves an anchor and returns only the latest Inbox and Sent previews', async () => {
  const calls = [];
  const eligible = Array.from({ length: 102 }, (_, index) => gmailMessage({
    id: `history-${index}`,
    threadId: 'resolved-thread',
    internalDate: String(1_786_600_000_000 + index * 1000),
    from: index % 2 ? 'Mailbox Owner <owner@gmail.test>' : 'Client <client@example.test>',
    internetMessageId: index === 50
      ? '<lexflow-delivery@example.test>'
      : `<history-${index}@example.test>`,
    snippet: index === 101
      ? 'Latest &amp; correctly\n formatted'
      : index === 100
        ? 'long-word '.repeat(80)
        : `Preview ${index}`,
    labelIds: index % 2 ? ['SENT'] : ['INBOX'],
  }));
  const excluded = [
    gmailMessage({ id: 'draft', threadId: 'resolved-thread', labelIds: ['SENT', 'DRAFT'] }),
    gmailMessage({ id: 'trash', threadId: 'resolved-thread', labelIds: ['INBOX', 'TRASH'] }),
    gmailMessage({ id: 'spam', threadId: 'resolved-thread', labelIds: ['INBOX', 'SPAM'] }),
    gmailMessage({ id: 'archive', threadId: 'resolved-thread', labelIds: ['IMPORTANT'] }),
  ];
  const source = createGmailSource(async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture' });
    }
    if (url.pathname.endsWith('/messages/anchor-message')) {
      return jsonResponse(200, gmailMessage({
        id: 'anchor-message',
        threadId: 'resolved-thread',
      }));
    }
    if (url.pathname.endsWith('/threads/resolved-thread')) {
      return jsonResponse(200, {
        id: 'resolved-thread',
        messages: [...eligible, ...excluded].reverse(),
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const result = await source.fetchConversation({
    providerMessageId: 'gmail:owner@gmail.test:anchor-message',
    deliveryMessageIds: ['<lexflow-delivery@example.test>'],
  });

  assert.equal(result.truncated, true);
  assert.equal(result.messages.length, 100);
  assert.equal(result.messages[0].providerMessageId, 'history-1');
  assert.equal(result.messages.at(-1).providerMessageId, 'history-101');
  assert.equal(result.messages.at(-1).preview, 'Latest & correctly formatted');
  const boundedPreview = result.messages.find(message => message.providerMessageId === 'history-100').preview;
  assert.equal([...boundedPreview].length <= 320, true);
  assert.equal(boundedPreview.endsWith('\u2026'), true);
  assert.deepEqual(
    new Set(result.messages.map(message => message.direction)),
    new Set(['received', 'sent']),
  );
  assert.equal(
    result.messages.some(message => [
      'draft',
      'trash',
      'spam',
      'archive',
      'history-50',
    ].includes(message.providerMessageId)),
    false,
  );
  const threadCall = calls.find(call => call.url.pathname.endsWith('/threads/resolved-thread'));
  assert.equal(threadCall.url.searchParams.get('format'), 'metadata');
  assert.deepEqual(threadCall.url.searchParams.getAll('metadataHeaders'), [
    'From',
    'Message-ID',
  ]);
});

test('Outlook conversation history resolves immutable conversation identity and merges bounded Inbox and Sent pages', async () => {
  const calls = [];
  const nextLink = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?page=2';
  const source = new GraphMailSource({
    tenantId: 'unused',
    clientId: 'unused',
    clientSecret: 'unused',
    mailbox: 'owner@outlook.test',
    authMode: 'delegated',
    accessTokenProvider: async () => 'delegated-access',
    capabilities: { read: true, send: true },
    fetchImpl: async (input, options = {}) => {
      const url = new URL(String(input));
      calls.push({ url, options });
      if (url.pathname.endsWith('/me/messages/graph-anchor')) {
        return jsonResponse(200, { id: 'graph-anchor', conversationId: "conversation-'quoted" });
      }
      if (String(input) === nextLink) {
        return jsonResponse(200, {
          value: [{
            id: 'in-2',
            conversationId: "conversation-'quoted",
            internetMessageId: '<in-2@example.test>',
            from: { emailAddress: { name: 'Client', address: 'client@example.test' } },
            receivedDateTime: '2026-08-26T09:02:00.000Z',
            bodyPreview: 'Second inbox preview',
            webLink: 'https://outlook.office.com/mail/in-2',
          }],
        });
      }
      if (url.pathname.endsWith('/mailFolders/inbox/messages')) {
        return jsonResponse(200, {
          value: [{
            id: 'in-1',
            conversationId: "conversation-'quoted",
            internetMessageId: '<in-1@example.test>',
            from: { emailAddress: { name: 'Client', address: 'client@example.test' } },
            receivedDateTime: '2026-08-26T09:00:00.000Z',
            bodyPreview: 'First &amp; formatted',
            webLink: 'https://outlook.office.com/mail/in-1',
          }],
          '@odata.nextLink': nextLink,
        });
      }
      if (url.pathname.endsWith('/mailFolders/sentitems/messages')) {
        return jsonResponse(200, {
          value: [
            {
              id: 'sent-1',
              conversationId: "conversation-'quoted",
              internetMessageId: '<sent-1@example.test>',
              from: { emailAddress: { name: 'Owner', address: 'owner@outlook.test' } },
              sentDateTime: '2026-08-26T09:01:00.000Z',
              bodyPreview: 'Sent preview',
              webLink: 'https://outlook.office.com/mail/sent-1',
            },
            {
              id: 'digest',
              conversationId: "conversation-'quoted",
              internetMessageId: '<lexflow-delivery@example.test>',
              sentDateTime: '2026-08-26T09:03:00.000Z',
              bodyPreview: 'Assignment digest',
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  const result = await source.fetchConversation({
    providerMessageId: 'graph-anchor',
    deliveryMessageIds: ['<lexflow-delivery@example.test>'],
  });

  assert.deepEqual(result, {
    truncated: false,
    messages: [
      {
        providerMessageId: 'in-1',
        direction: 'received',
        sender: { name: 'Client', address: 'client@example.test' },
        occurredAt: '2026-08-26T09:00:00.000Z',
        preview: 'First & formatted',
        internetMessageId: '<in-1@example.test>',
        webUrl: 'https://outlook.office.com/mail/in-1',
      },
      {
        providerMessageId: 'sent-1',
        direction: 'sent',
        sender: { name: 'Owner', address: 'owner@outlook.test' },
        occurredAt: '2026-08-26T09:01:00.000Z',
        preview: 'Sent preview',
        internetMessageId: '<sent-1@example.test>',
        webUrl: 'https://outlook.office.com/mail/sent-1',
      },
      {
        providerMessageId: 'in-2',
        direction: 'received',
        sender: { name: 'Client', address: 'client@example.test' },
        occurredAt: '2026-08-26T09:02:00.000Z',
        preview: 'Second inbox preview',
        internetMessageId: '<in-2@example.test>',
        webUrl: 'https://outlook.office.com/mail/in-2',
      },
    ],
  });
  const graphCalls = calls.filter(call => call.url.origin === 'https://graph.microsoft.com');
  assert.ok(graphCalls.every(call => call.options.headers.prefer === 'IdType="ImmutableId"'));
  const folderCalls = graphCalls.filter(call => call.url.pathname.includes('/mailFolders/'));
  assert.deepEqual(
    folderCalls.map(call => call.url.pathname.split('/mailFolders/')[1].split('/')[0]).toSorted(),
    ['inbox', 'inbox', 'sentitems'],
  );
  assert.ok(folderCalls[0].url.searchParams.get('$filter').includes("conversation-''quoted"));
});

test('delegated Outlook OAuth persists a generation-safe organization mailbox grant', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'outlook',
    email: 'admin@outlook.example.test',
    userId: 31,
    sessionId: 'outlook-admin-session',
  });
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'outlook-second',
    email: 'second-admin@outlook.example.test',
    userId: 32,
    sessionId: 'outlook-second-session',
  });
  let tokenExchange = 0;
  const refreshTokensUsed = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'login.microsoftonline.com' && url.pathname.endsWith('/token')) {
      if (options.body.get('grant_type') === 'refresh_token') {
        refreshTokensUsed.push(options.body.get('refresh_token'));
        assert.match(options.body.get('refresh_token'), /^outlook-(?:refresh-|rotated-refresh)/u);
        assert.equal(options.body.get('scope'), 'offline_access User.Read Mail.Read Mail.Send');
        return jsonResponse(200, {
          access_token: 'outlook-refreshed-access',
          refresh_token: 'outlook-rotated-refresh',
          expires_in: 3600,
        });
      }
      tokenExchange += 1;
      assert.equal(options.body.get('grant_type'), 'authorization_code');
      return jsonResponse(200, {
        access_token: `outlook-access-${tokenExchange}`,
        refresh_token: `outlook-refresh-${tokenExchange}`,
        scope: 'offline_access User.Read Mail.Read Mail.Send',
      });
    }
    if (url.pathname === '/v1.0/me') {
      return jsonResponse(200, {
        id: 'immutable-microsoft-account-id',
        mail: 'owner@outlook.example.test',
        userPrincipalName: 'owner@outlook.example.test',
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const settings = {
    configured: true,
    tenantId: 'organizations',
    clientId: 'outlook-client-id',
    clientSecret: 'outlook-client-secret',
    redirectUri: 'http://127.0.0.1:3000/api/integrations/outlook/callback',
    tokenEncryptionKey: Buffer.alloc(32, 9),
    requestedScopes: ['offline_access', 'User.Read', 'Mail.Read', 'Mail.Send'],
  };
  const integration = createOutlookIntegration({
    db,
    outlook: settings,
    fetchImpl,
    clock: () => new Date('2026-08-26T10:00:00.000Z'),
  });
  assert.equal(integration.authorizationAvailable, true);
  assert.equal(integration.disconnectAvailable, true);

  const authorization = new URL(integration.authorizationUrl({
    sessionId: 'outlook-admin-session',
  }));
  await assert.rejects(integration.completeAuthorization({
    sessionId: 'outlook-second-session',
    state: authorization.searchParams.get('state'),
    code: 'must-not-exchange',
  }), error => error.code === 'INVALID_OAUTH_STATE');
  assert.equal(tokenExchange, 0);
  await integration.completeAuthorization({
    sessionId: 'outlook-admin-session',
    state: authorization.searchParams.get('state'),
    code: 'outlook-code-v1',
  });
  assert.deepEqual(authorization.searchParams.get('scope').split(' '), [
    'offline_access',
    'User.Read',
    'Mail.Read',
    'Mail.Send',
  ]);
  const connectionV1 = resolveMailboxConnection({ db, organizationId: 1, provider: 'outlook' });
  assert.equal(connectionV1.providerAccountId, 'immutable-microsoft-account-id');
  assert.equal(connectionV1.mailboxAddress, 'owner@outlook.example.test');
  assert.deepEqual(connectionV1.capabilities, ['read', 'send']);
  assert.doesNotMatch(connectionV1.encryptedGrant, /outlook-refresh/u);
  const cursorKey = 'mail_cursor:graph:owner@outlook.example.test';
  db.prepare(`
    INSERT INTO sync_state (organization_id, connection_id, key, value)
    VALUES (?, ?, ?, ?), (?, ?, ?, ?)
  `).run(
    1,
    connectionV1.id,
    `last_sync_at:${cursorKey}`,
    '2026-08-26T10:01:00.000Z',
    1,
    connectionV1.id,
    `last_sync_error:${cursorKey}`,
    'refresh_token=outlook-refresh-secret expired',
  );
  const connectedStatus = integration.status({ organizationId: 1 });
  assert.equal(connectedStatus.lastSuccessAt, '2026-08-26T10:01:00.000Z');
  assert.equal(connectedStatus.lastError, 'refresh_token=[redacted] expired');
  assert.doesNotMatch(JSON.stringify(connectedStatus), /outlook-refresh-secret/u);

  const restarted = createOutlookIntegration({ db, outlook: settings, fetchImpl });
  const sourceV1 = restarted.sources({ organizationId: 1 })[0];
  assert.equal(sourceV1.authMode, 'delegated');
  assert.deepEqual(sourceV1.capabilities, { read: true, send: true });
  assert.equal(sourceV1.organizationId, 1);
  assert.equal(sourceV1.connectionId, connectionV1.id);
  assert.equal(sourceV1.connectionGeneration, connectionV1.generation);
  assert.equal(sourceV1.mailboxIdentityId, connectionV1.mailboxIdentityId);
  assert.equal(sourceV1.isCurrentConnection(), true);
  assert.deepEqual(await Promise.all([
    sourceV1.accessToken(),
    sourceV1.accessToken(),
  ]), ['outlook-refreshed-access', 'outlook-refreshed-access']);
  assert.deepEqual(refreshTokensUsed, ['outlook-refresh-1']);
  const rotatedCiphertext = db.prepare(`
    SELECT encrypted_grant FROM mailbox_connections WHERE id = ?
  `).get(connectionV1.id).encrypted_grant;
  assert.notEqual(rotatedCiphertext, connectionV1.encryptedGrant);
  assert.doesNotMatch(rotatedCiphertext, /outlook-rotated-refresh/u);

  const afterRotationRestart = createOutlookIntegration({
    db,
    outlook: settings,
    fetchImpl,
    clock: () => new Date('2026-08-26T12:00:00.000Z'),
  });
  assert.equal(
    await afterRotationRestart.sources({ organizationId: 1 })[0].accessToken(),
    'outlook-refreshed-access',
  );
  assert.deepEqual(refreshTokensUsed, ['outlook-refresh-1', 'outlook-rotated-refresh']);

  await authorizeIntegration(restarted, {
    sessionId: 'outlook-admin-session',
    code: 'outlook-code-v2',
  });
  const sourceV2 = restarted.sources({ organizationId: 1 })[0];
  assert.equal(sourceV1.isCurrentConnection(), false);
  assert.equal(sourceV2.connectionId, sourceV1.connectionId);
  assert.equal(sourceV2.connectionGeneration, sourceV1.connectionGeneration + 1);

  await restarted.disconnect({ organizationId: 1 });
  assert.deepEqual(restarted.sources({ organizationId: 1 }), []);
  assert.equal(restarted.status({ organizationId: 1 }).connected, false);
  assert.equal(db.prepare(`
    SELECT encrypted_grant FROM mailbox_connections WHERE id = ?
  `).get(sourceV2.connectionId).encrypted_grant, '');
});

test('Outlook integration preserves organization-one legacy Graph application reads', () => {
  const db = createDatabase(':memory:');
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'legacy-outlook',
    email: 'legacy-admin@example.test',
    userId: 41,
    sessionId: 'legacy-outlook-session',
  });
  const integration = createOutlookIntegration({
    db,
    outlook: { configured: false },
    graph: {
      tenantId: 'tenant',
      clientId: 'client',
      clientSecret: 'secret',
      mailbox: 'legacy@example.test',
      authMode: 'application',
      capabilities: { read: true, send: false },
    },
  });
  assert.equal(integration.authorizationAvailable, false);
  assert.equal(integration.disconnectAvailable, false);

  assert.deepEqual(integration.status({ organizationId: 1 }), {
    configured: true,
    connected: true,
    accountEmail: 'legacy@example.test',
    authMode: 'application',
    capabilities: { read: true, send: false },
    connectionId: 1,
    connectionGeneration: 1,
    lastSuccessAt: null,
    lastError: null,
  });
  const source = integration.sources({ organizationId: 1 })[0];
  assert.equal(source.authMode, 'application');
  assert.equal(source.connectionId, 1);
  assert.equal(source.mailboxIdentityId, 1);
  assert.equal(source.isCurrentConnection(), true);
  assert.deepEqual(integration.sources({ organizationId: 2 }), []);
  db.close();
});

test('Outlook legacy fallback preserves identity across delegated disconnect and restart', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  insertOrganizationAdmin(db, {
    organizationId: 1,
    handle: 'outlook-continuity',
    email: 'admin@outlook-continuity.example.test',
    userId: 51,
    sessionId: 'outlook-continuity-session',
  });
  let authorizationCount = 0;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'login.microsoftonline.com' && url.pathname.endsWith('/token')) {
      assert.equal(options.body.get('grant_type'), 'authorization_code');
      authorizationCount += 1;
      return jsonResponse(200, {
        access_token: `continuity-access-${authorizationCount}`,
        refresh_token: `continuity-refresh-${authorizationCount}`,
        scope: 'offline_access User.Read Mail.Read Mail.Send',
      });
    }
    if (url.pathname === '/v1.0/me') {
      return jsonResponse(200, {
        id: 'continuity-account-id',
        mail: 'legacy@example.test',
        userPrincipalName: 'legacy@example.test',
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const outlook = {
    configured: true,
    tenantId: 'organizations',
    clientId: 'outlook-client-id',
    clientSecret: 'outlook-client-secret',
    redirectUri: 'http://127.0.0.1:3000/api/integrations/outlook/callback',
    tokenEncryptionKey: Buffer.alloc(32, 12),
    requestedScopes: ['offline_access', 'User.Read', 'Mail.Read', 'Mail.Send'],
  };
  const graph = {
    tenantId: 'legacy-tenant',
    clientId: 'legacy-client',
    clientSecret: 'legacy-secret',
    mailbox: 'legacy@example.test',
    authMode: 'application',
    capabilities: { read: true, send: false },
  };
  const integration = createOutlookIntegration({ db, outlook, graph, fetchImpl });
  const legacyV1 = resolveMailboxConnection({ db, organizationId: 1, provider: 'outlook' });

  await authorizeIntegration(integration, {
    sessionId: 'outlook-continuity-session',
    code: 'continuity-code-1',
  });
  const delegatedV1 = resolveMailboxConnection({ db, organizationId: 1, provider: 'outlook' });
  assert.equal(delegatedV1.id, legacyV1.id);
  assert.equal(delegatedV1.mailboxIdentityId, legacyV1.mailboxIdentityId);
  assert.equal(delegatedV1.providerAccountId, 'continuity-account-id');
  assert.equal(delegatedV1.generation, legacyV1.generation + 1);

  await integration.disconnect({ organizationId: 1, adminUserId: 51 });
  const legacyV2 = resolveMailboxConnection({ db, organizationId: 1, provider: 'outlook' });
  assert.equal(legacyV2.id, legacyV1.id);
  assert.equal(legacyV2.mailboxIdentityId, legacyV1.mailboxIdentityId);
  assert.equal(legacyV2.providerAccountId, 'continuity-account-id');
  assert.equal(legacyV2.grantKind, 'legacy');
  assert.equal(legacyV2.generation, delegatedV1.generation + 2);

  const restarted = createOutlookIntegration({ db, outlook, graph, fetchImpl });
  const legacyAfterRestart = resolveMailboxConnection({
    db,
    organizationId: 1,
    provider: 'outlook',
  });
  assert.equal(legacyAfterRestart.id, legacyV1.id);
  assert.equal(legacyAfterRestart.mailboxIdentityId, legacyV1.mailboxIdentityId);
  assert.equal(legacyAfterRestart.generation, legacyV2.generation);

  await authorizeIntegration(restarted, {
    sessionId: 'outlook-continuity-session',
    code: 'continuity-code-2',
  });
  const delegatedV2 = resolveMailboxConnection({ db, organizationId: 1, provider: 'outlook' });
  assert.equal(delegatedV2.id, legacyV1.id);
  assert.equal(delegatedV2.mailboxIdentityId, legacyV1.mailboxIdentityId);
  assert.equal(delegatedV2.providerAccountId, 'continuity-account-id');
  assert.equal(delegatedV2.generation, legacyV2.generation + 1);
  assert.equal(authorizationCount, 2);
});
