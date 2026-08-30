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
  webUrl: message.outlookUrl
}));

function mapGraphMessage(item, mailbox) {
  return {
    providerId: `outlook:${mailbox.toLocaleLowerCase()}:${item.id}`,
    provider: 'outlook',
    mailboxAddress: mailbox,
    subject: item.subject || '(No subject)',
    senderName: item.from?.emailAddress?.name || 'Unknown sender',
    senderAddress: item.from?.emailAddress?.address || '',
    preview: item.bodyPreview || '',
    receivedAt: item.receivedDateTime,
    webUrl: item.webLink || null,
    outlookUrl: item.webLink || null
  };
}

export class MockMailSource {
  provider = 'demo';
  mailboxAddress = null;
  sourceKey = 'demo';
  cursorKey = 'mail_cursor:demo';

  async fetchChanges(cursor) {
    return cursor
      ? { messages: [], nextCursor: cursor }
      : { messages: demoMessages, nextCursor: 'mock-v1' };
  }
}

export class GraphMailSource {
  constructor({ tenantId, clientId, clientSecret, mailbox, accessTokenProvider = null, fetchImpl = fetch, requestTimeoutMs = 15_000 }) {
    Object.assign(this, { tenantId, clientId, clientSecret, mailbox, accessTokenProvider, fetchImpl, requestTimeoutMs });
    this.provider = 'outlook';
    this.mailboxAddress = mailbox;
    this.sourceKey = `outlook:${mailbox.toLocaleLowerCase()}`;
    this.cursorKey = `mail_cursor:graph:${mailbox.toLocaleLowerCase()}`;
  }

  async accessToken() {
    if (this.accessTokenProvider) return this.accessTokenProvider();
    const form = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });
    const response = await this.fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(this.requestTimeoutMs) }
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
    let url = cursor || `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(this.mailbox)}/mailFolders/inbox/messages/delta?$select=id,subject,from,receivedDateTime,bodyPreview,webLink`;
    let nextCursor = cursor;
    let receivedDeltaLink = false;
    const messages = [];

    while (url) {
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
      messages.push(
        ...page.value
          .filter(item => !item['@removed'])
          .map(item => mapGraphMessage(item, this.mailbox))
      );
      if (page['@odata.deltaLink']) {
        nextCursor = page['@odata.deltaLink'];
        receivedDeltaLink = true;
      }
      url = page['@odata.nextLink'] || null;
    }

    if (!receivedDeltaLink) {
      throw new Error('Outlook sync completed without a new delta cursor');
    }
    return { messages, nextCursor };
  }
}

export function createMailSource(config) {
  return ['graph', 'mixed'].includes(config.mode)
    ? new GraphMailSource(config.graph)
    : new MockMailSource();
}
