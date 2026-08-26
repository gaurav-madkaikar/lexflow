import assert from 'node:assert/strict';
import test from 'node:test';

import { createConversationCache } from '../public/conversation-cache.js';

test('conversation cache coalesces inline and drawer loads for one canonical version', async () => {
  let calls = 0;
  let resolveFetch;
  const response = new Promise(resolve => { resolveFetch = resolve; });
  const cache = createConversationCache({
    fetchConversation: async () => {
      calls += 1;
      return response;
    },
  });
  const anchor = { id: 7, conversation: { publicId: 'cv_one', version: 3 } };

  const inline = cache.load(anchor);
  const drawer = cache.load(anchor);
  await Promise.resolve();
  assert.equal(calls, 1);
  resolveFetch({ conversation: { messages: [{ id: 'm1' }] } });
  assert.deepEqual(await inline, await drawer);
});

test('conversation cache invalidates immediately when bootstrap version changes', async () => {
  let calls = 0;
  let currentTime = 100;
  const cache = createConversationCache({
    now: () => currentTime,
    ttlMs: 30_000,
    fetchConversation: async anchor => ({ version: anchor.conversation.version, calls: ++calls }),
  });
  const first = { id: 7, conversation: { publicId: 'cv_one', version: 3 } };
  const changed = { id: 7, conversation: { publicId: 'cv_one', version: 4 } };

  assert.equal((await cache.load(first)).calls, 1);
  currentTime += 1000;
  assert.equal((await cache.load(first)).calls, 1);
  cache.invalidateVersion(changed);
  assert.equal(cache.entryFor(changed), null);
  assert.equal((await cache.load(changed)).calls, 2);
});

test('conversation cache retries failures and supports an explicit refresh', async () => {
  let calls = 0;
  const cache = createConversationCache({
    fetchConversation: async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporary');
      return { calls };
    },
  });
  const anchor = { id: 4, threadKey: 'fallback' };

  await assert.rejects(cache.load(anchor), /temporary/u);
  assert.equal((await cache.load(anchor)).calls, 2);
  assert.equal((await cache.load(anchor, { force: true })).calls, 3);
});
