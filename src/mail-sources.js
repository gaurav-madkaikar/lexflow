import { normalizeMessagePreview } from './message-preview.js';

const GRAPH_MESSAGE_FIELDS = [
  'id',
  'conversationId',
  'internetMessageId',
  'internetMessageHeaders',
  'subject',
  'from',
  'receivedDateTime',
  'bodyPreview',
  'webLink',
];
const MAX_OUTBOUND_MIME_BYTES = 1024 * 1024;
const MAX_HEADER_METADATA_LENGTH = 8192;
const MAX_CONVERSATION_MESSAGES = 100;
const MAX_CONVERSATION_PAGES_PER_FOLDER = 5;
const MAX_DELTA_ACTIONABLE_MESSAGES = 500;
const MAX_DELTA_REMOVALS = 2_000;
const MAX_DELTA_PAGES = 200;

function normalizedCapabilities(value, fallback = { read: true, send: false }) {
  if (Array.isArray(value)) {
    return { read: value.includes('read'), send: value.includes('send') };
  }
  return {
    read: typeof value?.read === 'boolean' ? value.read : fallback.read,
    send: typeof value?.send === 'boolean' ? value.send : fallback.send,
  };
}

function providerSendError(code, safeMessage, {
  status = 502,
  retryable = false,
  ambiguous = false,
} = {}) {
  const error = new Error(safeMessage);
  Object.assign(error, { code, status, retryable, ambiguous, safeMessage });
  return error;
}

function requestSignal(requestTimeoutMs, signal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function rawMimeBytes(rawMime) {
  const bytes = Buffer.isBuffer(rawMime)
    ? Buffer.from(rawMime)
    : rawMime instanceof Uint8Array
      ? Buffer.from(rawMime)
      : typeof rawMime === 'string'
        ? Buffer.from(rawMime, 'utf8')
        : null;
  if (!bytes?.length || bytes.length > MAX_OUTBOUND_MIME_BYTES) {
    throw providerSendError(
      'GRAPH_SEND_INVALID_MESSAGE',
      'The assignment message is empty or too large to send.',
      { status: 400 },
    );
  }
  return bytes;
}

function normalizedHeaderMetadata(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/\r?\n[\t ]+/gu, ' ')
    .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return normalized && normalized.length <= MAX_HEADER_METADATA_LENGTH ? normalized : null;
}

export function normalizeProviderPreview(value) {
  return normalizeMessagePreview(value).preview;
}

function safeOutlookWebUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && ['outlook.office.com', 'outlook.office365.com'].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function graphApiUrl(value) {
  const url = value instanceof URL ? new URL(value) : new URL(String(value));
  if (url.origin !== 'https://graph.microsoft.com' || !url.pathname.startsWith('/v1.0/')) {
    throw new Error('Outlook returned an invalid pagination link');
  }
  return url;
}

function graphHeader(item, name) {
  if (!Array.isArray(item?.internetMessageHeaders)) return null;
  const header = item.internetMessageHeaders.find(entry => (
    typeof entry?.name === 'string'
    && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase()
  ));
  return normalizedHeaderMetadata(header?.value);
}

const demoMessages = [
  {
    providerId: 'mock-nda-1',
    subject: 'Urgent: NDA amendment for Project Falcon',
    senderName: 'Priya Nair',
    senderAddress: 'priya@acme.com',
    preview: 'ACME requests review of the amendment before today\'s signing call.',
    receivedAt: '2026-08-14T03:34:00.000Z',
    outlookUrl: null
  },
  {
    providerId: 'mock-court-1',
    subject: 'Court notice — Orion Systems vs. Delta',
    senderName: 'Robert Chen',
    senderAddress: 'robert@lawfirm.com',
    preview: 'New district court notice requiring a response.',
    receivedAt: '2026-08-14T03:12:00.000Z',
    outlookUrl: null
  },
  {
    providerId: 'mock-invoice-1',
    subject: 'Outstanding payment — Invoice INV-4821',
    senderName: 'David Lee',
    senderAddress: 'ap@globex.com',
    preview: 'Can you confirm the status of the overdue invoice?',
    receivedAt: '2026-08-14T02:57:00.000Z',
    outlookUrl: null
  },
  {
    providerId: 'mock-po-1',
    subject: 'PO required for September billing',
    senderName: 'Sarah Wong',
    senderAddress: 'procurement@initech.com',
    preview: 'Please provide the PO before the next invoice is submitted.',
    receivedAt: '2026-08-14T02:35:00.000Z',
    outlookUrl: null
  },
  {
    providerId: 'mock-employment-1',
    subject: 'Employment agreement review — VP hire',
    senderName: 'Anita Rao',
    senderAddress: 'anita@peoplecorp.com',
    preview: 'Review revised employment terms and restrictive covenants.',
    receivedAt: '2026-08-14T02:08:00.000Z',
    outlookUrl: null
  },
  {
    providerId: 'mock-collections-1',
    subject: 'Payment escalation — ACME account',
    senderName: 'Accounts',
    senderAddress: 'ar@acme.com',
    preview: 'The customer requests clarification on outstanding balances.',
    receivedAt: '2026-08-14T01:51:00.000Z',
    outlookUrl: null
  }
].map(message => ({
  ...message,
  provider: 'demo',
  mailboxAddress: null,
  nativeConversationId: null,
  internetMessageId: null,
  inReplyTo: null,
  references: null,
  webUrl: message.outlookUrl
}));

const GRAPH_RECONCILIATION_BATCH_SIZE = 20;

function mapGraphMessage(item, mailbox) {
  return {
    providerId: item.id,
    provider: 'outlook',
    mailboxAddress: mailbox,
    subject: item.subject || '(No subject)',
    senderName: item.from?.emailAddress?.name || 'Unknown sender',
    senderAddress: item.from?.emailAddress?.address || '',
    preview: item.bodyPreview || '',
    receivedAt: item.receivedDateTime,
    nativeConversationId: normalizedHeaderMetadata(item.conversationId),
    internetMessageId: normalizedHeaderMetadata(item.internetMessageId)
      ?? graphHeader(item, 'Message-ID'),
    inReplyTo: graphHeader(item, 'In-Reply-To'),
    references: graphHeader(item, 'References'),
    webUrl: item.webLink || null,
    outlookUrl: item.webLink || null
  };
}

function newestGraphMessages(messages, limit = MAX_DELTA_ACTIONABLE_MESSAGES) {
  return [...messages]
    .sort((left, right) => {
      const leftTime = new Date(left.receivedAt).getTime();
      const rightTime = new Date(right.receivedAt).getTime();
      const safeLeft = Number.isFinite(leftTime) ? leftTime : Number.MIN_SAFE_INTEGER;
      const safeRight = Number.isFinite(rightTime) ? rightTime : Number.MIN_SAFE_INTEGER;
      return safeRight - safeLeft || String(right.providerId).localeCompare(String(left.providerId));
    })
    .slice(0, limit);
}

export class MockMailSource {
  provider = 'demo';
  mailboxAddress = null;
  sourceKey = 'demo';
  cursorKey = 'mail_cursor:demo';
  capabilities = { read: true, send: false };

  async fetchChanges(cursor) {
    return cursor
      ? { messages: [], removedProviderIds: [], nextCursor: cursor }
      : { messages: demoMessages, removedProviderIds: [], nextCursor: 'mock-v1' };
  }
}

export class GraphMailSource {
  constructor({
    tenantId,
    clientId,
    clientSecret,
    mailbox,
    authMode = 'application',
    accessTokenProvider = null,
    capabilities,
    fetchImpl = fetch,
    requestTimeoutMs = 15_000,
    organizationId = null,
    connectionId = null,
    mailboxIdentityId = null,
    connectionGeneration = null,
    isCurrentConnection = () => true,
  }) {
    Object.assign(this, {
      tenantId,
      clientId,
      clientSecret,
      mailbox,
      authMode,
      accessTokenProvider,
      fetchImpl,
      requestTimeoutMs,
      organizationId,
      connectionId,
      mailboxIdentityId,
      connectionGeneration,
      isCurrentConnection,
    });
    this.capabilities = normalizedCapabilities(capabilities);
    this.provider = 'outlook';
    this.mailboxAddress = mailbox;
    this.sourceKey = `outlook:${mailbox.toLocaleLowerCase()}`;
    this.cursorKey = `mail_cursor:graph:${mailbox.toLocaleLowerCase()}`;
    this.reconciliationKey = `mail_reconciliation:outlook:inbox-membership:v1:${mailbox.toLocaleLowerCase()}`;
  }

  async accessToken({ signal } = {}) {
    if (this.accessTokenProvider) {
      const provided = await this.accessTokenProvider({ signal });
      if (typeof provided !== 'string' || !provided) {
        throw new Error('Outlook authentication returned no access token');
      }
      return provided;
    }
    const form = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });
    const response = await this.fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`,
      { method: 'POST', body: form, signal: requestSignal(this.requestTimeoutMs, signal) }
    );
    if (!response.ok) {
      throw new Error(`Outlook authentication failed (${response.status})`);
    }

    const token = (await response.json()).access_token;
    if (!token) throw new Error('Outlook authentication returned no access token');
    return token;
  }

  async fetchChanges(cursor) {
    const token = await this.accessToken();
    let url = graphApiUrl(
      cursor || `https://graph.microsoft.com${this.graphMailboxPath()}/mailFolders/inbox/messages/delta?$select=${GRAPH_MESSAGE_FIELDS.join(',')}`,
    );
    if (!cursor) url.searchParams.set('$top', String(MAX_DELTA_ACTIONABLE_MESSAGES));
    let nextCursor = cursor;
    let receivedDeltaLink = false;
    let messagesById = new Map();
    const removedProviderIds = new Set();
    const visitedPages = new Set();
    let pageCount = 0;
    let reconciliationRequired = false;

    while (url) {
      const pageUrl = url.toString();
      if (visitedPages.has(pageUrl)) {
        throw new Error('Outlook sync returned a repeated pagination link');
      }
      visitedPages.add(pageUrl);
      pageCount += 1;
      if (pageCount > MAX_DELTA_PAGES) {
        throw new Error('Outlook sync exceeded the bounded pagination limit');
      }
      const response = await this.fetchImpl(url, {
        headers: {
          authorization: `Bearer ${token}`,
          prefer: 'IdType="ImmutableId"'
        },
        signal: AbortSignal.timeout(this.requestTimeoutMs)
      });
      if (!response.ok) throw new Error(`Outlook sync failed (${response.status})`);

      const page = await response.json();
      if (!Array.isArray(page.value)) throw new Error('Outlook sync returned an invalid page');
      for (const item of page.value) {
        const providerId = typeof item?.id === 'string' ? item.id.trim() : '';
        if (!providerId) continue;
        if (item['@removed']) {
          messagesById.delete(providerId);
          removedProviderIds.add(providerId);
          if (removedProviderIds.size > MAX_DELTA_REMOVALS) {
            removedProviderIds.clear();
            reconciliationRequired = true;
          }
          continue;
        }

        messagesById.set(providerId, mapGraphMessage({ ...item, id: providerId }, this.mailbox));
        removedProviderIds.delete(providerId);
      }
      if (messagesById.size > MAX_DELTA_ACTIONABLE_MESSAGES * 2) {
        messagesById = new Map(newestGraphMessages(messagesById.values()).map(message => (
          [message.providerId, message]
        )));
      }
      if (page['@odata.deltaLink']) {
        nextCursor = graphApiUrl(page['@odata.deltaLink']).toString();
        receivedDeltaLink = true;
      }
      url = page['@odata.nextLink'] ? graphApiUrl(page['@odata.nextLink']) : null;
    }

    if (!receivedDeltaLink) {
      throw new Error('Outlook sync completed without a new delta cursor');
    }
    return {
      messages: newestGraphMessages(messagesById.values()),
      removedProviderIds: [...removedProviderIds],
      nextCursor,
      ...(reconciliationRequired ? { reconciliationRequired: true } : {}),
    };
  }

  async sendAssignmentDigest({ rawMime, signal } = {}) {
    if (!this.capabilities.send) {
      throw providerSendError(
        'GRAPH_SEND_NOT_AUTHORIZED',
        'Reconnect Outlook and approve Mail.Send before forwarding assignments.',
        { status: 403 },
      );
    }
    const bytes = rawMimeBytes(rawMime);
    const token = await this.accessToken({ signal });
    const path = this.authMode === 'delegated'
      ? '/v1.0/me/sendMail'
      : `/v1.0/users/${encodeURIComponent(this.mailbox)}/sendMail`;
    let response;
    try {
      response = await this.fetchImpl(`https://graph.microsoft.com${path}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'text/plain',
        },
        body: bytes.toString('base64'),
        signal: requestSignal(this.requestTimeoutMs, signal),
      });
    } catch {
      throw providerSendError(
        'GRAPH_SEND_UNCERTAIN',
        'Outlook did not confirm whether the assignment message was accepted.',
        { ambiguous: true },
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw providerSendError(
        response.status === 401 ? 'GRAPH_SEND_UNAUTHORIZED' : 'GRAPH_SEND_FORBIDDEN',
        'Outlook rejected the assignment message. Reconnect Outlook and confirm Mail.Send.',
        { status: response.status },
      );
    }
    if (response.status !== 202) {
      throw providerSendError(
        'GRAPH_SEND_INVALID_RESPONSE',
        `Outlook rejected the assignment message (${response.status}).`,
        { retryable: response.status === 429 || response.status >= 500 },
      );
    }
    return { providerMessageId: null };
  }

  graphMailboxPath() {
    return this.authMode === 'delegated'
      ? '/v1.0/me'
      : `/v1.0/users/${encodeURIComponent(this.mailbox)}`;
  }

  async fetchConversation({
    providerMessageId = null,
    nativeConversationId = null,
    deliveryMessageIds = [],
    signal,
  } = {}) {
    if (!Array.isArray(deliveryMessageIds)) {
      throw new TypeError('Outlook conversation delivery Message-IDs must be an array.');
    }
    const token = await this.accessToken({ signal });
    const headers = {
      authorization: `Bearer ${token}`,
      prefer: 'IdType="ImmutableId"',
    };
    let conversationId = normalizedHeaderMetadata(nativeConversationId);
    if (providerMessageId !== null) {
      const messageId = typeof providerMessageId === 'string' ? providerMessageId.trim() : '';
      if (!messageId || messageId.length > 1024 || /[\u0000-\u001f\u007f]/u.test(messageId)) {
        throw new TypeError('Outlook conversation requires a valid provider message.');
      }
      const anchorUrl = new URL(
        `https://graph.microsoft.com${this.graphMailboxPath()}/messages/${encodeURIComponent(messageId)}`,
      );
      anchorUrl.searchParams.set('$select', 'id,conversationId');
      const response = await this.fetchImpl(anchorUrl, {
        headers,
        signal: requestSignal(this.requestTimeoutMs, signal),
      });
      if (response.status === 404) {
        throw providerSendError(
          'GRAPH_CONVERSATION_NOT_FOUND',
          'The Outlook conversation is unavailable.',
          { status: 404 },
        );
      }
      if (!response.ok) {
        throw providerSendError(
          'GRAPH_CONVERSATION_FAILED',
          `Outlook could not load the conversation (${response.status}).`,
          { retryable: response.status === 429 || response.status >= 500 },
        );
      }
      let anchor;
      try {
        anchor = await response.json();
      } catch {
        throw providerSendError('GRAPH_CONVERSATION_FAILED', 'Outlook returned invalid conversation metadata.');
      }
      const resolved = normalizedHeaderMetadata(anchor?.conversationId);
      if (anchor?.id !== messageId || !resolved) {
        throw providerSendError('GRAPH_CONVERSATION_FAILED', 'Outlook returned invalid conversation metadata.');
      }
      if (conversationId && conversationId !== resolved) {
        throw providerSendError(
          'GRAPH_CONVERSATION_MISMATCH',
          'The Outlook conversation identity changed.',
          { status: 409 },
        );
      }
      conversationId = resolved;
    }
    if (!conversationId) {
      throw new TypeError('Outlook conversation requires a native conversation identity.');
    }

    const deliveryIds = new Set(deliveryMessageIds
      .map(normalizedHeaderMetadata)
      .filter(Boolean));
    const selectedFields = [
      'id',
      'conversationId',
      'internetMessageId',
      'from',
      'receivedDateTime',
      'sentDateTime',
      'bodyPreview',
      'webLink',
      'isDraft',
    ].join(',');
    const escapedConversationId = conversationId.replaceAll("'", "''");

    const fetchFolder = async ({ folder, direction, timestampField }) => {
      const initial = new URL(
        `https://graph.microsoft.com${this.graphMailboxPath()}/mailFolders/${folder}/messages`,
      );
      initial.searchParams.set('$select', selectedFields);
      initial.searchParams.set(
        '$filter',
        `${timestampField} ge 1900-01-01T00:00:00Z and conversationId eq '${escapedConversationId}'`,
      );
      initial.searchParams.set('$orderby', `${timestampField} desc`);
      initial.searchParams.set('$top', String(MAX_CONVERSATION_MESSAGES));
      const messages = [];
      let url = initial;
      let pageCount = 0;
      let truncated = false;
      while (url && pageCount < MAX_CONVERSATION_PAGES_PER_FOLDER) {
        const response = await this.fetchImpl(graphApiUrl(url), {
          headers,
          signal: requestSignal(this.requestTimeoutMs, signal),
        });
        if (!response.ok) {
          throw providerSendError(
            'GRAPH_CONVERSATION_FAILED',
            `Outlook could not load the conversation (${response.status}).`,
            { retryable: response.status === 429 || response.status >= 500 },
          );
        }
        let page;
        try {
          page = await response.json();
        } catch {
          throw providerSendError('GRAPH_CONVERSATION_FAILED', 'Outlook returned invalid conversation history.');
        }
        if (!Array.isArray(page?.value)) {
          throw providerSendError('GRAPH_CONVERSATION_FAILED', 'Outlook returned invalid conversation history.');
        }
        for (const item of page.value) {
          const providerId = typeof item?.id === 'string' ? item.id.trim() : '';
          const itemConversationId = normalizedHeaderMetadata(item?.conversationId);
          const occurredAt = typeof item?.[timestampField] === 'string'
            ? new Date(item[timestampField])
            : new Date(Number.NaN);
          if (
            !providerId
            || itemConversationId !== conversationId
            || !Number.isFinite(occurredAt.getTime())
          ) {
            throw providerSendError('GRAPH_CONVERSATION_FAILED', 'Outlook returned invalid conversation history.');
          }
          if (item.isDraft === true) continue;
          const internetMessageId = normalizedHeaderMetadata(item.internetMessageId);
          if (internetMessageId && deliveryIds.has(internetMessageId)) continue;
          messages.push({
            providerMessageId: providerId,
            direction,
            sender: {
              name: normalizedHeaderMetadata(item.from?.emailAddress?.name) || 'Unknown sender',
              address: normalizedHeaderMetadata(item.from?.emailAddress?.address) || '',
            },
            occurredAt: occurredAt.toISOString(),
            preview: normalizeProviderPreview(item.bodyPreview),
            internetMessageId,
            webUrl: safeOutlookWebUrl(item.webLink),
          });
          if (messages.length > MAX_CONVERSATION_MESSAGES) {
            truncated = true;
            break;
          }
        }
        pageCount += 1;
        if (messages.length > MAX_CONVERSATION_MESSAGES) break;
        if (page['@odata.nextLink']) {
          url = graphApiUrl(page['@odata.nextLink']);
        } else {
          url = null;
        }
      }
      if (url) truncated = true;
      return { messages, truncated };
    };

    const [inbox, sent] = await Promise.all([
      fetchFolder({ folder: 'inbox', direction: 'received', timestampField: 'receivedDateTime' }),
      fetchFolder({ folder: 'sentitems', direction: 'sent', timestampField: 'sentDateTime' }),
    ]);
    const byId = new Map();
    for (const message of [...inbox.messages, ...sent.messages]) {
      byId.set(message.providerMessageId, message);
    }
    const messages = [...byId.values()].sort((left, right) => (
      left.occurredAt.localeCompare(right.occurredAt)
      || left.providerMessageId.localeCompare(right.providerMessageId)
    ));
    return {
      messages: messages.slice(-MAX_CONVERSATION_MESSAGES),
      truncated: inbox.truncated || sent.truncated || messages.length > MAX_CONVERSATION_MESSAGES,
    };
  }

  async reconcileInbox(providerIds) {
    if (!Array.isArray(providerIds)) {
      throw new TypeError('Outlook reconciliation requires provider IDs');
    }
    const ids = [...new Set(providerIds.map(providerId => {
      if (
        typeof providerId !== 'string'
        || !providerId.trim()
        || providerId !== providerId.trim()
      ) {
        throw new Error('Outlook reconciliation received an invalid provider ID');
      }
      return providerId;
    }))];
    const presentProviderIds = [];
    const removedProviderIds = [];
    if (!ids.length) return { presentProviderIds, removedProviderIds };
    const token = await this.accessToken();

    for (let offset = 0; offset < ids.length; offset += GRAPH_RECONCILIATION_BATCH_SIZE) {
      const batch = ids.slice(offset, offset + GRAPH_RECONCILIATION_BATCH_SIZE);
      const results = await Promise.all(batch.map(async providerId => {
        const url = `https://graph.microsoft.com${this.graphMailboxPath()}/mailFolders/inbox/messages/${encodeURIComponent(providerId)}?$select=id`;
        const response = await this.fetchImpl(url, {
          headers: {
            authorization: `Bearer ${token}`,
            prefer: 'IdType="ImmutableId"'
          },
          signal: AbortSignal.timeout(this.requestTimeoutMs)
        });
        if (response.status === 404) return { providerId, present: false };
        if (!response.ok) throw new Error(`Outlook reconciliation failed (${response.status})`);

        let message;
        try {
          message = await response.json();
        } catch {
          throw new Error('Outlook reconciliation returned invalid message metadata');
        }
        if (message?.id !== providerId) {
          throw new Error('Outlook reconciliation returned invalid message metadata');
        }
        return { providerId, present: true };
      }));

      for (const result of results) {
        (result.present ? presentProviderIds : removedProviderIds).push(result.providerId);
      }
    }

    return { presentProviderIds, removedProviderIds };
  }
}

export function createMailSource(config) {
  const graph = config?.graph;
  const configured = Boolean(
    graph
    && [graph.tenantId, graph.clientId, graph.clientSecret, graph.mailbox]
      .every(value => typeof value === 'string' && value.trim()),
  );
  return configured ? new GraphMailSource(graph) : new MockMailSource();
}
