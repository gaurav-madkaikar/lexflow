import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_RULE_PRIORITY,
  RULE_PRIORITIES,
  isRulePriority,
  rulePriorityLabel,
} from '../public/rule-priorities.js';
import { matchRule } from '../src/workflows.js';

test('rule priorities expose the four canonical options', () => {
  assert.deepEqual(RULE_PRIORITIES, [
    { value: 40, label: 'Low' },
    { value: 30, label: 'Medium' },
    { value: 20, label: 'High' },
    { value: 10, label: 'Critical' },
  ]);
  assert.equal(DEFAULT_RULE_PRIORITY, 30);
  assert.deepEqual([10, 20, 30, 40].map(isRulePriority), [true, true, true, true]);
  assert.equal(isRulePriority(25), false);
  assert.equal(rulePriorityLabel(10), 'Critical');
  assert.equal(rulePriorityLabel(20), 'High');
  assert.equal(rulePriorityLabel(30), 'Medium');
  assert.equal(rulePriorityLabel(40), 'Low');
});

test('matching evaluates Critical before High, Medium, and Low', () => {
  const message = {
    subject: 'Customer escalation',
    preview: 'urgent review required',
    senderName: 'Customer',
    senderAddress: 'customer@example.test',
  };
  const rule = matchRule(message, [
    { id: 1, enabled: true, priority: 40, keywords: 'review', sender_filter: '' },
    { id: 2, enabled: true, priority: 30, keywords: 'review', sender_filter: '' },
    { id: 3, enabled: true, priority: 20, keywords: 'review', sender_filter: '' },
    { id: 4, enabled: true, priority: 10, keywords: 'review', sender_filter: '' },
  ]);
  assert.equal(rule.id, 4);
});

test('matching requires an exact conversation attachment state', () => {
  const message = {
    subject: 'Customer escalation', preview: 'review required',
    senderName: 'Customer', senderAddress: 'customer@example.test',
  };
  const base = { id: 1, enabled: true, priority: 10, keywords: 'review', sender_filter: '' };
  assert.equal(matchRule({ ...message, hasAttachments: true }, [{ ...base, has_attachments: 0 }]), null);
  assert.equal(matchRule({ ...message, hasAttachments: false }, [{ ...base, has_attachments: 1 }]), null);
  assert.equal(matchRule({ ...message, hasAttachments: true }, [{ ...base, has_attachments: 1 }])?.id, 1);
});
