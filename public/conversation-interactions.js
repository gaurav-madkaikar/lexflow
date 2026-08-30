export function conversationClickIntent(target) {
  const explicit = target.closest('[data-conversation-toggle]');
  if (explicit) return { type: 'toggle', conversationId: Number(explicit.dataset.conversationToggle) };
  const child = target.closest('.conversation-messages [data-email-id]');
  if (child) return { type: 'open', emailId: Number(child.dataset.emailId) };
  const parent = target.closest('[data-conversation-parent]');
  if (parent) return { type: 'toggle', conversationId: Number(parent.dataset.conversationParent) };
  const row = target.closest('[data-email-id]');
  return row ? { type: 'open', emailId: Number(row.dataset.emailId) } : null;
}
