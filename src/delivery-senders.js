const SAFE_ERROR_SUMMARIES = Object.freeze({
  send_permission_required: 'The connected mailbox does not grant permission to send.',
  sender_unavailable: 'No active mailbox sender is available.',
  provider_unauthorized: 'The mailbox authorization is no longer valid.',
  provider_forbidden: 'The mailbox provider rejected the requested operation.',
  provider_rate_limited: 'The mailbox provider temporarily rate-limited delivery.',
  provider_busy: 'The mailbox provider is temporarily unavailable.',
  provider_rejected: 'The mailbox provider rejected the delivery request.',
  delivery_timeout: 'The provider response was not received before the request timed out.',
  delivery_outcome_unknown: 'The provider response was not received; delivery may have been accepted.',
  delivery_failed: 'The delivery request failed.',
});

function safeCode(value, fallback = 'delivery_failed') {
  const normalized = String(value ?? '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return normalized || fallback;
}

function redactSummary(value) {
  return String(value ?? '')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\b(?:bearer|token|secret|password|authorization)\s*[:=]?\s*[^\s,;]+/gi, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/https?:\/\/\S+/gi, '[redacted URL]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export class DeliverySendError extends Error {
  constructor(safeMessage, {
    code = 'delivery_failed',
    retryable = false,
    ambiguous = false,
    cause,
  } = {}) {
    super(redactSummary(safeMessage) || SAFE_ERROR_SUMMARIES.delivery_failed, { cause });
    this.name = 'DeliverySendError';
    this.code = safeCode(code);
    this.retryable = Boolean(retryable);
    this.ambiguous = Boolean(ambiguous);
    this.safeMessage = this.message;
  }
}

export function sanitizeDeliveryError(error, { requestStarted = true } = {}) {
  if (error instanceof DeliverySendError) {
    const code = safeCode(error.code);
    return {
      code,
      retryable: Boolean(error.retryable),
      ambiguous: Boolean(error.ambiguous),
      summary: redactSummary(error.safeMessage)
        || SAFE_ERROR_SUMMARIES[code]
        || SAFE_ERROR_SUMMARIES.delivery_failed,
    };
  }

  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  if (Number.isInteger(status) && status >= 400) {
    if (status === 401) {
      return {
        code: 'provider_unauthorized', retryable: false, ambiguous: false,
        summary: SAFE_ERROR_SUMMARIES.provider_unauthorized,
      };
    }
    if (status === 403) {
      return {
        code: 'provider_forbidden', retryable: false, ambiguous: false,
        summary: SAFE_ERROR_SUMMARIES.provider_forbidden,
      };
    }
    if (status === 408 || status === 429 || status >= 500) {
      const code = status === 429 ? 'provider_rate_limited' : 'provider_busy';
      return {
        code, retryable: true, ambiguous: false,
        summary: SAFE_ERROR_SUMMARIES[code],
      };
    }
    return {
      code: 'provider_rejected', retryable: false, ambiguous: false,
      summary: SAFE_ERROR_SUMMARIES.provider_rejected,
    };
  }

  if (typeof error?.ambiguous === 'boolean' || typeof error?.retryable === 'boolean') {
    const ambiguous = Boolean(error.ambiguous);
    const code = safeCode(
      error.code,
      ambiguous ? 'delivery_outcome_unknown' : 'delivery_failed',
    );
    return {
      code,
      retryable: Boolean(error.retryable),
      ambiguous,
      summary: redactSummary(error.safeMessage)
        || SAFE_ERROR_SUMMARIES[code]
        || (ambiguous
          ? SAFE_ERROR_SUMMARIES.delivery_outcome_unknown
          : SAFE_ERROR_SUMMARIES.delivery_failed),
    };
  }

  if (requestStarted) {
    return {
      code: 'delivery_outcome_unknown',
      retryable: false,
      ambiguous: true,
      summary: SAFE_ERROR_SUMMARIES.delivery_outcome_unknown,
    };
  }
  return {
    code: 'delivery_failed',
    retryable: false,
    ambiguous: false,
    summary: SAFE_ERROR_SUMMARIES.delivery_failed,
  };
}

function canSend(provider) {
  const capabilities = provider?.capabilities;
  if (capabilities == null) return true;
  if (capabilities instanceof Set) return capabilities.has('send');
  if (Array.isArray(capabilities)) return capabilities.includes('send');
  return capabilities.send === true;
}

export function createProviderDeliverySender(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new TypeError('A provider adapter is required.');
  }

  return {
    capabilities: Object.freeze({ send: canSend(provider) }),

    async send({ rawMime, signal }) {
      if (!canSend(provider)) {
        throw new DeliverySendError(SAFE_ERROR_SUMMARIES.send_permission_required, {
          code: 'send_permission_required',
          retryable: false,
          ambiguous: false,
        });
      }
      if (typeof provider.sendAssignmentDigest !== 'function') {
        throw new DeliverySendError(SAFE_ERROR_SUMMARIES.sender_unavailable, {
          code: 'sender_unavailable',
          retryable: false,
          ambiguous: false,
        });
      }
      try {
        const result = await provider.sendAssignmentDigest({ rawMime, signal });
        return {
          accepted: true,
          providerMessageId: result?.providerMessageId ?? null,
        };
      } catch (error) {
        const safe = sanitizeDeliveryError(error, { requestStarted: true });
        throw new DeliverySendError(safe.summary, { ...safe, cause: error });
      }
    },

    ...(typeof provider.reconcileMessageId === 'function' ? {
      async reconcile({ messageId, signal }) {
        return provider.reconcileMessageId({ internetMessageId: messageId, signal });
      },
    } : {}),
  };
}

export function normalizeDeliverySender(sender) {
  if (sender && typeof sender.send === 'function') return sender;
  return createProviderDeliverySender(sender);
}

export const DELIVERY_ERROR_SUMMARIES = SAFE_ERROR_SUMMARIES;
