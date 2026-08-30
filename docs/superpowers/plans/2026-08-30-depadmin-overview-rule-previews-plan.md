# DepAdmin Overview and Automation Rule Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give DepAdmins a default Overview with equal-size five-item previews for unassigned email and automation rules, while preserving the full Inbox and Automation Rules sections.

**Architecture:** Reuse the existing queue panel, rules panel, dialogs, bootstrap data, and department-scoped endpoints. Add an `overview` presentation state that bounds both rendered collections to five items, exposes footer navigation to the existing full views, and applies an equal-card desktop layout without introducing duplicate state or backend behavior.

**Tech Stack:** Vanilla HTML, CSS, and browser JavaScript; Express bootstrap/API behavior already present; Node.js built-in test runner.

## Global Constraints

- DepAdmins only; do not expose email or rule data to OrgAdmins, PlatformAdmins, or Members.
- Show at most five entries per Overview card.
- Use two equal-width, fixed 660px cards when side by side.
- Stack at full width and allow intrinsic height below the existing 1120px single-column breakpoint.
- Keep full Inbox and Automation Rules sections and all existing rule actions.
- Do not change the database, Microsoft Graph integration, sync engine, or APIs.
- Preserve unrelated pre-existing worktree changes; stage only Overview-specific hunks if committing implementation work.

## File map

- Create `public/overview-model.js`: provide the pure, shared five-item preview calculation used by the browser and direct unit tests.
- Modify `public/index.html`: add Overview navigation and stable preview footers to the existing queue and rules panels.
- Modify `public/app.js`: add the Overview view, five-item rendering policy, compact-row modes, footer state, and View All navigation.
- Modify `public/styles.css`: add equal-card desktop layout, compact preview rows, aligned footers, and responsive stacking.
- Modify `test/ui-copy.test.js`: add focused source-level UI contracts for the Overview behavior and responsive dimensions.

---

### Task 1: Add the bounded DepAdmin Overview behavior

**Files:**
- Create: `public/overview-model.js`
- Modify: `test/ui-copy.test.js`
- Modify: `public/index.html:8-125`
- Modify: `public/index.html:280-325`
- Modify: `public/app.js:1-140`
- Modify: `public/app.js:390-410`
- Modify: `public/app.js:590-790`
- Modify: `public/app.js:1185-1250`
- Modify: `public/app.js:1290-1330`
- Modify: `public/app.js:1750-1830`

**Interfaces:**
- Consumes: existing `state.session.emails`, `state.session.rules`, `selectView(view)`, `renderEmailRow`, `renderRule`, `openRuleDialog`, and department-scoped rule endpoints.
- Produces: `overviewPreview(items)`, `OVERVIEW_PREVIEW_LIMIT`, the `overview` view, `renderOverviewFooter(...)`, compact rendering options, and `[data-overview-view]` controls used by Task 2 styling.

- [ ] **Step 1: Write the failing Overview contract test**

Import the pure model and extend `test/ui-copy.test.js` with:

```js
import { OVERVIEW_PREVIEW_LIMIT, overviewPreview } from '../public/overview-model.js';

test('DepAdmin overview provides bounded inbox and rule previews', () => {
  assert.match(html, /data-view="overview"/);
  assert.match(html, /id="inbox-overview-footer"/);
  assert.match(html, /id="rules-overview-footer"/);
  assert.match(html, /data-overview-view="inbox"/);
  assert.match(html, /data-overview-view="rules"/);
  assert.match(app, /dep_admin: \['overview', 'inbox', 'assigned', 'completed', 'rules', 'activity', 'notifications'\]/);
  assert.match(app, /document\.querySelectorAll\('\[data-overview-view\]'\)/);
  assert.doesNotMatch(app, /(?:platform_admin|org_admin|member): \[[^\]]*'overview'/);
  assert.equal(OVERVIEW_PREVIEW_LIMIT, 5);
});

test('overview preview exposes View all only above five entries', () => {
  const five = overviewPreview([1, 2, 3, 4, 5]);
  assert.deepEqual(five.items, [1, 2, 3, 4, 5]);
  assert.equal(five.hasMore, false);
  assert.equal(five.summary, 'Showing all 5');
  assert.equal(five.actionLabel, '');

  const six = overviewPreview([1, 2, 3, 4, 5, 6]);
  assert.deepEqual(six.items, [1, 2, 3, 4, 5]);
  assert.equal(six.hasMore, true);
  assert.equal(six.summary, 'Showing 5 of 6');
  assert.equal(six.actionLabel, 'View all 6');
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test test/ui-copy.test.js
```

Expected: FAIL because `public/overview-model.js` and the Overview navigation, footers, and listeners do not exist.

- [ ] **Step 3: Add Overview markup by reusing the existing panels**

In `public/index.html`, add an overview icon and the first DepAdmin navigation button:

```html
<symbol id="icon-overview" viewBox="0 0 24 24">
  <rect x="3" y="3" width="7" height="7" rx="2"/>
  <rect x="14" y="3" width="7" height="7" rx="2"/>
  <rect x="3" y="14" width="7" height="7" rx="2"/>
  <rect x="14" y="14" width="7" height="7" rx="2"/>
</symbol>
```

```html
<button class="nav-item" type="button" data-view="overview">
  <svg class="nav-icon" aria-hidden="true"><use href="#icon-overview"></use></svg>
  <span>Overview</span>
</button>
```

Change the final script to `<script type="module" src="/app.js"></script>` so `app.js` can import the pure preview model. Add stable footers after `#email-list` and `#rule-list` respectively. Keep them hidden outside Overview:

```html
<footer class="overview-card-footer" id="inbox-overview-footer" hidden>
  <span id="inbox-overview-summary">Showing all 0</span>
  <button class="small-button" type="button" data-overview-view="inbox" hidden>View all 0</button>
</footer>
```

```html
<footer class="overview-card-footer" id="rules-overview-footer" hidden>
  <span id="rules-overview-summary">Showing all 0</span>
  <button class="small-button" type="button" data-overview-view="rules" hidden>View all 0</button>
</footer>
```

- [ ] **Step 4: Implement the pure five-item preview model**

Create `public/overview-model.js`:

```js
export const OVERVIEW_PREVIEW_LIMIT = 5;

export function overviewPreview(items) {
  const collection = Array.isArray(items) ? items : [];
  const total = collection.length;
  const hasMore = total > OVERVIEW_PREVIEW_LIMIT;
  return {
    items: collection.slice(0, OVERVIEW_PREVIEW_LIMIT),
    total,
    hasMore,
    summary: hasMore
      ? `Showing ${OVERVIEW_PREVIEW_LIMIT} of ${total}`
      : `Showing all ${total}`,
    actionLabel: hasMore ? `View all ${total}` : '',
  };
}
```

This module has no DOM or application-state dependency and is directly executable by Node's test runner and the browser.

- [ ] **Step 5: Add Overview state and element references**

At the top of `public/app.js`, import the model and set the initial view:

```js
import { overviewPreview } from './overview-model.js';

const state = {
  session: null,
  view: 'overview',
  // existing fields remain unchanged
};
```

Add element references for both footers, summaries, and buttons. Reset `state.view` to `overview` on logout. Update role normalization:

```js
dep_admin: ['overview', 'inbox', 'assigned', 'completed', 'rules', 'activity', 'notifications'],
```

This keeps `overview` as the first valid DepAdmin view while other roles continue to normalize to their existing first view.

- [ ] **Step 6: Add compact Overview collection rendering**

Treat Overview as an unassigned-email view in `visibleEmails()`:

```js
const status = ['overview', 'inbox'].includes(state.view) ? 'unassigned' : state.view;
```

Allow `renderEmailRow` and `renderRule` to receive `{ compact = false }`. Add a `compact` class when true; omit the email body preview and unassigned-person block in compact email rows while retaining subject, sender, time, provider, department, and status.

Add a shared footer renderer:

```js
function renderOverviewFooter({ footer, summary, action, preview }) {
  const isOverview = state.view === 'overview';
  footer.hidden = !isOverview;
  if (!isOverview) return;

  setText(summary, preview.summary);
  action.hidden = !preview.hasMore;
  setText(action, preview.actionLabel);
}
```

In `renderEmails()`, retain the complete filtered collection for the footer and slice only the Overview presentation:

```js
const allEmails = visibleEmails();
const preview = overviewPreview(allEmails);
const emails = state.view === 'overview'
  ? preview.items
  : allEmails;
```

Add `overview` to the queue labels, render Overview rows with `{ compact: true }`, and pass `preview` to `renderOverviewFooter`.

In `renderRules()`, sort all rules first, slice only for Overview, render compact rules, and pass the complete rule count to the rules footer:

```js
const allRules = [...(state.session.rules ?? [])]
  .sort((left, right) => left.priority - right.priority || left.id - right.id);
const preview = overviewPreview(allRules);
const rules = state.view === 'overview'
  ? preview.items
  : allRules;
```

- [ ] **Step 7: Make Overview reuse both panels and full views**

Update `renderPanels()` around these predicates:

```js
const isOverview = isDepAdmin && state.view === 'overview';
const isQueue = ['dep_admin', 'member'].includes(state.session.user.role)
  && ['inbox', 'assigned', 'completed'].includes(state.view);
const isFocus = !isOverview && !isQueue;

elements.dashboardLayout.classList.toggle('overview-view', isOverview);
elements.dashboardLayout.classList.toggle('focus-view', isFocus);
elements.dashboardLayout.classList.toggle('single-column', !isOverview);
elements.queuePanel.hidden = !(isOverview || isQueue);
elements.rulesPanel.hidden = !isDepAdmin || !['overview', 'rules'].includes(state.view);
```

Keep hero and metrics visible for Overview. Add `overview: 'Overview'` to `renderHeader()` and leave search hidden there. In `render()`, continue calling both `renderEmails()` and `renderRules()` for DepAdmins so the shared panels stay synchronized.

- [ ] **Step 8: Wire View All to existing navigation**

Add one delegated setup beside the current nav listeners:

```js
document.querySelectorAll('[data-overview-view]').forEach(button => {
  button.addEventListener('click', () => selectView(button.dataset.overviewView));
});
```

The existing `selectView()` behavior supplies active navigation, scroll restoration, focus management, and full collection rendering.

- [ ] **Step 9: Run the focused UI test**

Run:

```bash
node --test test/ui-copy.test.js
```

Expected: PASS.

- [ ] **Step 10: Commit only Task 1 hunks**

Because these files already contain unrelated uncommitted work, interactively stage only the Overview markup, behavior, and test hunks:

```bash
git add public/overview-model.js
git add -p public/index.html public/app.js test/ui-copy.test.js
git diff --cached --check
git commit -m "feat: add bounded DepAdmin overview"
```

Expected: the staged diff contains no pre-existing tenant, Graph, department, or authentication changes.

---

### Task 2: Align and bound the Overview cards

**Files:**
- Modify: `test/ui-copy.test.js`
- Modify: `public/styles.css:1190-1340`
- Modify: `public/styles.css:1400-1640`
- Modify: `public/styles.css:2240-2280`

**Interfaces:**
- Consumes: `.overview-view`, `.compact`, `.overview-card-footer`, `#queue-panel`, and `#rules-panel` produced by Task 1.
- Produces: equal 660px desktop cards, compact fixed-height preview rows, stable footers, and unclipped responsive stacking.

- [ ] **Step 1: Write the failing layout contract test**

Read CSS in `test/ui-copy.test.js`:

```js
const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
```

Add:

```js
test('DepAdmin overview cards align and stack responsively', () => {
  assert.match(styles, /--overview-card-height:\s*660px/);
  assert.match(styles, /\.dashboard-layout\.overview-view\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /\.overview-card-footer\s*\{/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*\.dashboard-layout\.overview-view\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test test/ui-copy.test.js
```

Expected: FAIL because the Overview layout rules do not exist.

- [ ] **Step 3: Add equal desktop card sizing and aligned footers**

Add focused rules to `public/styles.css`:

```css
.dashboard-layout.overview-view {
  --overview-card-height: 660px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-layout.overview-view .queue-panel,
.dashboard-layout.overview-view .right-rail,
.dashboard-layout.overview-view #rules-panel {
  height: var(--overview-card-height);
}

.dashboard-layout.overview-view .queue-panel,
.dashboard-layout.overview-view #rules-panel {
  display: flex;
  flex-direction: column;
}

.dashboard-layout.overview-view .email-list,
.dashboard-layout.overview-view #rule-list {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.overview-card-footer {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
  padding: 10px 20px;
  color: var(--color-muted);
  border-top: 1px solid var(--color-line);
  font-size: 12px;
}
```

Style compact email and rule rows to fit five entries while preserving 44px action targets. Clamp rule criteria and metadata to one line; do not shrink action buttons below existing accessibility dimensions.

- [ ] **Step 4: Add responsive stacking without clipping**

Inside the existing `@media (max-width: 1120px)` block, add:

```css
.dashboard-layout.overview-view {
  grid-template-columns: minmax(0, 1fr);
}

.dashboard-layout.overview-view .queue-panel,
.dashboard-layout.overview-view .right-rail,
.dashboard-layout.overview-view #rules-panel {
  height: auto;
}

.dashboard-layout.overview-view .email-list,
.dashboard-layout.overview-view #rule-list {
  overflow: visible;
}
```

Keep the five-item rendering cap at every breakpoint. Existing mobile rule-action wrapping remains available because fixed height is removed when the cards stack.

- [ ] **Step 5: Run focused and full automated tests**

Run:

```bash
node --test test/ui-copy.test.js
npm test
```

Expected: both commands PASS, including existing cross-department rule-isolation tests.

- [ ] **Step 6: Perform the local DepAdmin browser smoke test**

Restart the app against `/private/tmp/lexflow-entra-ui-test.db`, sign in as `jsahoo@lexflow1.onmicrosoft.com`, and verify:

1. Overview is the first active navigation item.
2. Unassigned inbox and Automation rules are equal width and height on desktop.
3. Each card renders no more than five entries.
4. New rule opens the existing dialog and accepts only Legal department members.
5. View all opens Inbox or Automation rules when the corresponding total exceeds five.
6. The full sections show every item.
7. At a narrow viewport, cards stack without clipped text or controls.

- [ ] **Step 7: Commit only Task 2 hunks**

```bash
git add -p public/styles.css test/ui-copy.test.js
git diff --cached --check
git commit -m "style: align DepAdmin overview previews"
```

Expected: only Overview styling and its layout contract are staged.
