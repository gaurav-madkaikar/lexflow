import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { OVERVIEW_PREVIEW_LIMIT, overviewPreview } from '../public/overview-model.js';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const charts = readFileSync(new URL('../public/metrics-charts.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('OrgAdmin settings use a Microsoft Graph health panel', () => {
  assert.match(html, /Microsoft Graph integration/);
  assert.doesNotMatch(html, />Email connections</);
  assert.match(app, /Tenant consent/);
  assert.match(app, /Shared mailboxes/);
  assert.match(app, /Last successful sync/);
  assert.match(app, /In Progress/);
  assert.match(styles, /\.integration-spinner\s*\{/);
  assert.doesNotMatch(app, /node\('p', 'integration-error'/);
});

test('global feedback replaces inline Graph outcomes and Members hide mailbox status', () => {
  assert.match(html, /id="toast-region" aria-label="Notifications"/);
  assert.doesNotMatch(html, /id="integration-feedback"/);
  assert.match(app, /createFeedbackQueue\(\{ onChange: renderFeedback \}\)/);
  assert.match(app, /const hideMailboxStatus = user\.role === 'member'/);
  assert.match(app, /\.mailbox-card'\)\.hidden = hideMailboxStatus/);
  assert.match(app, /elements\.modeChip\.hidden = hideMailboxStatus/);
  assert.match(app, /setText\(elements\.sidebarSync, user\.role === 'dep_admin'/);
});

test('account menu exposes theme and sound controls with success-only hooks', () => {
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
  assert.match(html, /<script src="\/vendor\/chart\.js"><\/script>\s*<script type="module" src="\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+src="\/vendor\/animejs\.js"/);
});

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

test('Entra login uses shared workspace tokens instead of an isolated blue theme', () => {
  assert.match(styles, /\.login-workspace-shell\s*\{[^}]*background:\s*var\(--color-canvas\)/s);
  assert.match(styles, /\.login-brand-rail\s*\{[^}]*background:\s*var\(--color-card\)/s);
  assert.match(styles, /\.login-main-surface\s*\{[^}]*background:\s*var\(--color-canvas\)/s);
  assert.match(styles, /\.login-card \.login-submit\s*\{[^}]*background:\s*var\(--color-coral\)/s);
  assert.match(styles, /\.login-route-line i\s*\{[^}]*var\(--color-coral\)/s);
  assert.doesNotMatch(styles, /--login-blue|--login-cyan|#2188ff|#68d7ff|#005bea|#32b7ff/i);
  assert.doesNotMatch(styles, /\.login-atmosphere|\.login-aurora|\.login-pointer-glow/);
});

test('workspace-aligned login stacks responsively and respects reduced motion', () => {
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.login-workspace-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.login-brand-rail\s*\{[^}]*border-right:\s*0/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.login-route-line i[^}]*animation:\s*none !important/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.metric:hover/s);
});

test('workspace-aligned login avoids decorative status copy and keeps the restrained hero type', () => {
  assert.doesNotMatch(html, /Systems operational|Protected workspace|Intelligent mailbox orchestration/);
  assert.match(styles, /\.login-statement\s*\{[^}]*font-family:\s*var\(--font-ui\)[^}]*font-weight:\s*500/s);
  assert.match(styles, /\.login-main-surface\s*\{[^}]*grid-template-rows:\s*1fr/s);
});

test('OrgAdmin people controls live on a collapsible Team page', () => {
  assert.match(html, /data-view="departments">[\s\S]*?<span>Team<\/span>/);
  assert.match(html, /<h2 id="departments-panel-title">Team<\/h2>/);
  assert.equal((html.match(/id="member-form"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /id="department-form"/);
  assert.match(html, /id="settings-admin-list"/);
  assert.match(html, /id="department-leads-list"/);
  assert.match(html, /data-view-link="departments">Manage team<\/button>/);
  assert.match(app, /teamGroups\(\{ departments, members \}\)/);
  assert.match(app, /node\('details', `department-management-card team-group/);
  assert.match(app, /usernameFromEmail\(department\.headUser\?\.email\)/);
  assert.match(styles, /\.team-group-summary\s*\{/);
  assert.match(styles, /\.department-member-controls\s*\{/);
});

test('asynchronous failures use the global safe reporter instead of silent catches', () => {
  assert.match(app, /function reportError\(error, fallback/);
  assert.match(app, /function reportPollingFailure\(error\)/);
  assert.doesNotMatch(app, /\.catch\(\(\) => \{\}\)/);
  assert.match(app, /window\.addEventListener\('unhandledrejection'/);
  assert.match(app, /window\.addEventListener\('error'/);
  assert.match(app, /Notification marked as read\./);
});

test('department cards do not claim mailbox access verification', () => {
  assert.doesNotMatch(app, /Access confirmed|Access issue reported|Not verified/);
  assert.doesNotMatch(app, /shared-mailbox access has been confirmed/);
});

test('DepAdmin overview provides bounded inbox and rule previews', () => {
  assert.match(html, /data-view="overview"/);
  assert.match(html, /id="inbox-overview-footer"/);
  assert.match(html, /id="rules-overview-footer"/);
  assert.match(html, /data-overview-view="inbox"/);
  assert.match(html, /data-overview-view="rules"/);
  assert.match(app, /dep_admin: \['overview', 'inbox', 'assigned', 'completed', 'rules', 'activity', 'notifications', 'metrics'\]/);
  assert.match(app, /document\.querySelectorAll\('\[data-overview-view\]'\)/);
  assert.doesNotMatch(app, /(?:platform_admin|org_admin|member): \[[^\]]*'overview'/);
  assert.equal(OVERVIEW_PREVIEW_LIMIT, 5);
});

test('all roles receive an accessible, locally bundled Metrics module', () => {
  assert.equal((html.match(/data-view="metrics"/g) ?? []).length, 4);
  assert.match(html, /id="metrics-page"[^>]*aria-labelledby="metrics-page-title"/);
  assert.match(html, /id="metrics-completeness"/);
  assert.equal((html.match(/class="card metrics-chart-card"/g) ?? []).length, 2);
  assert.equal((html.match(/class="metrics-chart-empty"/g) ?? []).length, 2);
  assert.match(html, /No data available for this period/);
  assert.equal((html.match(/>View data<\/summary>/g) ?? []).length, 2);
  assert.match(html, /<script src="\/vendor\/chart\.js"><\/script>\s*<script type="module" src="\/app\.js"><\/script>/);
  assert.match(app, /createMetricsView\(/);
  assert.match(styles, /\.metrics-chart-grid\s*\{/);
  assert.match(styles, /\.metrics-canvas-wrap\s*\{[^}]*height:\s*280px/s);
  assert.match(styles, /\.metrics-canvas-wrap\s*\{[^}]*flex:\s*0 0 280px/s);
  assert.match(charts, /plot\.hasData/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.metrics-refresh\[disabled\] \.icon/);
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

test('automation rules use fixed priority labels', () => {
  assert.match(html, /<select name="priority" required>[\s\S]*<option value="40">Low<\/option>[\s\S]*<option value="30" selected>Medium<\/option>[\s\S]*<option value="20">High<\/option>[\s\S]*<option value="10">Critical<\/option>[\s\S]*<\/select>/);
  assert.doesNotMatch(html, /name="priority" type="number"/);
  assert.match(app, /rulePriorityLabel\(rule\.priority\)/);
  assert.match(app, /isRulePriority\(values\.priority\)/);
  assert.match(app, /String\(DEFAULT_RULE_PRIORITY\)/);
});

test('automation rules expose strict attachment matching', () => {
  assert.match(html, /type="checkbox" name="hasAttachments"/);
  assert.match(html, /Off matches only email threads without attachments\./);
  assert.match(app, /rule\.hasAttachments \? 'Has attachment' : 'No attachments'/);
});

test('DepAdmin overview cards align without a fixed height and stack responsively', () => {
  assert.doesNotMatch(styles, /--overview-card-height/);
  assert.doesNotMatch(styles, /height:\s*var\(--overview-card-height\)/);
  assert.match(styles, /\.dashboard-layout\.overview-view\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*align-items:\s*stretch/s);
  assert.match(styles, /\.dashboard-layout\.overview-view #rules-panel\s*\{[^}]*height:\s*100%/s);
  assert.match(styles, /\.overview-card-footer\s*\{/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*\.dashboard-layout\.overview-view\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*align-items:\s*start/s);
});

test('Outlook email dialogs prepare safe links without applying stale responses', () => {
  assert.match(html, /id="email-link-error"[^>]*role="alert"[^>]*hidden/);
  assert.match(app, /Preparing Outlook link…/);
  assert.match(app, /`\/api\/emails\/\$\{email\.id\}\/open-link`/);
  assert.match(app, /emailLinkRequestId/);
  assert.match(app, /requestId !== state\.emailLinkRequestId/);
  assert.match(app, /state\.selectedEmailId !== email\.id/);
});
