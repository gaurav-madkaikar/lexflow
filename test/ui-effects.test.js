import assert from 'node:assert/strict';
import test from 'node:test';

import { createUiEffects } from '../public/ui-effects.js';

function effectsHarness({ reduced = false } = {}) {
  const animations = [];
  return {
    animations,
    options: {
      animate(targets, options) { animations.push({ targets, options }); },
      stagger(delay) { return `stagger:${delay}`; },
      reducedMotion: { matches: reduced },
      requestFrame(callback) { callback(); },
    },
  };
}

test('unchanged signatures do not replay list or metric animation', () => {
  const harness = effectsHarness();
  const effects = createUiEffects(harness.options);
  effects.emailList([{}, {}], '10:assigned|11:assigned');
  effects.emailList([{}, {}], '10:assigned|11:assigned');
  effects.metrics([{}], 'open:2|complete:1');
  effects.metrics([{}], 'open:2|complete:1');
  assert.equal(harness.animations.length, 2);
});

test('reduced motion leaves content visible without calling Anime.js', () => {
  const harness = effectsHarness({ reduced: true });
  const targets = [{ style: { opacity: '0', transform: 'translateY(8px)' } }];
  const effects = createUiEffects(harness.options);
  effects.workspace(targets, 'overview');
  assert.equal(harness.animations.length, 0);
  assert.equal(targets[0].style.opacity, '');
  assert.equal(targets[0].style.transform, '');
});

test('reset allows the login sequence to run on a later signed-out session', () => {
  const harness = effectsHarness();
  const effects = createUiEffects(harness.options);
  effects.login([{}]);
  effects.login([{}]);
  effects.reset();
  effects.login([{}]);
  assert.equal(harness.animations.length, 2);
});

test('pointer spotlight ignores touch and updates fine pointer coordinates', () => {
  const harness = effectsHarness();
  const effects = createUiEffects(harness.options);
  const values = new Map();
  const card = {
    getBoundingClientRect: () => ({ left: 20, top: 30 }),
    style: { setProperty: (key, value) => values.set(key, value) },
  };
  assert.equal(effects.pointerSpotlight(card, { pointerType: 'touch', clientX: 50, clientY: 70 }), false);
  assert.equal(effects.pointerSpotlight(card, { pointerType: 'mouse', clientX: 50, clientY: 70 }), true);
  assert.equal(values.get('--spotlight-x'), '30px');
  assert.equal(values.get('--spotlight-y'), '40px');
});
