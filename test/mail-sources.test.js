import assert from 'node:assert/strict';
import test from 'node:test';

import { GmailMailSource } from '../src/gmail.js';
import { GraphMailSource } from '../src/mail-sources.js';

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
  };
}

function gmailMessage({
  id,
  threadId = `thread-${id}`,
  internalDate = '1786696200000',
  subject = 'Urgent NDA amendment for ACME',
  from = 'ACME Legal <legal@acme.test>',
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

test('Gmail incremental sync imports only Inbox additions and advances history', async () => {
  const requestedMessages = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://oauth2.googleapis.com') {
      return jsonResponse(200, { access_token: 'access-fixture', expires_in: 3600 });
    }
    if (url.pathname.endsWith('/users/me/history')) {
      assert.equal(url.searchParams.get('startHistoryId'), '1200');
      assert.deepEqual(url.searchParams.getAll('historyTypes'), ['messageAdded', 'labelAdded']);
      assert.equal(url.searchParams.get('labelId'), 'INBOX');
      return jsonResponse(200, {
        history: [{
          messagesAdded: [
            { message: { id: 'gmail-3', labelIds: ['INBOX'] } },
            { message: { id: 'gmail-spam', labelIds: ['SPAM'] } },
          ],
          labelsAdded: [
            { message: { id: 'gmail-moved' }, labelIds: ['INBOX'] },
            { message: { id: 'gmail-starred' }, labelIds: ['STARRED'] },
          ],
        }],
        historyId: '1202',
      });
    }
    const messageId = decodeURIComponent(url.pathname.split('/').at(-1));
    requestedMessages.push(messageId);
    return jsonResponse(200, gmailMessage({ id: messageId }));
  };

  const result = await createGmailSource(fetchImpl).fetchChanges('1200');

  assert.equal(result.nextCursor, '1202');
  assert.deepEqual(requestedMessages, ['gmail-3', 'gmail-moved']);
  assert.deepEqual(result.messages.map(message => message.providerId), [
    'gmail:owner@gmail.test:gmail-3',
    'gmail:owner@gmail.test:gmail-moved',
  ]);
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
          id: 'graph-2',
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
          conversationId: 'thread-1',
          internetMessageId: '<graph-1@example.test>',
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
  assert.deepEqual(result.messages.map(message => message.providerId), [
    'outlook:shared@example.test:graph-1',
    'outlook:shared@example.test:graph-2',
  ]);
  assert.deepEqual(result.messages[0], {
    providerId: 'outlook:shared@example.test:graph-1',
    conversationId: 'thread-1',
    internetMessageId: '<graph-1@example.test>',
    provider: 'outlook',
    mailboxAddress: 'Shared@Example.Test',
    subject: 'Graph message',
    senderName: 'Graph Sender',
    senderAddress: 'sender@graph.test',
    preview: 'Graph preview',
    receivedAt: '2026-08-14T08:30:00.000Z',
    webUrl: 'https://outlook.office.com/mail/graph-1',
    outlookUrl: 'https://outlook.office.com/mail/graph-1',
  });
  assert.equal(result.messages[1].subject, '(No subject)');
  assert.equal(result.messages[1].senderName, 'Unknown sender');
  const graphCalls = calls.filter(call => call.url.startsWith('https://graph.microsoft.com/'));
  assert.equal(graphCalls.length, 2);
  assert.equal(
    new URL(graphCalls[0].url).searchParams.get('$select'),
    'id,conversationId,internetMessageId,subject,from,receivedDateTime,bodyPreview,webLink',
  );
  assert.ok(graphCalls.every(call => call.options.headers.authorization === 'Bearer graph-access'));
  assert.ok(graphCalls.every(call => call.options.headers.prefer === 'IdType="ImmutableId"'));
});
