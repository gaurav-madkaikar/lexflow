import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationClickIntent } from '../public/conversation-interactions.js';

function targetFor({ toggle, complete, parent, childEmail, email } = {}) {
  return { closest(selector) {
    if (selector === '[data-conversation-toggle]' && toggle) return { dataset: { conversationToggle: String(toggle) } };
    if (selector === '[data-complete-thread]' && complete) return { dataset: { completeThread: String(complete) } };
    if (selector === '.conversation-messages [data-email-id]' && childEmail) return { dataset: { emailId: String(childEmail) } };
    if (selector === '[data-conversation-parent]' && parent) return { dataset: { conversationParent: String(parent) } };
    if (selector === '[data-email-id]' && (email || childEmail)) return { dataset: { emailId: String(email || childEmail) } };
    return null;
  } };
}

test('conversation click intent gives toggles precedence over opening messages', () => {
  assert.deepEqual(conversationClickIntent(targetFor({ toggle: 42, parent: 42, email: 9 })), { type: 'toggle', conversationId: 42 });
  assert.deepEqual(conversationClickIntent(targetFor({ complete: 12, parent: 42, email: 9 })), { type: 'complete-thread', emailId: 12 });
  assert.deepEqual(conversationClickIntent(targetFor({ parent: 42, email: 9 })), { type: 'toggle', conversationId: 42 });
  assert.deepEqual(conversationClickIntent(targetFor({ childEmail: 10 })), { type: 'open', emailId: 10 });
  assert.deepEqual(conversationClickIntent(targetFor({ email: 11 })), { type: 'open', emailId: 11 });
});
