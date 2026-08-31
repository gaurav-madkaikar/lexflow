import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THEME_STORAGE_KEY,
  createThemeController,
  resolveTheme,
} from '../public/theme.js';

function themeHarness({ prefersDark = false, storageThrows = false } = {}) {
  const storageValues = new Map();
  const listeners = new Set();
  const classes = new Set();
  const root = {
    dataset: {},
    classList: {
      toggle(name, force) { force ? classes.add(name) : classes.delete(name); },
      has(name) { return classes.has(name); },
    },
  };
  const control = { pressed: '', label: '', ariaLabel: '' };
  const themeColor = { content: '', setContent(value) { this.content = value; } };
  const mediaQuery = {
    matches: prefersDark,
    addEventListener(type, listener) { if (type === 'change') listeners.add(listener); },
    removeEventListener(type, listener) { if (type === 'change') listeners.delete(listener); },
  };
  const storage = {
    getItem(key) {
      if (storageThrows) throw new Error('blocked');
      return storageValues.get(key) ?? null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error('blocked');
      storageValues.set(key, value);
    },
  };
  return {
    root,
    control,
    themeColor,
    storageValues,
    options: {
      root,
      storage,
      mediaQuery,
      themeColor,
      controls: [{
        setPressed(value) { control.pressed = value; },
        setLabel(value) { control.label = value; },
        setAriaLabel(value) { control.ariaLabel = value; },
      }],
    },
    emitOsChange(matches) {
      mediaQuery.matches = matches;
      for (const listener of listeners) listener({ matches });
    },
  };
}

test('resolveTheme accepts saved choices and otherwise follows the OS', () => {
  assert.equal(resolveTheme({ storedTheme: 'light', prefersDark: true }), 'light');
  assert.equal(resolveTheme({ storedTheme: 'dark', prefersDark: false }), 'dark');
  assert.equal(resolveTheme({ storedTheme: 'invalid', prefersDark: true }), 'dark');
  assert.equal(resolveTheme({ storedTheme: null, prefersDark: false }), 'light');
});

test('explicit theme persists and OS changes apply only without a saved choice', () => {
  const harness = themeHarness({ prefersDark: false });
  const controller = createThemeController(harness.options);
  assert.equal(controller.current(), 'light');

  controller.apply('dark');
  assert.equal(harness.storageValues.get(THEME_STORAGE_KEY), 'dark');
  assert.equal(harness.root.dataset.theme, 'dark');
  assert.equal(harness.root.classList.has('dark'), true);
  assert.equal(harness.control.pressed, 'true');
  assert.equal(harness.control.label, 'Light mode');
  assert.equal(harness.themeColor.content, '#05070b');

  harness.emitOsChange(false);
  assert.equal(controller.current(), 'dark');
});

test('OS changes update an implicit theme', () => {
  const harness = themeHarness({ prefersDark: false });
  const controller = createThemeController(harness.options);
  harness.emitOsChange(true);
  assert.equal(controller.current(), 'dark');
  assert.equal(harness.storageValues.has(THEME_STORAGE_KEY), false);
});

test('storage failures keep a usable in-memory theme', () => {
  const harness = themeHarness({ storageThrows: true });
  const controller = createThemeController(harness.options);
  assert.doesNotThrow(() => controller.toggle());
  assert.equal(controller.current(), 'dark');
});
