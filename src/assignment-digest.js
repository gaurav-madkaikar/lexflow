import { randomBytes } from 'node:crypto';

import { normalizeMessagePreview as normalizePreviewResult } from './message-preview.js';

const PREVIEW_LIMIT = 100;
const PREVIEW_CHARACTER_LIMIT = 320;
const HEADER_CHARACTER_LIMIT = 180;

function truncateCharacters(value, limit) {
  const characters = Array.from(value);
  return characters.length <= limit ? value : characters.slice(0, limit).join('');
}

function singleHeaderLine(value, fallback = '') {
  const firstLine = String(value ?? '').split(/\r\n|\r|\n/, 1)[0];
  const normalized = firstLine
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateCharacters(normalized || fallback, HEADER_CHARACTER_LIMIT);
}

function mailboxAddress(value, fieldName) {
  const normalized = singleHeaderLine(value).toLocaleLowerCase('en-US');
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(normalized)) {
    throw new TypeError(`${fieldName} must be a valid email address.`);
  }
  return normalized;
}

function quotedDisplayName(value) {
  return `"${singleHeaderLine(value, 'LexFlow').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function trustedOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('A valid trusted application origin is required.');
  }
  const loopback = ['127.0.0.1', '::1', 'localhost'].includes(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || (url.protocol !== 'https:' && !loopback)) {
    throw new TypeError('The trusted application origin must use HTTPS except on loopback.');
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('The trusted application URL must contain only an origin.');
  }
  return url.origin;
}

function timestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('A valid digest timestamp is required.');
  return date;
}

function previewTimestamp(value) {
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : Number.MIN_SAFE_INTEGER;
}

export function normalizeMessagePreview(value, limit = PREVIEW_CHARACTER_LIMIT) {
  return normalizePreviewResult(value, limit).preview;
}

export function createDigestToken(random = randomBytes) {
  const bytes = random(16);
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError('Digest token generator must return 16 random bytes.');
  }
  if (bytes.byteLength !== 16) {
    throw new TypeError('Digest tokens require exactly 128 bits of randomness.');
  }
  return Buffer.from(bytes).toString('hex');
}

export function assignmentMessageId({ digestToken, trustedAppOrigin }) {
  const token = String(digestToken ?? '').toLocaleLowerCase('en-US');
  if (!/^[a-f0-9]{32}$/.test(token)) {
    throw new TypeError('Digest token must be a 128-bit hexadecimal value.');
  }
  const origin = new URL(trustedOrigin(trustedAppOrigin));
  return `<lf-${token}@${origin.hostname.toLocaleLowerCase('en-US')}>`;
}

export function buildAssignmentDigest({
  digestToken,
  trustedAppOrigin,
  createdAt,
  organizationName,
  mailboxAddress: sourceMailbox,
  recipientName,
  recipientEmail,
  conversationId,
  conversationPublicId = null,
  subject,
  previews = [],
}) {
  const origin = trustedOrigin(trustedAppOrigin);
  const messageId = assignmentMessageId({ digestToken, trustedAppOrigin: origin });
  const created = timestamp(createdAt);
  const fromAddress = mailboxAddress(sourceMailbox, 'Mailbox address');
  const toAddress = mailboxAddress(recipientEmail, 'Recipient email');
  const organization = singleHeaderLine(organizationName, 'Organization');
  const recipient = singleHeaderLine(recipientName, toAddress);
  const safeSubject = singleHeaderLine(subject, '(No subject)');
  const publicId = String(conversationPublicId ?? '').trim();
  const legacyId = String(conversationId ?? '');
  if (publicId && !/^cv_[A-Za-z0-9_-]{12,128}$/u.test(publicId)) {
    throw new TypeError('Conversation public ID is invalid.');
  }
  if (!publicId && (!/^\d+$/.test(legacyId) || Number(legacyId) < 1)) {
    throw new TypeError('Conversation ID must be a positive integer.');
  }
  const routeId = publicId || legacyId;
  const secureRoute = new URL(`/?conversation=${encodeURIComponent(routeId)}`, origin).toString();

  const normalizedPreviews = previews
    .map((preview, index) => ({
      index,
      receivedAt: timestamp(preview.receivedAt).toISOString(),
      senderName: singleHeaderLine(preview.senderName, 'Unknown sender'),
      senderAddress: singleHeaderLine(preview.senderAddress, 'unknown'),
      preview: normalizeMessagePreview(preview.preview),
    }))
    .sort((left, right) => (
      previewTimestamp(left.receivedAt) - previewTimestamp(right.receivedAt)
      || left.index - right.index
    ))
    .slice(-PREVIEW_LIMIT)
    .map(({ index: _index, ...preview }) => preview);

  const bodyLines = [
    'A conversation was assigned to you in LexFlow.',
    '',
    `Organization: ${organization}`,
    `Source mailbox: ${fromAddress}`,
    `Subject: ${safeSubject}`,
    `Open securely in LexFlow: ${secureRoute}`,
    '',
    'Conversation preview (oldest to newest):',
  ];
  if (normalizedPreviews.length === 0) {
    bodyLines.push('(No retained message previews.)');
  } else {
    normalizedPreviews.forEach((preview, index) => {
      bodyLines.push(
        '',
        `${index + 1}. ${preview.receivedAt} — ${preview.senderName} <${preview.senderAddress}>`,
        preview.preview || '(No preview text.)',
      );
    });
  }
  bodyLines.push(
    '',
    'Mailbox search:',
    `Search Gmail or Outlook for Message-ID ${messageId} or subject "${safeSubject}".`,
    '',
    'This is an automated LexFlow assignment notice. Use LexFlow to update its status.',
  );

  const rawMime = [
    `From: ${quotedDisplayName(`LexFlow via ${organization}`)} <${fromAddress}>`,
    `To: ${quotedDisplayName(recipient)} <${toAddress}>`,
    `Subject: ${singleHeaderLine(`LexFlow assignment: ${safeSubject}`)}`,
    `Date: ${created.toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'Auto-Submitted: auto-generated',
    'X-Auto-Response-Suppress: All',
    '',
    ...bodyLines,
    '',
  ].join('\r\n');

  return {
    rawMime,
    messageId,
    secureRoute,
    previews: normalizedPreviews,
  };
}

export const ASSIGNMENT_DIGEST_LIMITS = Object.freeze({
  previewCount: PREVIEW_LIMIT,
  previewCharacters: PREVIEW_CHARACTER_LIMIT,
});
