import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SOUND_STORAGE_KEY,
  createNotificationAudio,
} from '../public/notification-audio.js';

function fakeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    emit(type) { listeners.get(type)?.(); },
  };
}

function throwingStorage() {
  return {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
}

function audioHarness() {
  const storageValues = new Map();
  const parameter = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const context = {
    state: 'suspended',
    currentTime: 10,
    destination: {},
    oscillators: [],
    async resume() { this.state = 'running'; },
    createOscillator() {
      const oscillator = {
        frequency: parameter(),
        connect() {},
        start() {},
        stop() {},
        type: '',
      };
      this.oscillators.push(oscillator);
      return oscillator;
    },
    createGain() { return { gain: parameter(), connect() {} }; },
    async close() { this.state = 'closed'; },
  };
  class FakeAudioContext { constructor() { return context; } }
  return {
    context,
    storageValues,
    options: {
      storage: {
        getItem: key => storageValues.get(key) ?? null,
        setItem: (key, value) => storageValues.set(key, value),
      },
      AudioContextClass: FakeAudioContext,
      eventTarget: fakeEventTarget(),
    },
  };
}

test('sounds default enabled, persist mute, and do not play before arming', async () => {
  const harness = audioHarness();
  const audio = createNotificationAudio(harness.options);
  assert.equal(audio.enabled(), true);
  assert.equal(audio.playNotification(), false);

  await audio.arm();
  assert.equal(audio.playNotification(), true);
  assert.equal(harness.context.oscillators.length, 2);

  audio.setEnabled(false);
  assert.equal(harness.storageValues.get(SOUND_STORAGE_KEY), 'muted');
  assert.equal(audio.playCompletion(), false);
});

test('completion and read chimes use three and two tones after arming', async () => {
  const harness = audioHarness();
  const audio = createNotificationAudio(harness.options);
  await audio.arm();
  audio.playCompletion();
  audio.playRead();
  assert.equal(harness.context.oscillators.length, 5);
});

test('unsupported Web Audio and storage failures are silent no-ops', async () => {
  const audio = createNotificationAudio({
    storage: throwingStorage(),
    AudioContextClass: null,
    eventTarget: fakeEventTarget(),
  });
  await assert.doesNotReject(audio.arm());
  assert.equal(audio.playRead(), false);
  assert.doesNotThrow(() => audio.toggle());
});
