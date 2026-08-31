# UI Theme, Sound, and Visual Effects Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the approved visual design, Light/Dark theme, notification sounds, and restrained motion from `itr-email-automation` into `itr-final-app-impl` without changing application behavior.

**Architecture:** Keep the current vanilla ESM frontend and all current API/domain behavior authoritative. Add three dependency-injected presentation modules for theme, sound, and motion, then wire them into existing successful UI events in `public/app.js`; Anime.js is exposed by one immutable same-origin vendor route.

**Tech Stack:** Node.js 22+, Express 5, vanilla JavaScript ESM, semantic HTML/CSS, Anime.js 4.5.x, Web Audio API, Node's built-in test runner.

## Global Constraints

- Use `itr-email-automation` only as a visual reference; do not merge or cherry-pick it.
- The current branch remains authoritative for Entra authentication, roles, tenancy, Graph integration, mailbox processing, conversations, rules, Metrics, notifications, API contracts, and polling.
- Anime.js is the only new dependency.
- Keep Microsoft-only authentication through `/api/auth/outlook/start`; never add email/password fields, demo credentials, or `/api/login`.
- Theme follows `prefers-color-scheme` on first visit and persists only explicit `light` or `dark` choices under `lexflow-theme`.
- Notification sounds default enabled, persist under `lexflow-notification-sounds`, and arm only after a user pointer or keyboard gesture.
- Play notification sound only when unread count increases after baseline; play completion/read sounds only after their existing mutations succeed.
- Honor `prefers-reduced-motion: reduce`; motion and audio failures must never block rendering or application actions.
- Do not modify database, auth, authorization, Graph/Gmail sync, departments, memberships, rules, assignment, completion, reopening, notification, metrics, timezone, polling, or error semantics.
- Production-file allowlist: `package.json`, `package-lock.json`, `src/app.js` only for the Anime.js route, `public/index.html`, `public/styles.css`, `public/app.js`, `public/metrics-charts.js` only for theme-aware chart colors, `public/theme.js`, `public/ui-effects.js`, and `public/notification-audio.js`.
- Focused tests may be added under `test/`; no React, Tailwind, Vite, shadcn, Visx, Motion React, CFO, vacation, or generated `public/ui-assets` code.

---

## File map

- `public/theme.js`: resolve, apply, persist, and synchronize theme state and controls.
- `public/notification-audio.js`: own mute preference, user-gesture arming, and synthesized chimes.
- `public/ui-effects.js`: own reduced-motion checks, signature gating, and Anime.js presentation effects.
- `public/app.js`: retain behavior coordination and invoke presentation modules at existing lifecycle/success points.
- `public/metrics-charts.js`: derive chart grid, tick, and doughnut-border colors from the active theme without changing chart data or interactions.
- `public/index.html`: add pre-paint theme bootstrap, atmospheric login semantics, account popover, and accessible theme/sound controls.
- `public/styles.css`: add shared theme tokens, complete dark coverage, login art direction, account popover, and reduced-motion styles.
- `src/app.js`: expose exactly one immutable Anime.js ESM bundle route.
- `test/theme.test.js`, `test/notification-audio.test.js`, `test/ui-effects.test.js`: unit-test dependency-injected presentation modules.
- `test/app.test.js`, `test/ui-copy.test.js`: protect the vendor route, Microsoft-only login, accessible controls, exclusions, and integration hooks.

### Task 1: Serve the Anime.js ESM bundle

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app.js:58-59,562-565`
- Modify: `test/app.test.js:962-965`

**Interfaces:**
- Consumes: the existing Express `createApp()` and immutable `/vendor/chart.js` route pattern.
- Produces: `GET /vendor/animejs.js`, returning the local `animejs/dist/bundles/anime.esm.js` file with immutable caching.

- [ ] **Step 1: Write the failing vendor-route test**

First extend the test harness response object so route tests can inspect headers without changing application code:

```js
return {
  status: response.status,
  body: text ? (contentType.includes('application/json') ? JSON.parse(text) : text) : null,
  headers: Object.fromEntries(response.headers.entries()),
  cookie: response.headers.get('set-cookie')?.split(';', 1)[0] ?? null,
  location: response.headers.get('location'),
};
```

Then add a standalone test near the existing Chart.js assertion in `test/app.test.js`:

```js
test('serves local vendor bundles with immutable caching', async context => {
  const harness = await createApiHarness(context);
  const animeBundle = await harness.get('/vendor/animejs.js');
  assert.equal(animeBundle.status, 200);
  assert.match(animeBundle.headers['content-type'], /javascript/);
  assert.match(animeBundle.body, /function animate|const animate|export \{/);
  assert.equal(animeBundle.headers['cache-control'], 'public, max-age=31536000, immutable');
});
```

- [ ] **Step 2: Run the focused test and verify the route is missing**

Run: `node --test --test-name-pattern="vendor" test/app.test.js`

Expected: FAIL because `/vendor/animejs.js` returns the application fallback instead of an Anime.js bundle.

- [ ] **Step 3: Add only the approved dependency and route**

Run: `npm install animejs@^4.5.0`

Add next to `chartBundle` in `src/app.js`:

```js
const animeBundle = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../node_modules/animejs/dist/bundles/anime.esm.js',
);
```

Add next to `/vendor/chart.js`:

```js
app.get('/vendor/animejs.js', (request, response) => {
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.type('text/javascript').sendFile(animeBundle);
});
```

- [ ] **Step 4: Run route and dependency checks**

Run: `node --test --test-name-pattern="vendor" test/app.test.js && npm ls animejs --depth=0`

Expected: PASS, with exactly `animejs@4.5.x` present alongside the existing production dependencies.

- [ ] **Step 5: Commit the vendor boundary**

```bash
git add package.json package-lock.json src/app.js test/app.test.js
git commit -m "build: serve local animejs bundle"
```

### Task 2: Add the deterministic theme controller

**Files:**
- Create: `public/theme.js`
- Create: `test/theme.test.js`

**Interfaces:**
- Consumes: injected `root`, `storage`, `mediaQuery`, `themeColor`, and `controls` so Node tests require no DOM implementation.
- Produces: `THEME_STORAGE_KEY`, `resolveTheme({ storedTheme, prefersDark })`, and `createThemeController(options)` returning `{ current, apply, toggle, syncControls, destroy }`.

- [ ] **Step 1: Write failing theme resolution and controller tests**

Create `test/theme.test.js` with storage/root/control fakes and these assertions:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  THEME_STORAGE_KEY,
  createThemeController,
  resolveTheme,
} from '../public/theme.js';

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

test('storage failures keep a usable in-memory theme', () => {
  const harness = themeHarness({ storageThrows: true });
  const controller = createThemeController(harness.options);
  assert.doesNotThrow(() => controller.toggle());
  assert.equal(controller.current(), 'dark');
});
```

Implement the test harness in the same file:

```js
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
    getItem(key) { if (storageThrows) throw new Error('blocked'); return storageValues.get(key) ?? null; },
    setItem(key, value) { if (storageThrows) throw new Error('blocked'); storageValues.set(key, value); },
  };
  return {
    root,
    control,
    themeColor,
    storageValues,
    options: {
      root, storage, mediaQuery, themeColor,
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
```

- [ ] **Step 2: Run tests and verify the module is absent**

Run: `node --test test/theme.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `public/theme.js`.

- [ ] **Step 3: Implement the theme controller**

Create `public/theme.js` around this exact public surface:

```js
export const THEME_STORAGE_KEY = 'lexflow-theme';

export function resolveTheme({ storedTheme, prefersDark }) {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return prefersDark ? 'dark' : 'light';
}

export function createThemeController({
  root,
  storage,
  mediaQuery,
  themeColor,
  controls = [],
  isLoginVisible = () => false,
}) {
  let explicitChoice = safeGet(storage, THEME_STORAGE_KEY);
  let selected = resolveTheme({ storedTheme: explicitChoice, prefersDark: mediaQuery.matches });

  function syncControls() {
    const dark = selected === 'dark';
    for (const control of controls) {
      control.setPressed(String(dark));
      control.setLabel(dark ? 'Light mode' : 'Dark mode');
      control.setAriaLabel(dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    themeColor?.setContent(isLoginVisible() || dark ? '#05070b' : '#fbfbfa');
  }

  function apply(theme, { persist = true } = {}) {
    selected = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = selected;
    root.classList.toggle('dark', selected === 'dark');
    if (persist) {
      explicitChoice = selected;
      safeSet(storage, THEME_STORAGE_KEY, selected);
    }
    syncControls();
    return selected;
  }

  function onOsChange(event) {
    if (explicitChoice === 'light' || explicitChoice === 'dark') return;
    apply(event.matches ? 'dark' : 'light', { persist: false });
  }

  mediaQuery.addEventListener?.('change', onOsChange);
  apply(selected, { persist: false });
  return {
    current: () => selected,
    apply,
    toggle: () => apply(selected === 'dark' ? 'light' : 'dark'),
    syncControls,
    destroy: () => mediaQuery.removeEventListener?.('change', onOsChange),
  };
}
```

Implement `safeGet()`/`safeSet()` with `try/catch` and no feedback emission.

- [ ] **Step 4: Run the theme tests**

Run: `node --test test/theme.test.js`

Expected: all theme tests PASS.

- [ ] **Step 5: Commit the isolated theme model**

```bash
git add public/theme.js test/theme.test.js
git commit -m "feat: add persistent theme controller"
```

### Task 3: Add user-gesture-safe notification audio

**Files:**
- Create: `public/notification-audio.js`
- Create: `test/notification-audio.test.js`

**Interfaces:**
- Consumes: injected `storage`, `AudioContextClass`, and `eventTarget`.
- Produces: `SOUND_STORAGE_KEY` and `createNotificationAudio(options)` returning `{ arm, enabled, setEnabled, toggle, playNotification, playCompletion, playRead, destroy }`.

- [ ] **Step 1: Write failing audio preference, arming, and fallback tests**

Create `test/notification-audio.test.js` with a fake AudioContext recording oscillators, gains, starts, and stops:

```js
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
```

Use this deterministic harness below the tests:

```js
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
    state: 'suspended', currentTime: 10, destination: {}, oscillators: [],
    async resume() { this.state = 'running'; },
    createOscillator() {
      const oscillator = {
        frequency: parameter(), connect() {}, start() {}, stop() {}, type: '',
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
```

- [ ] **Step 2: Run tests and verify the module is absent**

Run: `node --test test/notification-audio.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement preference, arming, and the three approved chimes**

Create `public/notification-audio.js` with these tone definitions and public behavior:

```js
export const SOUND_STORAGE_KEY = 'lexflow-notification-sounds';

const TONES = Object.freeze({
  notification: [
    { frequency: 659.25, offset: 0, duration: 0.34, volume: 0.045 },
    { frequency: 987.77, offset: 0.1, duration: 0.42, volume: 0.035 },
  ],
  completion: [
    { frequency: 523.25, offset: 0, duration: 0.28, volume: 0.035 },
    { frequency: 659.25, offset: 0.075, duration: 0.32, volume: 0.038 },
    { frequency: 783.99, offset: 0.15, duration: 0.44, volume: 0.032 },
  ],
  read: [
    { frequency: 783.99, offset: 0, duration: 0.22, volume: 0.03 },
    { frequency: 659.25, offset: 0.065, duration: 0.3, volume: 0.026 },
  ],
});
```

Use `'muted'` as the only disabled persisted value; missing, invalid, or inaccessible storage defaults enabled. Implement the controller around this core:

```js
export function createNotificationAudio({ storage, AudioContextClass, eventTarget }) {
  let context = null;
  let soundsEnabled = safeGet(storage, SOUND_STORAGE_KEY) !== 'muted';

  async function arm() {
    if (!AudioContextClass) return false;
    try {
      context ??= new AudioContextClass();
      if (context.state === 'suspended') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  }

  function playChime(tones) {
    if (!soundsEnabled || !context || context.state !== 'running') return false;
    const now = context.currentTime;
    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.offset;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.duration + 0.02);
    }
    return true;
  }

  const armFromGesture = () => { void arm(); };
  eventTarget?.addEventListener('pointerdown', armFromGesture, { once: true, capture: true });
  eventTarget?.addEventListener('keydown', armFromGesture, { once: true, capture: true });

  function setEnabled(value) {
    soundsEnabled = Boolean(value);
    safeSet(storage, SOUND_STORAGE_KEY, soundsEnabled ? 'enabled' : 'muted');
    return soundsEnabled;
  }

  return {
    arm,
    enabled: () => soundsEnabled,
    setEnabled,
    toggle: () => setEnabled(!soundsEnabled),
    playNotification: () => playChime(TONES.notification),
    playCompletion: () => playChime(TONES.completion),
    playRead: () => playChime(TONES.read),
    destroy() {
      eventTarget?.removeEventListener('pointerdown', armFromGesture, true);
      eventTarget?.removeEventListener('keydown', armFromGesture, true);
      void context?.close?.();
    },
  };
}
```

Implement `safeGet()`/`safeSet()` with local `try/catch`. The methods never emit feedback or throw for unavailable storage/audio.

- [ ] **Step 4: Run the audio tests**

Run: `node --test test/notification-audio.test.js`

Expected: all audio tests PASS with no real audio device access.

- [ ] **Step 5: Commit the isolated audio model**

```bash
git add public/notification-audio.js test/notification-audio.test.js
git commit -m "feat: add optional notification chimes"
```

### Task 4: Add signature-gated, reduced-motion-safe effects

**Files:**
- Create: `public/ui-effects.js`
- Create: `test/ui-effects.test.js`

**Interfaces:**
- Consumes: injected Anime.js `animate`/`stagger`, `reducedMotion`, and `requestFrame`.
- Produces: `createUiEffects(options)` returning `{ login, workspace, emailList, emailDetail, accountMenu, themeToggle, metrics, pointerSpotlight, reset }`.

- [ ] **Step 1: Write failing reduced-motion and signature tests**

Create `test/ui-effects.test.js` with an animation spy:

```js
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
```

Use this harness in the same file:

```js
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
```

- [ ] **Step 2: Run tests and verify the module is absent**

Run: `node --test test/ui-effects.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the effect controller without application state**

Create `public/ui-effects.js` with private signature storage and effect-specific options:

```js
export function createUiEffects({ animate, stagger, reducedMotion, requestFrame }) {
  const signatures = new Map();
  let loginPlayed = false;

  function canRun(targets, key, signature) {
    const items = Array.from(targets ?? []);
    for (const item of items) {
      if (item.style) {
        item.style.opacity = '';
        item.style.transform = '';
      }
    }
    if (!items.length || reducedMotion.matches) return null;
    if (signature !== undefined && signatures.get(key) === signature) return null;
    if (signature !== undefined) signatures.set(key, signature);
    return items;
  }

  function reveal(targets, key, signature, options = {}) {
    const items = canRun(targets, key, signature);
    if (!items) return false;
    requestFrame(() => animate(items, {
      opacity: { from: 0 },
      translateY: { from: options.translateY ?? 10 },
      delay: stagger(options.stagger ?? 45),
      duration: options.duration ?? 420,
      ease: 'out(4)',
    }));
    return true;
  }
```

Build the return object from `reveal()` using these exact method names and gates. Email detail and account-menu effects run on each explicit open; polling-driven lists/cards remain signature-gated:

```js
return {
  login(targets) {
    if (loginPlayed) return false;
    loginPlayed = true;
    return reveal(targets, 'login', 'visible', { stagger: 75, duration: 620, translateY: 18 });
  },
  workspace: (targets, view) => reveal(targets, 'workspace', view),
  emailList: (targets, signature) => reveal(targets, 'email-list', signature, { stagger: 35 }),
  emailDetail: targets => reveal(targets, 'email-detail', undefined, { stagger: 45 }),
  metrics: (targets, signature) => reveal(targets, 'metrics', signature, { stagger: 50 }),
  accountMenu(target) {
    const items = canRun([target], 'account-menu');
    if (!items) return false;
    animate(items, { opacity: { from: 0 }, scale: { from: 0.97 }, duration: 220, ease: 'out(4)' });
    return true;
  },
  themeToggle(target) {
    const items = canRun([target], 'theme-toggle');
    if (!items) return false;
    animate(items, { scale: [{ to: 1.08 }, { to: 1 }], duration: 360, ease: 'out(4)' });
    return true;
  },
  pointerSpotlight(card, event) {
    if (reducedMotion.matches || event.pointerType === 'touch') return false;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
    return true;
  },
  reset() {
    signatures.clear();
    loginPlayed = false;
  },
};
```

- [ ] **Step 4: Run effects tests**

Run: `node --test test/ui-effects.test.js`

Expected: all effects tests PASS and unchanged signatures create no additional animation calls.

- [ ] **Step 5: Commit the isolated effects model**

```bash
git add public/ui-effects.js test/ui-effects.test.js
git commit -m "feat: add restrained interface effects"
```

### Task 5: Add accessible account presentation controls and wire successful sounds

**Files:**
- Modify: `public/index.html:6-12,220-265,694-695`
- Modify: `public/app.js:1-220,438-470,1440-1585,1720-1780,1887-1892,2030-2100,2518-2552`
- Modify: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: `createThemeController()`, `createNotificationAudio()`, and Anime.js exports from `/vendor/animejs.js`.
- Produces: accessible `#account-menu-button`, `#account-menu`, `#theme-toggle`, `#sound-toggle`, and presentation-only success hooks in the existing lifecycle.

- [ ] **Step 1: Add failing HTML and integration contract tests**

Add a test named `account menu exposes theme and sound controls with success-only hooks` to `test/ui-copy.test.js`, and place these assertions in its callback:

```js
assert.match(html, /id="account-menu-button"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/);
assert.match(html, /id="account-menu"[^>]*role="menu"[^>]*hidden/);
assert.match(html, /id="theme-toggle"[^>]*aria-pressed="false"/);
assert.match(html, /id="sound-toggle"[^>]*aria-pressed="true"/);
assert.match(html, /Notification sounds/);
assert.match(app, /createThemeController\(/);
assert.match(app, /createNotificationAudio\(/);
assert.match(app, /unreadCount > state\.lastUnreadCount[\s\S]*notificationAudio\.playNotification\(\)/);
assert.match(app, /await mutate\(`\/api\/emails\/\$\{state\.selectedEmailId\}\/complete`\)[\s\S]*notificationAudio\.playCompletion\(\)/);
assert.match(app, /await mutate\(`\/api\/notifications\/\$\{read\.dataset\.notificationId\}\/read`\)[\s\S]*notificationAudio\.playRead\(\)/);
```

Also assert the script order remains Chart.js followed by the module app script; Anime.js must be imported by ESM rather than added as a classic script.

- [ ] **Step 2: Run the focused UI contracts and verify they fail**

Run: `node --test --test-name-pattern="theme|sound|account" test/ui-copy.test.js`

Expected: FAIL because account controls and presentation hooks do not exist.

- [ ] **Step 3: Add the account popover without changing sign-out behavior**

Replace the duplicate topbar identity/logout presentation with this structure while retaining existing IDs used by behavior:

```html
<div class="account-menu">
  <button class="account-trigger" id="account-menu-button" type="button"
    aria-label="Open account menu" aria-haspopup="menu"
    aria-controls="account-menu" aria-expanded="false">
    <span class="avatar" id="topbar-avatar" aria-hidden="true"></span>
  </button>
  <div class="account-popover" id="account-menu" role="menu" hidden>
    <div class="account-summary">
      <span class="user-copy"><strong id="topbar-user"></strong><small id="topbar-role"></small></span>
    </div>
    <button class="account-setting" id="theme-toggle" type="button" role="menuitem" aria-pressed="false">
      <span data-theme-label>Dark mode</span><span class="theme-switch" aria-hidden="true"><i></i></span>
    </button>
    <button class="account-setting" id="sound-toggle" type="button" role="menuitem" aria-pressed="true">
      <span>Notification sounds</span><span class="sound-state" data-sound-label>On</span>
    </button>
    <button class="account-signout" id="logout-button" type="button" role="menuitem">
      <svg class="icon" aria-hidden="true"><use href="#icon-logout"></use></svg>
      <span class="button-label" data-button-label>Sign out</span>
    </button>
  </div>
</div>
```

Keep organization/user rendering assigned to `#topbar-avatar`, `#topbar-user`, and `#topbar-role`; keep the existing `/api/logout` listener on `#logout-button`.

- [ ] **Step 4: Wire theme, sound preference, popover behavior, and successful event hooks**

At the top of `public/app.js`:

```js
import { animate, stagger } from '/vendor/animejs.js';
import { createThemeController } from './theme.js';
import { createNotificationAudio } from './notification-audio.js';
import { createUiEffects } from './ui-effects.js';
```

Add these references to the existing `elements` object:

```js
themeColor: document.querySelector('meta[name="theme-color"]'),
mainContent: document.querySelector('#main-content'),
accountMenuButton: document.querySelector('#account-menu-button'),
accountMenu: document.querySelector('#account-menu'),
themeToggle: document.querySelector('#theme-toggle'),
themeLabel: document.querySelector('[data-theme-label]'),
soundToggle: document.querySelector('#sound-toggle'),
soundLabel: document.querySelector('[data-sound-label]'),
```

Create adapters for the real DOM controls and initialize the three controllers with these dependencies:

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const theme = createThemeController({
  root: document.documentElement,
  storage: window.localStorage,
  mediaQuery: window.matchMedia('(prefers-color-scheme: dark)'),
  themeColor: {
    setContent: value => elements.themeColor?.setAttribute('content', value),
  },
  controls: [{
    setPressed: value => elements.themeToggle.setAttribute('aria-pressed', value),
    setLabel: value => setText(elements.themeLabel, value),
    setAriaLabel: value => elements.themeToggle.setAttribute('aria-label', value),
  }],
  isLoginVisible: () => !elements.loginView.hidden,
});
const notificationAudio = createNotificationAudio({
  storage: window.localStorage,
  AudioContextClass: window.AudioContext || window.webkitAudioContext,
  eventTarget: document,
});
const uiEffects = createUiEffects({
  animate,
  stagger,
  reducedMotion,
  requestFrame: callback => window.requestAnimationFrame(callback),
});
```

Implement `openAccountMenu()`/`closeAccountMenu({ restoreFocus = false })`. Opening sets `hidden = false`, `aria-expanded = true`, runs `uiEffects.accountMenu(elements.accountMenu)`, and focuses the first menu item; Escape/outside click closes it, while Tab remains native. Invoke `theme.syncControls()` in `showLogin()` and `showApp()` so `theme-color` tracks the active surface.

Synchronize sound UI through one helper:

```js
function syncSoundControl() {
  const enabled = notificationAudio.enabled();
  elements.soundToggle.setAttribute('aria-pressed', String(enabled));
  setText(elements.soundLabel, enabled ? 'On' : 'Muted');
  elements.soundToggle.setAttribute('aria-label', `Notification sounds ${enabled ? 'on' : 'muted'}`);
}
```

Wire the controls without altering application requests:

```js
elements.accountMenuButton.addEventListener('click', event => {
  event.stopPropagation();
  elements.accountMenu.hidden ? openAccountMenu() : closeAccountMenu({ restoreFocus: true });
});
elements.themeToggle.addEventListener('click', () => {
  theme.toggle();
  uiEffects.themeToggle(elements.themeToggle.querySelector('.theme-switch'));
});
elements.soundToggle.addEventListener('click', () => {
  notificationAudio.toggle();
  syncSoundControl();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.account-menu')) closeAccountMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !elements.accountMenu.hidden) closeAccountMenu({ restoreFocus: true });
});
syncSoundControl();
```

In the existing unread block, preserve baseline assignment order and add only:

```js
if (state.lastUnreadCount !== null && unreadCount > state.lastUnreadCount) {
  setText(elements.notificationAnnouncement, `${countLabel(unreadCount, 'unread notification')} available.`);
  notificationAudio.playNotification();
}
state.lastUnreadCount = unreadCount;
```

Immediately after successful completion and read mutations, before their existing success toasts, add:

```js
notificationAudio.playCompletion();
// and, in the read handler:
notificationAudio.playRead();
```

Do not call a sound in `catch`, initial bootstrap, login, sync, render, or poll setup paths.

- [ ] **Step 5: Run controller and UI integration tests**

Run: `node --test test/theme.test.js test/notification-audio.test.js test/ui-copy.test.js`

Expected: PASS, including the exact success-only sound hook ordering.

- [ ] **Step 6: Commit account controls and sound integration**

```bash
git add public/index.html public/app.js test/ui-copy.test.js
git commit -m "feat: add theme and sound account controls"
```

### Task 6: Port the atmospheric login, complete dark theme, and approved motion

**Files:**
- Modify: `public/index.html:5-70,694-695`
- Modify: `public/styles.css`
- Modify: `public/app.js:438-470,578-900,1380-1585,1680-1790`
- Modify: `public/metrics-charts.js:1-140`
- Create: `test/metrics-charts-theme.test.js`
- Modify: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: the Task 4 `uiEffects` methods and current render functions/state.
- Produces: approved login visuals, full dark semantic tokens, stable presentation signatures, and reduced-motion-safe effects.

- [ ] **Step 1: Add failing visual-boundary and exclusion tests**

Add a test named `atmospheric login and dark motion stay inside the presentation boundary` to `test/ui-copy.test.js`, and place these approved-structure and exclusion assertions in its callback:

```js
assert.match(html, /<meta name="color-scheme" content="light dark">/);
assert.match(html, /localStorage\.getItem\('lexflow-theme'\)/);
assert.match(html, /class="login-atmosphere"/);
assert.match(html, /class="login-flow"/);
assert.match(html, /Continue with Microsoft/);
assert.doesNotMatch(html, /type="password"|demo credentials|ui-assets|icon-vacation/i);
assert.doesNotMatch(app, /\/api\/login|vacation|cfo/i);
assert.match(styles, /html\[data-theme="dark"\]/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(app, /uiEffects\.emailList\([^,]+,\s*emailSignature/);
assert.match(app, /uiEffects\.metrics\([^,]+,\s*metricSignature/);
```

Add dependency-denylist checks by reading `package.json` and asserting the absence of `react`, `react-dom`, `tailwindcss`, `vite`, `motion`, and every `@visx/*` key.

Create `test/metrics-charts-theme.test.js` to lock chart contrast without involving Chart.js:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { chartTheme } from '../public/metrics-charts.js';

test('chart presentation colors remain readable in light and dark themes', () => {
  assert.deepEqual(chartTheme('light'), {
    grid: '#ecece8', ticks: '#65655f', doughnutBorder: '#ffffff',
  });
  assert.deepEqual(chartTheme('dark'), {
    grid: '#29313c', ticks: '#b3bbc6', doughnutBorder: '#11161d',
  });
});
```

- [ ] **Step 2: Run the visual contract test and verify it fails**

Run: `node --test --test-name-pattern="login|dark|motion|presentation" test/ui-copy.test.js`

Expected: FAIL on the missing atmospheric structure, dark tokens, and effect hooks.

- [ ] **Step 3: Add the pre-paint theme bootstrap and Microsoft-only login structure**

Change `color-scheme` to `light dark` and place this before the stylesheet:

```html
<script>
  (() => {
    try {
      const saved = localStorage.getItem('lexflow-theme');
      const theme = saved === 'light' || saved === 'dark'
        ? saved
        : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch {}
  })();
</script>
```

Adapt the source branch's `.login-atmosphere`, `.login-header`, `.login-stage`, `.login-flow`, and `.login-proof` markup. Mark reveal targets with `data-login-reveal`, but retain exactly one `#login-form` submit button with `Continue with Microsoft`, the existing `#login-error`, and the current submit navigation to `/api/auth/outlook/start`.

- [ ] **Step 4: Establish semantic dark tokens and full component coverage**

Keep the current light `:root` values and add a single dark token layer:

```css
html[data-theme="dark"] {
  color-scheme: dark;
  --color-canvas: #080b10;
  --color-card: #11161d;
  --color-soft: #171d25;
  --color-ink: #f5f3ee;
  --color-muted: #9da6b2;
  --color-line: #29313c;
  --color-coral: #ff6542;
  --color-coral-hover: #ff7a5c;
  --color-coral-soft: #352019;
  --shadow-card: 0 18px 55px rgb(0 0 0 / 28%);
  --shadow-dialog: 0 30px 90px rgb(0 0 0 / 55%);
}
```

Replace remaining fixed light-only surfaces with existing semantic variables, then add scoped dark overrides for sidebar/topbar, all cards and lists, forms, buttons, dialogs/drawers, toasts, Team, Settings, Graph Integration, rules, notifications, activity, threads/messages, metrics charts/legends/tables, loading/error/empty states, and focus rings. Do not change display, grid-template, widths, heights, ordering, overview limits, or responsive breakpoints except where the atmospheric login requires its approved responsive layout.

In `public/metrics-charts.js`, export and use this presentation-only palette helper from `chartDatasets()` and `chartOptions()`:

```js
export function chartTheme(theme = document.documentElement.dataset.theme) {
  return theme === 'dark'
    ? { grid: '#29313c', ticks: '#b3bbc6', doughnutBorder: '#11161d' }
    : { grid: '#ecece8', ticks: '#65655f', doughnutBorder: '#ffffff' };
}
```

Pass the resolved colors into the existing dataset/options builders; change only `borderColor`, grid `color`, and tick `color`. After `theme.toggle()` in `public/app.js`, call `metricsView.activate(state.session)` only when `state.view === 'metrics' && state.session`; its cached-payload path rerenders charts without issuing a metrics request.

- [ ] **Step 5: Wire effects with stable presentation signatures**

Add pure signature helpers in `public/app.js`:

```js
function visibleEmailSignature(emails) {
  return emails.map(email => [
    email.id,
    email.status,
    email.assignee?.id ?? '',
    email.messageCount ?? 1,
    email.reopened ? 1 : 0,
  ].join(':')).join('|');
}

function visibleMetricSignature(items) {
  return items.map(([label, value]) => `${label}:${value}`).join('|');
}
```

Use these exact call shapes in the existing render lifecycle:

```js
// At the end of showLogin(), after final content/error visibility is set:
uiEffects.login(elements.loginView.querySelectorAll('[data-login-reveal]'));

// At the end of renderMetrics(), after replaceChildren():
const metricCards = elements.metrics.querySelectorAll('.metric');
uiEffects.metrics(metricCards, visibleMetricSignature(items));

// At the end of renderEmails(), after replacing the visible rows; `emails` is
// the existing local array produced from `allEmails`/the overview preview:
uiEffects.emailList(
  elements.emailList.querySelectorAll('[data-email-id]'),
  visibleEmailSignature(emails),
);

// In render(), after renderPanels() establishes visibility:
uiEffects.workspace(
  elements.mainContent.querySelectorAll('.card:not([hidden])'),
  state.view,
);

// In openEmail(), immediately after showModal():
uiEffects.emailDetail(
  elements.emailDialog.querySelectorAll('.email-dialog-head, .email-meta, .email-detail-preview, .dialog-actions'),
);
```

Use the existing local visible-email array inside `renderEmails()`—name it once and pass the same value to rendering and signature generation rather than introducing a second filter. Add `mainContent` to the existing `elements` map.

Because `public/metrics-view.js` is intentionally outside the production allowlist, observe only presentation changes beneath `#metrics-page` from `public/app.js`:

```js
const metricsObserver = new MutationObserver(() => {
  window.requestAnimationFrame(() => {
    if (state.view !== 'metrics') return;
    const cards = elements.metricsPage.querySelectorAll('.metrics-kpi');
    const signature = [...cards].map(card => card.textContent.trim()).join('|');
    uiEffects.metrics(cards, signature);
  });
});
metricsObserver.observe(elements.metricsPage, { childList: true, subtree: true, characterData: true });
```

Delegate `pointermove` from `#metrics` and `#metrics-page` to `.metric, .metrics-kpi` and pass the card/event to `uiEffects.pointerSpotlight()`. Call `uiEffects.reset()` only in the existing client sign-out reset path before `showLogin()`; do not reset on polling or repeated failed bootstrap renders.

For the login pointer glow, add one presentation-only listener:

```js
elements.loginView.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType === 'touch'
    || !window.matchMedia('(pointer: fine)').matches) return;
  elements.loginView.style.setProperty('--login-pointer-x', `${event.clientX}px`);
  elements.loginView.style.setProperty('--login-pointer-y', `${event.clientY}px`);
});
```

- [ ] **Step 6: Add final-state and reduced-motion CSS safeguards**

Add selectors ensuring JS-enhanced content is visible before/without animation and this reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .login-flow-line i,
  .login-live-dot { animation: none !important; }
  .metric:hover,
  .metrics-kpi:hover { transform: none; }
}
```

Do not hide content in base CSS awaiting JavaScript; Anime.js must animate from temporary values and leave accessible final content.

- [ ] **Step 7: Run all presentation tests**

Run: `node --test test/theme.test.js test/notification-audio.test.js test/ui-effects.test.js test/metrics-charts-theme.test.js test/ui-copy.test.js`

Expected: PASS with Microsoft-only auth and all denylist assertions intact.

- [ ] **Step 8: Commit the visual port**

```bash
git add public/index.html public/styles.css public/app.js public/metrics-charts.js test/metrics-charts-theme.test.js test/ui-copy.test.js
git commit -m "feat: port shared visual theme and motion"
```

### Task 7: Perform full regression and browser verification

**Files:**
- Modify only if a presentation defect is found: allowlisted files and focused tests listed above.

**Interfaces:**
- Consumes: the complete presentation port.
- Produces: test evidence that behavior is unchanged and the UI works across roles, themes, motion settings, and viewport sizes.

- [ ] **Step 1: Run static boundary and whitespace audits**

Run:

```bash
git diff --check 1bd1fa0..HEAD
git diff --name-only 1bd1fa0..HEAD
git diff -U0 1bd1fa0..HEAD -- public src package.json | rg "^\+.*(api/login|type=\"password\"|vacation|cfo|ui-assets|react|tailwind|visx)" || true
```

Expected: no whitespace errors; changed production files are confined to the allowlist; the denylist search has no newly introduced local-auth, vacation, CFO, generated-assets, or alternate-framework references.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: every existing and new test PASS, including Entra, tenancy, Graph, conversations, rules, Metrics, feedback, and UI contracts.

- [ ] **Step 3: Start the app for browser smoke testing**

Run: `npm start`

Expected: the server starts on the configured localhost port with no startup error. Keep this process running in its terminal session for the following checks.

- [ ] **Step 4: Verify signed-out presentation in the browser**

Open `http://localhost:3000/` and verify at desktop and a viewport narrower than 760 px:

- Atmospheric layout renders without horizontal overflow.
- The only authentication action is `Continue with Microsoft`.
- Clicking it navigates immediately to `/api/auth/outlook/start` without animation delay.
- An `?auth=error&message=Microsoft%20sign-in%20failed.` callback displays through the existing UI feedback and is removed from the URL.
- First visit follows OS Light/Dark preference without a wrong-theme flash.
- With reduced motion enabled, ambient/reveal motion is absent and all content stays visible.

- [ ] **Step 5: Verify authenticated controls and role pages**

Using available local Entra test identities, verify each role's existing pages in Light and Dark modes:

- PlatformAdmin: Organizations and Metrics.
- OrgAdmin: Settings, Team, Graph Integration, and Metrics.
- DepAdmin: Overview, Inbox, Assigned, Completed, Automation rules, Activity, Notifications, and Metrics.
- Member: My work, Completed, Notifications, and Metrics.

For each role, confirm account popover keyboard access, explicit theme persistence after reload, sound mute persistence after reload, unchanged navigation, unchanged forms/dialogs, and readable loading/error/empty states.

- [ ] **Step 6: Verify sound and motion gating with real UI events**

With sounds enabled and after one pointer/keyboard gesture:

- Initial bootstrap is silent.
- Unchanged polling is silent.
- Increasing unread notifications after baseline plays one notification chime.
- Successful `Mark complete` plays one completion chime; a failed request plays none.
- Successful `Mark read` plays one read chime; a failed request plays none.
- Muting suppresses all three sounds.
- View changes, changed email signatures, opened email details, account menu, and changed metric values animate once; unchanged polling does not replay them.

- [ ] **Step 7: Inspect console and network boundaries**

In browser developer tools verify:

- No console errors in login or authenticated flows.
- `/vendor/animejs.js` loads from the same origin once and is cacheable.
- No requests target source-branch assets, CDNs, sound files, `/api/login`, CFO, or vacation endpoints.
- Existing API paths and payloads remain unchanged during navigation, completion, read, rule, Team, Settings, Graph, and Metrics interactions.

- [ ] **Step 8: Fix presentation-only defects and rerun all gates**

For any failure, change only an allowlisted presentation file or focused test. Then rerun:

```bash
git diff --check 1bd1fa0..HEAD
npm test
```

Expected: clean diff and full PASS.

- [ ] **Step 9: Commit verification fixes, if any**

If browser verification required changes:

```bash
git add public/index.html public/styles.css public/app.js public/metrics-charts.js public/theme.js public/ui-effects.js public/notification-audio.js test package.json package-lock.json src/app.js
git commit -m "fix: polish themed interface effects"
```

If no files changed, do not create an empty commit. Record the passing commands and browser scenarios in the implementation handoff.
