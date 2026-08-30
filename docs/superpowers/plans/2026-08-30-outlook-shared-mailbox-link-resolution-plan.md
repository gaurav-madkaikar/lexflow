# Outlook Shared-Mailbox Link Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make “Open in Outlook” reliably open shared-mailbox messages while preserving immutable Graph IDs for synchronization.

**Architecture:** Add an on-demand resolver to the Outlook integration that maps the stored immutable message ID to a current regular-ID Graph `webLink`. Expose it through a tenant- and role-scoped API endpoint, then have the email dialog resolve Outlook links asynchronously with loading, inline-error, and stale-response handling.

**Tech Stack:** Node.js, Express, better-sqlite3, Microsoft Graph REST APIs, browser JavaScript, Node test runner.

## Global Constraints

- Preserve immutable provider IDs and existing synchronized URLs in the database.
- Use the existing Outlook application token and `Mail.Read`; add no Graph permission or schema migration.
- Keep OrgAdmin and PlatformAdmin email-blind.
- Return resource-hiding `404` responses for unauthorized or cross-scope email IDs.
- Never expose access tokens, Graph IDs, mailbox content, or raw upstream responses in errors or logs.
- Do not mutate or open a real mailbox message during verification.
- Preserve unrelated dirty-worktree changes.

---

## File Map

- Modify `src/outlook.js`: add Graph message-link resolution, URL validation, cache, and disconnect invalidation.
- Modify `src/app.js`: add scoped email lookup and `GET /api/emails/:id/open-link`.
- Modify `public/index.html`: add a dedicated inline link-resolution error element.
- Modify `public/app.js`: resolve Outlook links asynchronously and ignore stale results.
- Modify `public/styles.css`: keep loading/error presentation consistent with the existing dialog.
- Modify `test/outlook.test.js`: cover Graph lookup, matching, safety, cache, and invalidation.
- Modify `test/app.test.js`: cover role/tenant scoping and non-Outlook behavior.
- Modify `test/ui-copy.test.js`: protect dialog loading/error/stale-response contracts.

---

### Task 1: Resolve regular Outlook web links from immutable message IDs

**Files:**

- Modify: `src/outlook.js`
- Test: `test/outlook.test.js`

- [ ] Add a failing test that connects an organization, calls `resolveWebLink`, and supplies mocked Graph responses for an immutable lookup followed by a regular-ID query.
- [ ] Assert the first Graph call includes `Prefer: IdType="ImmutableId"` and selects `internetMessageId`, `subject`, and `receivedDateTime`.
- [ ] Assert the second call omits the immutable preference, OData-escapes apostrophes in `internetMessageId`, and returns the safe regular `webLink` whose subject and timestamp match the stored email.
- [ ] Run `node --test test/outlook.test.js` and confirm the new test fails because `resolveWebLink` does not exist.
- [ ] Add constants for the two-minute cache TTL and approved Outlook hosts.
- [ ] Add a URL validator that accepts only HTTPS links on `outlook.office.com` or `outlook.office365.com`.
- [ ] Add `resolveWebLink({ organizationId, mailboxAddress, immutableId, subject, receivedAt })` to the Outlook integration.
- [ ] Confirm an active organization connection exists and the mailbox belongs to one of its configured departments before requesting Graph.
- [ ] Retrieve the immutable message using the existing organization token and immutable-ID preference.
- [ ] Query the same mailbox without that preference using the escaped `internetMessageId`; prefer exact subject and received-time matches.
- [ ] Return concise exposed errors for unavailable messages, missing identifiers, failed Graph calls, unmatched candidates, and unsafe links.
- [ ] Cache only successful results by organization, normalized mailbox, and immutable ID for two minutes.
- [ ] Clear an organization's resolver cache when its Outlook integration disconnects.
- [ ] Add failing-then-passing tests for cache reuse, TTL expiry, disconnect invalidation, missing identifiers, upstream failure, and unsafe hosts.
- [ ] Run `node --test test/outlook.test.js` and confirm all Outlook integration tests pass.
- [ ] Commit only these files if they are isolated from pre-existing work: `git commit -m "fix: resolve shared mailbox Outlook links"`.

### Task 2: Add an authenticated and resource-hiding open-link endpoint

**Files:**

- Modify: `src/app.js`
- Test: `test/app.test.js`

- [ ] Add controlled Outlook and Gmail email rows to an app test fixture and inject an Outlook integration spy through the existing integration factory.
- [ ] Add failing tests proving the department's DepAdmin and the assigned Member can request the Outlook link.
- [ ] Add failing tests proving OrgAdmin, PlatformAdmin, another department's DepAdmin, another Member, and another organization receive `404`.
- [ ] Add a failing test proving a Gmail link is returned without calling the Outlook resolver.
- [ ] Run the focused app tests and confirm they fail because the route is missing.
- [ ] Add a scoped raw-email lookup that mirrors the existing email visibility rules: headed department for DepAdmin and own assignment for Member.
- [ ] Add a strict parser for `outlook:<normalized-mailbox>:<immutable-id>` and require it to match the row's mailbox address.
- [ ] Add `GET /api/emails/:id/open-link` after session middleware.
- [ ] Return the existing HTTP(S)-safe link directly for non-Outlook messages.
- [ ] Call `integrations.outlook.resolveWebLink` only for an authorized, structurally valid Outlook row and return `{ webUrl }`.
- [ ] Use the existing error middleware for safe resolver errors and resource-hiding `404` for inaccessible or malformed email resources.
- [ ] Run the focused app tests and confirm all role, tenant, provider, and resolver assertions pass.
- [ ] Commit only these files if isolated: `git commit -m "feat: expose scoped email open links"`.

### Task 3: Resolve Outlook links inside the email dialog

**Files:**

- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/ui-copy.test.js`

- [ ] Add failing UI contract assertions for the inline error element, `Preparing Outlook link…`, the open-link endpoint, and a request-generation stale-response guard.
- [ ] Run `node --test test/ui-copy.test.js` and confirm the assertions fail.
- [ ] Add a hidden `role="alert"` element next to the email dialog actions for safe link-resolution errors.
- [ ] Track an incrementing link request generation in UI state.
- [ ] When an Outlook email dialog opens, remove the current href, disable the action, label it `Preparing Outlook link…`, and request `/api/emails/:id/open-link`.
- [ ] On success, re-run the existing HTTP(S) URL safety check, set the href, enable the action, and label it `Open in Outlook`.
- [ ] On failure, keep the link unavailable and display only the exposed API message in the inline alert.
- [ ] Invalidate pending requests when the dialog closes, the user opens a different email, signs out, or returns to the login view.
- [ ] Keep Gmail and other safe direct links immediately available without calling the Outlook endpoint.
- [ ] Add minimal styling so the error uses existing dialog typography and spacing without changing the established UI design.
- [ ] Run `node --test test/ui-copy.test.js` and confirm the UI contract tests pass.
- [ ] Commit only these files if isolated: `git commit -m "fix: prepare Outlook links in email dialog"`.

### Task 4: Regression and local smoke verification

**Files:**

- Verify only; no production mailbox mutation.

- [ ] Run `npm test` and resolve any regressions attributable to this change.
- [ ] Start or restart the local app using its existing development command and configuration without printing environment values.
- [ ] Open `http://localhost:3000/` in the in-app browser.
- [ ] Verify an Outlook email dialog shows the preparing state, then either a usable `Open in Outlook` action or a safe inline error.
- [ ] Verify closing one email and opening another cannot apply the first request's result to the second dialog.
- [ ] Verify a Gmail/direct-link email remains immediately actionable.
- [ ] Verify the dialog and surrounding overview retain their existing dimensions and visual language.
- [ ] Inspect `git diff --check` and the focused diff for accidental secrets, raw message IDs, debug logging, placeholders, or unrelated edits.
- [ ] Report changed files, test results, local app status, and any verification limitation without reproducing real mailbox identifiers.

