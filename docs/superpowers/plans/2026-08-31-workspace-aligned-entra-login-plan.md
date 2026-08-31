# Workspace-Aligned Entra Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Microsoft Entra sign-in screen as an entrance to the authenticated LexFlow workspace without changing authentication, data, or business behavior.

**Architecture:** Preserve the current login form, IDs, event bindings, and Entra routes while replacing only the login presentation wrapper and CSS. Reuse authenticated-workspace tokens and components, retain the existing presentation-only entrance hook, and verify the boundary with static contracts, the full test suite, and browser smoke tests against the MathCo Entra workspace.

**Tech Stack:** Static HTML, CSS custom properties and media queries, vanilla JavaScript, Node.js built-in test runner, Microsoft Entra authorization-code flow.

## Global Constraints

- Preserve every authentication, authorization, data, mailbox, session, and workflow behavior.
- Preserve `#login-view`, `#login-title`, `#login-form`, `#login-error`, the submit control, and existing JavaScript bindings.
- Preserve Outlook/Entra routes, PKCE, state, nonce, redirects, issuer, tenant, membership, role, and session handling.
- Preserve APIs, database schemas and records, mailbox integrations, automation rules, metrics, and role behavior.
- Follow the existing saved/system light–dark theme through shared semantic tokens.
- Do not show organization-specific branding before authentication.
- Remove login-only blue/cyan colors, auroras, pointer spotlight, glass styling, and blue workflow states.
- Retain only the existing short entrance sequence and a subtle coral routing indicator; respect reduced motion.
- Source changes are limited to `public/index.html`, `public/styles.css`, and `test/ui-copy.test.js`.
- Do not modify `.env`, `data/`, `public/app.js`, `public/ui-effects.js`, `src/`, authentication code, or API code.

---

## File Structure

- `public/index.html`: semantic workspace-shell login markup; authentication hooks remain unchanged.
- `public/styles.css`: token-driven shell, route motif, responsive behavior, and reduced-motion treatment.
- `test/ui-copy.test.js`: static contracts for markup, token use, responsiveness, and behavior boundaries.

### Task 1: Lock the semantic and authentication contract

**Files:**
- Modify: `test/ui-copy.test.js`
- Test: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: existing `html`, `app`, `styles`, and `packageJson` test fixtures.
- Produces: required shell classes and unchanged Microsoft authentication hooks.

- [ ] **Step 1: Write the failing semantic-shell test**

Replace the atmospheric-login test with:

```js
test('Entra login echoes the workspace shell without changing authentication hooks', () => {
  assert.match(html, /<meta name="color-scheme" content="light dark">/);
  assert.match(html, /localStorage\.getItem\('lexflow-theme'\)/);
  assert.match(html, /id="login-view"[^>]*aria-labelledby="login-title"/);
  assert.match(html, /class="login-layout login-workspace-shell"/);
  assert.match(html, /class="login-brand-rail"/);
  assert.match(html, /class="login-main-surface"/);
  assert.match(html, /id="login-form"/);
  assert.match(html, /id="login-error"[^>]*role="alert"/);
  assert.match(html, /Continue with Microsoft/);
  assert.doesNotMatch(html, /login-atmosphere|login-aurora|login-pointer-glow/);
  assert.doesNotMatch(html, /type="password"|demo credentials|icon-vacation/i);
  assert.doesNotMatch(app, /\/api\/login|vacation|cfo/i);
  assert.match(app, /loginForm\.addEventListener\('submit'/);
  assert.match(app, /\/api\/auth\/outlook\/start/);

  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  for (const dependency of ['react', 'react-dom', 'tailwindcss', 'vite', 'motion']) {
    assert.equal(dependencies[dependency], undefined);
  }
  assert.equal(Object.keys(dependencies).some(name => name.startsWith('@visx/')), false);
});
```

- [ ] **Step 2: Verify the test fails for the old atmosphere**

Run: `node --test test/ui-copy.test.js`

Expected: FAIL because the shell classes are absent and atmospheric elements remain.

- [ ] **Step 3: Commit the failing contract**

```bash
git add test/ui-copy.test.js
git diff --cached --check
git commit -m "test: define workspace-aligned Entra login"
```

### Task 2: Build the workspace-shell login markup

**Files:**
- Modify: `public/index.html:51-118`
- Test: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: existing `icon-mail`, `icon-rules`, `icon-assigned`, `icon-activity`, and `icon-timer` SVG symbols.
- Produces: `.login-workspace-shell`, `.login-brand-rail`, `.login-main-surface`, and unchanged authentication elements.

- [ ] **Step 1: Remove the atmospheric decoration wrapper**

Delete `.login-atmosphere`, `.login-aurora-one`, `.login-aurora-two`, and `.login-pointer-glow` elements. Keep the outer `#login-view` section unchanged.

- [ ] **Step 2: Add the workspace-shell structure**

Use this skeleton, retaining the exact form block shown:

```html
<div class="login-layout login-workspace-shell">
  <aside class="login-brand-rail" aria-label="LexFlow introduction" data-login-reveal>
    <div class="brand login-brand" aria-label="LexFlow">
      <span class="logo" aria-hidden="true">L</span>
      <span class="brand-lockup">
        <span class="brand-name">LexFlow</span>
        <small>Mailbox operations</small>
      </span>
    </div>
    <div class="login-rail-copy">
      <p class="eyebrow">Intelligent mailbox orchestration</p>
      <p class="login-statement">Work moves.<br><span>Nothing gets lost.</span></p>
      <p>Turn shared messages into clear ownership, accountable action, and visible outcomes.</p>
    </div>
    <div class="login-route" aria-label="Inbox to accountable assignment">
      <div class="login-route-step is-current">
        <span class="login-route-icon"><svg class="icon" aria-hidden="true"><use href="#icon-mail"></use></svg></span>
        <span><small>Inbox</small><strong>Request received</strong></span>
      </div>
      <span class="login-route-line" aria-hidden="true"><i></i></span>
      <div class="login-route-step">
        <span class="login-route-icon"><svg class="icon" aria-hidden="true"><use href="#icon-rules"></use></svg></span>
        <span><small>Rules</small><strong>Priority routed</strong></span>
      </div>
      <span class="login-route-line" aria-hidden="true"><i></i></span>
      <div class="login-route-step is-complete">
        <span class="login-route-icon"><svg class="icon" aria-hidden="true"><use href="#icon-assigned"></use></svg></span>
        <span><small>Assignment</small><strong>Owner accountable</strong></span>
      </div>
    </div>
    <div class="login-proof" aria-label="Workspace principles">
      <span><svg class="icon" aria-hidden="true"><use href="#icon-activity"></use></svg> Complete audit trail</span>
      <span><svg class="icon" aria-hidden="true"><use href="#icon-timer"></use></svg> SLA visibility</span>
    </div>
  </aside>
  <main class="login-main-surface">
    <div class="login-system-state" data-login-reveal><span aria-hidden="true"></span> Systems operational</div>
    <section class="login-card card" aria-label="Sign in" data-login-reveal>
      <div class="login-card-status"><span aria-hidden="true"></span> Protected workspace</div>
      <p class="eyebrow">Secure access</p>
      <h1 id="login-title">Welcome back</h1>
      <p class="login-copy">Continue with your organization’s Microsoft account.</p>
      <form id="login-form" novalidate>
        <p class="form-error" id="login-error" role="alert" hidden></p>
        <button class="button primary login-submit" type="submit"><span class="button-label" data-button-label>Continue with Microsoft</span></button>
      </form>
      <p class="demo-note">Enterprise Microsoft Entra sign-in</p>
    </section>
  </main>
</div>
```

Do not add a password input, organization selector, tenant field, alternate action, or organization logo.

- [ ] **Step 3: Run the focused test**

Run: `node --test test/ui-copy.test.js`

Expected: PASS. IDs, Microsoft action, theme bootstrap, and form semantics remain intact.

- [ ] **Step 4: Commit the markup**

```bash
git add public/index.html
git diff --cached --check
git commit -m "feat: align Entra login structure with workspace"
```

### Task 3: Apply the shared visual system

**Files:**
- Modify: `test/ui-copy.test.js`
- Modify: `public/styles.css:3298-3813`
- Test: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: semantic custom properties from `:root` and `html[data-theme="dark"]`.
- Produces: shared-token shell, rail, card, Microsoft action, and route motif.

- [ ] **Step 1: Add a failing shared-token test**

```js
test('Entra login uses shared workspace tokens instead of an isolated blue theme', () => {
  assert.match(styles, /\.login-workspace-shell\s*\{[^}]*background:\s*var\(--color-canvas\)/s);
  assert.match(styles, /\.login-brand-rail\s*\{[^}]*background:\s*var\(--color-card\)/s);
  assert.match(styles, /\.login-main-surface\s*\{[^}]*background:\s*var\(--color-canvas\)/s);
  assert.match(styles, /\.login-card \.login-submit\s*\{[^}]*background:\s*var\(--color-coral\)/s);
  assert.match(styles, /\.login-route-line i\s*\{[^}]*var\(--color-coral\)/s);
  assert.doesNotMatch(styles, /--login-blue|--login-cyan|#2188ff|#68d7ff|#005bea|#32b7ff/i);
  assert.doesNotMatch(styles, /\.login-atmosphere|\.login-aurora|\.login-pointer-glow/);
});
```

- [ ] **Step 2: Verify the test fails for the blue overrides**

Run: `node --test test/ui-copy.test.js`

Expected: FAIL because the new selectors are absent and blue login declarations remain.

- [ ] **Step 3: Replace the atmospheric override block**

Remove login-only blue variables, aurora, glass, pointer-glow, and blue-button rules. Build the layout from shared tokens:

```css
.login-view {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: clamp(18px, 3vw, 36px);
  color: var(--color-ink);
  background: var(--color-stage);
}
.login-workspace-shell {
  width: min(100%, 1240px);
  min-height: min(760px, calc(100dvh - 72px));
  display: grid;
  grid-template-columns: minmax(300px, .72fr) minmax(0, 1.28fr);
  overflow: hidden;
  background: var(--color-canvas);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-shell);
  box-shadow: 0 18px 70px rgb(17 17 15 / 10%);
}
.login-brand-rail {
  display: flex;
  flex-direction: column;
  padding: clamp(30px, 4vw, 52px);
  background: var(--color-card);
  border-right: 1px solid var(--color-line);
}
.login-main-surface {
  display: grid;
  grid-template-rows: auto 1fr;
  padding: clamp(28px, 4vw, 54px);
  background: var(--color-canvas);
}
.login-card {
  width: min(100%, 520px);
  align-self: center;
  justify-self: center;
  padding: clamp(30px, 4vw, 48px);
  background: var(--color-card);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  box-shadow: 0 18px 54px rgb(17 17 15 / 10%);
}
.login-card .login-submit {
  min-height: 52px;
  background: var(--color-coral);
  border-color: var(--color-coral);
  border-radius: var(--radius-control);
}
.login-card .login-submit:hover {
  background: var(--color-coral-hover);
  border-color: var(--color-coral-hover);
}
```

Style the rail copy, statuses, proof chips, steps, and icons only from shared `--color-*`, radius, font, shadow, and motion tokens. Keep existing focus and `.form-error` behavior.

- [ ] **Step 4: Add the coral route indicator**

```css
.login-route-line i {
  position: absolute;
  inset: 0 auto 0 -40%;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--color-coral), transparent);
  animation: login-route 2.8s ease-in-out infinite;
}
@keyframes login-route {
  0% { transform: translateX(0); opacity: 0; }
  20%, 70% { opacity: 1; }
  100% { transform: translateX(350%); opacity: 0; }
}
```

Do not add pointer-following effects, backdrop filters, or JavaScript.

- [ ] **Step 5: Run the focused test and commit**

```bash
node --test test/ui-copy.test.js
git add public/styles.css test/ui-copy.test.js
git diff --cached --check
git commit -m "style: match Entra login to workspace theme"
```

Expected: PASS and a clean staged diff.

### Task 4: Add responsive and reduced-motion contracts

**Files:**
- Modify: `test/ui-copy.test.js`
- Modify: `public/styles.css`
- Test: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: Task 3 shell selectors and the global reduced-motion policy.
- Produces: a single-column mobile shell and static routing for reduced-motion users.

- [ ] **Step 1: Add the failing responsive contract**

```js
test('workspace-aligned login stacks responsively and respects reduced motion', () => {
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.login-workspace-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.login-brand-rail\s*\{[^}]*border-right:\s*0/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.login-route-line i[^}]*animation:\s*none !important/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.metric:hover/s);
});
```

- [ ] **Step 2: Verify the revised mobile contract fails**

Run: `node --test test/ui-copy.test.js`

Expected: FAIL because the new shell media rules do not exist.

- [ ] **Step 3: Implement responsive stacking**

```css
@media (max-width: 900px) {
  .login-workspace-shell { grid-template-columns: minmax(270px, .78fr) minmax(0, 1.22fr); }
  .login-brand-rail, .login-main-surface { padding: 30px; }
}
@media (max-width: 767px) {
  .login-view { place-items: start center; padding: 0; }
  .login-workspace-shell {
    min-height: 100dvh;
    grid-template-columns: minmax(0, 1fr);
    border: 0;
    border-radius: 0;
  }
  .login-brand-rail {
    padding: 24px 22px;
    border-right: 0;
    border-bottom: 1px solid var(--color-line);
  }
  .login-rail-copy, .login-proof { display: none; }
  .login-main-surface { min-height: 520px; padding: 22px; }
  .login-card { padding: 30px 24px; }
}
@media (max-width: 480px) {
  .login-route-step strong { font-size: 10px; }
  .login-route-step small { font-size: 9px; }
  .login-route-icon { width: 40px; height: 40px; }
  .login-card h1 { font-size: 34px; }
}
```

Ensure no horizontal scrolling at 320 CSS pixels.

- [ ] **Step 4: Replace obsolete reduced-motion targets**

Within the existing reduced-motion block, target `.login-route-line i { animation: none !important; }`. Preserve every metrics and authenticated-view rule in that block.

- [ ] **Step 5: Run focused and full tests**

```bash
node --test test/ui-copy.test.js
npm test
```

Expected: all tests pass, with 118 or more passes and zero failures.

- [ ] **Step 6: Commit responsive accessibility**

```bash
git add public/styles.css test/ui-copy.test.js
git diff --cached --check
git commit -m "style: refine responsive Entra login"
```

### Task 5: Verify MathCo login and audit the scope boundary

**Files:**
- Verify: `public/index.html`
- Verify: `public/styles.css`
- Verify: `test/ui-copy.test.js`
- Do not modify: `.env`, `data/`, `public/app.js`, `src/`, or integration/authentication files.

**Interfaces:**
- Consumes: local server using `data/mathco-entra-workspace.db` and `http://localhost:3000/`.
- Produces: browser and automated evidence that presentation changed while Entra behavior did not.

- [ ] **Step 1: Confirm the server is healthy**

Run: `curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/`

Expected: `200`. Do not print `.env`, OAuth URLs, tokens, cookies, or secrets.

- [ ] **Step 2: Check desktop and 390×844 mobile views**

Verify light and dark modes, shared shell/card/coral styling, visible focus, no blue atmosphere, no organization branding, no password field, and no horizontal overflow. Verify reduced motion leaves all content visible and the route indicator static.

- [ ] **Step 3: Verify callback-error presentation**

Open `http://localhost:3000/?auth=error&message=Microsoft%20sign-in%20failed.`

Expected: the message appears in `#login-error` and the app cleans the URL back to `/` without code changes.

- [ ] **Step 4: Verify Microsoft redirect safely**

Make a manual-redirect request to `/api/auth/outlook/start`. Assert only status `303`, hostname `login.microsoftonline.com`, and callback `http://localhost:3000/api/auth/outlook/callback`. Do not print state, PKCE, client ID, tenant parameters, or the full URL.

- [ ] **Step 5: Run final tests and boundary audit**

```bash
npm test
git diff --check 1deeebb..HEAD
git diff --name-only 1deeebb..HEAD
git status --short
```

Expected: all tests pass; only `public/index.html`, `public/styles.css`, `test/ui-copy.test.js`, and this plan appear after the approved design commit; no database or behavior files appear; worktree is clean.
