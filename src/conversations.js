import { createHash } from 'node:crypto';

const REPLY_PREFIX = /^(?:(?:re|fw|fwd)\s*:\s*)+/i;
const NO_SUBJECT = /^(?:\(no subject\)|no subject)$/i;

export function displayThreadSubject(subject) {
  const compact = String(subject ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(REPLY_PREFIX, '')
    .replace(/\s+/g, ' ')
    .trim();
  return !compact || NO_SUBJECT.test(compact) ? '(No subject)' : compact;
}

export function normalizeThreadSubject(subject) {
  const displaySubject = displayThreadSubject(subject);
  return displaySubject === '(No subject)' ? '' : displaySubject.toLocaleLowerCase();
}

export function deriveThreadKey({
  provider = 'outlook',
  mailboxAddress = '',
  subject,
  providerId,
}) {
  const normalizedSubject = normalizeThreadSubject(subject);
  const scope = [
    String(provider || 'outlook').trim().toLocaleLowerCase(),
    String(mailboxAddress || '').trim().toLocaleLowerCase(),
  ];
  const identity = normalizedSubject
    ? ['subject', normalizedSubject]
    : ['message', String(providerId ?? '').trim()];
  const digest = createHash('sha256')
    .update(JSON.stringify([...scope, ...identity]))
    .digest('hex');
  return `thread:${digest}`;
}
