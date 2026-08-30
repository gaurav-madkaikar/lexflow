# Overview Density and Rule Priority Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove excessive blank space from the DepAdmin overview cards and restrict automation-rule priorities to Low, Medium, High, and Critical.

**Architecture:** Keep the existing integer `rules.priority` column and introduce one dependency-free priority module shared by the browser and Express server. The UI will expose a select and labels while the API validates the canonical values. The overview grid will use content-derived equal-height stretching instead of a fixed pixel height.

**Tech Stack:** Node.js ES modules, Express 5, SQLite, browser JavaScript, CSS Grid/Flexbox, Node test runner.

## Global Constraints

- Preserve the five-entry overview preview limit and existing `View all` behavior.
- Preserve equal-width and equal-height overview cards at desktop widths.
- Stack cards with independent natural heights at and below 1120px.
- Do not add a fixed or minimum overview-card height.
- Expose exactly Low, Medium, High, and Critical in the rule form; default to Medium.
- Store Critical as `10`, High as `20`, Medium as `30`, and Low as `40`.
- Evaluate matching rules Critical, High, Medium, then Low, with rule ID as the tie-breaker.
- Keep the numeric API field and existing SQLite schema.
- Do not change Microsoft Graph, authentication, organization, department, mailbox, or role behavior.

---

### Task 1: Shared priority model and API validation

**Files:**
- Create: `public/rule-priorities.js`
- Create: `test/rule-priorities.test.js`
- Modify: `src/app.js:1-40, 293-378`
- Modify: `test/app.test.js:371-413`

**Interfaces:**
- Produces: `RULE_PRIORITIES: ReadonlyArray<{ value: number, label: string }>` in display order.
- Produces: `DEFAULT_RULE_PRIORITY: number`, fixed at `30`.
- Produces: `RULE_PRIORITY_ERROR: string`.
- Produces: `isRulePriority(value: unknown): boolean`.
- Produces: `rulePriorityLabel(value: unknown): string`.
- Consumes: Existing numeric `priority` request and database fields.

- [x] **Step 1: Write failing shared-model and evaluation-order tests**

Create `test/rule-priorities.test.js`:

```js
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
```

- [x] **Step 2: Run the shared-model test and verify it fails**

Run: `node --test test/rule-priorities.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `public/rule-priorities.js`.

- [x] **Step 3: Implement the dependency-free shared priority module**

Create `public/rule-priorities.js`:

```js
export const RULE_PRIORITIES = Object.freeze([
  Object.freeze({ value: 40, label: 'Low' }),
  Object.freeze({ value: 30, label: 'Medium' }),
  Object.freeze({ value: 20, label: 'High' }),
  Object.freeze({ value: 10, label: 'Critical' }),
]);

export const DEFAULT_RULE_PRIORITY = 30;
export const RULE_PRIORITY_ERROR = 'Choose Low, Medium, High, or Critical.';

const priorityLabels = new Map(RULE_PRIORITIES.map(({ value, label }) => [value, label]));

export function isRulePriority(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && priorityLabels.has(numericValue);
}

export function rulePriorityLabel(value) {
  return priorityLabels.get(Number(value)) ?? '';
}
```

- [x] **Step 4: Run the shared-model test and verify it passes**

Run: `node --test test/rule-priorities.test.js`

Expected: both tests PASS.

- [x] **Step 5: Add failing API allowlist tests**

Add this test after the existing rule-update validation test in `test/app.test.js`:

```js
test('DepAdmin rule writes allow only the four canonical priorities', async (context) => {
  const harness = await createApiHarness(context);
  const cookie = await harness.login('maya@lexflow.local', 'welcome123');
  const assigneeId = harness.userId('noah@lexflow.local');

  for (const priority of [10, 20, 30, 40]) {
    const response = await harness.post('/api/rules', {
      name: `Priority ${priority}`,
      keywords: `priority-${priority}`,
      senderFilter: '',
      assigneeId,
      priority,
    }, cookie);
    assert.equal(response.status, 201);
  }

  const countBefore = one(harness.db, 'SELECT count(*) AS count FROM rules').count;
  const invalidCreate = await harness.post('/api/rules', {
    name: 'Invalid priority',
    keywords: 'invalid-priority',
    senderFilter: '',
    assigneeId,
    priority: 25,
  }, cookie);
  const existing = one(harness.db, 'SELECT * FROM rules ORDER BY id');
  const invalidPatch = await harness.patch(`/api/rules/${existing.id}`, { priority: 25 }, cookie);

  assert.equal(invalidCreate.status, 400);
  assert.equal(invalidCreate.body.error.fields.priority, 'Choose Low, Medium, High, or Critical.');
  assert.equal(invalidPatch.status, 400);
  assert.equal(invalidPatch.body.error.fields.priority, 'Choose Low, Medium, High, or Critical.');
  assert.equal(one(harness.db, 'SELECT count(*) AS count FROM rules').count, countBefore);
  assert.deepEqual(one(harness.db, 'SELECT * FROM rules WHERE id = ?', existing.id), existing);
});
```

- [x] **Step 6: Run the API test and verify noncanonical values are currently accepted**

Run: `node --test test/app.test.js`

Expected: FAIL because priority `25` currently passes the `1..999` range check.

- [x] **Step 7: Apply the allowlist in both server parsers**

Import the shared values near the top of `src/app.js`:

```js
import { isRulePriority, RULE_PRIORITY_ERROR } from '../public/rule-priorities.js';
```

In `parseRule`, replace the numeric range validation with:

```js
if (!isRulePriority(priority)) {
  return { error: RULE_PRIORITY_ERROR, field: 'priority' };
}
```

In `parseRulePatch`, replace the final numeric range validation with the same check:

```js
if (!isRulePriority(value.priority)) {
  return { error: RULE_PRIORITY_ERROR, field: 'priority' };
}
```

- [x] **Step 8: Run the model and API tests**

Run: `node --test test/rule-priorities.test.js test/app.test.js`

Expected: all tests PASS.

- [x] **Step 9: Commit the priority model and server validation**

```bash
git add public/rule-priorities.js src/app.js test/rule-priorities.test.js test/app.test.js
git commit -m "feat: constrain automation rule priorities"
```

---

### Task 2: Priority select and user-facing labels

**Files:**
- Modify: `public/index.html:538-546`
- Modify: `public/app.js:1-8, 755-775, 1501-1590`
- Modify: `test/ui-copy.test.js:1-60`

**Interfaces:**
- Consumes: `DEFAULT_RULE_PRIORITY`, `RULE_PRIORITY_ERROR`, `isRulePriority`, and `rulePriorityLabel` from `public/rule-priorities.js`.
- Produces: A required `select[name="priority"]` whose submitted value remains numeric after `normalizedRuleValues`.

- [x] **Step 1: Write a failing UI contract test**

Add this test to `test/ui-copy.test.js`:

```js
test('automation rules use fixed priority labels', () => {
  assert.match(html, /<select name="priority" required>[\s\S]*<option value="40">Low<\/option>[\s\S]*<option value="30" selected>Medium<\/option>[\s\S]*<option value="20">High<\/option>[\s\S]*<option value="10">Critical<\/option>[\s\S]*<\/select>/);
  assert.doesNotMatch(html, /name="priority" type="number"/);
  assert.match(app, /rulePriorityLabel\(rule\.priority\)/);
  assert.match(app, /isRulePriority\(values\.priority\)/);
  assert.match(app, /String\(DEFAULT_RULE_PRIORITY\)/);
});
```

- [x] **Step 2: Run the UI test and verify it fails**

Run: `node --test test/ui-copy.test.js`

Expected: FAIL because the form still has a numeric input and rule cards display numeric priorities.

- [x] **Step 3: Replace the numeric field with the required select**

Replace the priority input in `public/index.html` with:

```html
<select name="priority" required>
  <option value="40">Low</option>
  <option value="30" selected>Medium</option>
  <option value="20">High</option>
  <option value="10">Critical</option>
</select>
```

- [x] **Step 4: Use the shared priority helpers in the browser**

Extend the imports at the top of `public/app.js`:

```js
import { overviewPreview } from './overview-model.js';
import {
  DEFAULT_RULE_PRIORITY,
  RULE_PRIORITY_ERROR,
  isRulePriority,
  rulePriorityLabel,
} from './rule-priorities.js';
```

Change the rule metadata line in `renderRule` to:

```js
node('p', '', `${rulePriorityLabel(rule.priority)} priority · ${rule.enabled ? 'Active' : 'Paused'}`)
```

Change the priority validation in `validateRuleValues` to:

```js
if (!isRulePriority(values.priority)) {
  fields.priority = RULE_PRIORITY_ERROR;
}
```

Change the new-rule default in `openRuleDialog` to:

```js
elements.ruleForm.elements.namedItem('priority').value = String(DEFAULT_RULE_PRIORITY);
```

- [x] **Step 5: Run UI and priority tests**

Run: `node --test test/ui-copy.test.js test/rule-priorities.test.js`

Expected: all tests PASS.

- [x] **Step 6: Commit the priority UI**

```bash
git add public/index.html public/app.js test/ui-copy.test.js
git commit -m "feat: add rule priority options"
```

---

### Task 3: Content-adaptive aligned overview cards

**Files:**
- Modify: `public/styles.css:1254-1284, 2338-2350`
- Modify: `test/ui-copy.test.js:48-57`

**Interfaces:**
- Consumes: Existing `.dashboard-layout.overview-view`, `.queue-panel`, `.right-rail`, `#rules-panel`, `.email-list`, and `#rule-list` elements.
- Produces: Equal-height desktop cards whose height is derived from content, plus independent natural-height stacked cards.

- [x] **Step 1: Replace the fixed-height CSS assertion with failing adaptive-layout assertions**

Replace the overview-card layout test in `test/ui-copy.test.js` with:

```js
test('DepAdmin overview cards align without a fixed height and stack responsively', () => {
  assert.doesNotMatch(styles, /--overview-card-height/);
  assert.doesNotMatch(styles, /height:\s*var\(--overview-card-height\)/);
  assert.match(styles, /\.dashboard-layout\.overview-view\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*align-items:\s*stretch/s);
  assert.match(styles, /\.dashboard-layout\.overview-view #rules-panel\s*\{[^}]*height:\s*100%/s);
  assert.match(styles, /\.overview-card-footer\s*\{/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*\.dashboard-layout\.overview-view\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*align-items:\s*start/s);
});
```

- [x] **Step 2: Run the UI test and verify it fails**

Run: `node --test test/ui-copy.test.js`

Expected: FAIL because `--overview-card-height: 660px` is still present.

- [x] **Step 3: Replace the fixed-height overview rules with content-derived stretching**

Replace the current overview-specific block in `public/styles.css` with:

```css
.dashboard-layout.overview-view {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
}

.dashboard-layout.overview-view .queue-panel,
.dashboard-layout.overview-view #rules-panel {
  display: flex;
  flex-direction: column;
}

.dashboard-layout.overview-view .right-rail { align-self: stretch; }
.dashboard-layout.overview-view #rules-panel { height: 100%; }

.dashboard-layout.overview-view .email-list,
.dashboard-layout.overview-view #rule-list {
  min-height: 0;
  flex: 1;
}
```

Update the existing 1120px media-query rules to:

```css
.dashboard-layout.overview-view {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}
.dashboard-layout.overview-view .right-rail,
.dashboard-layout.overview-view #rules-panel { height: auto; }
.dashboard-layout.overview-view .email-list,
.dashboard-layout.overview-view #rule-list { overflow: visible; }
```

- [x] **Step 4: Run the UI contract tests**

Run: `node --test test/ui-copy.test.js`

Expected: all tests PASS.

- [x] **Step 5: Commit the adaptive layout**

```bash
git add public/styles.css test/ui-copy.test.js
git commit -m "fix: reduce overview card whitespace"
```

---

### Task 4: Regression and local browser verification

**Files:**
- Verify: `public/index.html`
- Verify: `public/app.js`
- Verify: `public/styles.css`
- Verify: `src/app.js`
- Verify: `public/rule-priorities.js`
- Verify: `test/app.test.js`
- Verify: `test/rule-priorities.test.js`
- Verify: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: The complete implementation from Tasks 1-3.
- Produces: A locally verified DepAdmin overview and passing regression suite.

- [x] **Step 1: Run the focused tests together**

Run: `node --test test/rule-priorities.test.js test/ui-copy.test.js test/app.test.js`

Expected: all focused tests PASS with no open handles.

- [x] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all repository tests PASS.

- [x] **Step 3: Verify the desktop overview in the local browser**

Open `http://localhost:3000`, sign in as a DepAdmin, and open Overview. Confirm:

- Unassigned inbox and Automation rules remain equal width.
- Both card bottoms align when side by side.
- Neither card reserves 660px when its previews need less space.
- Each preview still shows no more than five entries.
- `View all` still appears only when the corresponding total exceeds five.

- [x] **Step 4: Verify the rule dialog and labels**

Open **New rule** and confirm the priority field contains exactly Low, Medium, High, and Critical with Medium selected. Close without saving. Confirm existing rule cards show a word label followed by `priority`, never a raw priority number.

- [x] **Step 5: Verify the stacked layout**

Resize the local browser below 1120px. Confirm the cards stack, each takes its natural height, and no email row, rule action, footer, or `View all` button is clipped.

- [x] **Step 6: Review the final diff for scope and accidental secret output**

Run: `git diff --check && git diff -- public/rule-priorities.js public/index.html public/app.js public/styles.css src/app.js test/rule-priorities.test.js test/ui-copy.test.js test/app.test.js`

Expected: no whitespace errors, no credential values, and no changes outside the approved overview and priority behavior.
