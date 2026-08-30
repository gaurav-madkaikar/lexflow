# Strict Mailbox Access Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require verified shared-mailbox permissions before adding or moving a member into a department.

**Architecture:** Add an injected verifier interface to the workspace service and pass it from the application routes. The verifier returns a deterministic permission result; missing configuration or failed checks reject the mutation before the SQLite transaction changes membership. Keep the existing event table for audit results and simplify the department UI to show only mailbox/status information and concise errors.

**Tech Stack:** Node.js, Express, SQLite, vanilla JavaScript, Node test runner.

## Global Constraints

- LexFlow must not grant or revoke Exchange permissions.
- Missing verifier configuration must reject member assignment and movement.
- Missing required permissions must reject the mutation atomically.
- Department creation remains available with a required mailbox.
- Preserve organization isolation, OrgAdmin authorization, and the existing UI style.

---

### Task 1: Add the mailbox verifier contract and configuration

**Files:**
- Create: `src/mailbox-access.js`
- Modify: `src/config.js`
- Modify: `src/server.js`
- Test: `test/workspace.test.js`

**Interfaces:**
- `createMailboxAccessVerifier(config)` returns `{ configured, verify({ organizationId, user, mailbox, requiredPermissions }) }`.
- `verify` returns `{ status: 'confirmed'|'issue'|'not_verified', message, missingPermissions }`.

- [ ] **Step 1: Add failing tests** for confirmed access, missing permissions, verifier errors, and missing configuration.
- [ ] **Step 2: Implement the verifier adapter.** Support a configured HTTP verifier endpoint with a server-side shared secret; fail closed when configuration is absent or the endpoint response is invalid. Do not send passwords or tokens.
- [ ] **Step 3: Add configuration fields and construct the verifier in the server.**
- [ ] **Step 4: Run focused verifier tests.**

### Task 2: Enforce verification on member assignment and movement

**Files:**
- Modify: `src/workspace.js`
- Modify: `src/app.js`
- Test: `test/workspace.test.js`
- Test: `test/app.test.js`

**Interfaces:**
- `createMember` accepts an optional department ID and verifier.
- `moveMemberToDepartment` accepts a verifier and performs verification before updating the user.

- [ ] **Step 1: Add failing tests** proving unconfigured/failed verification leaves membership unchanged and confirmed verification permits assignment/movement.
- [ ] **Step 2: Implement verification before database mutation.** Use the member email/object identity, target mailbox, and required permissions `FullAccess` and `SendAs`; record the result in `department_access_events`.
- [ ] **Step 3: Wire the verifier into member creation and movement routes.**
- [ ] **Step 4: Return concise safe errors and run focused tests.**

### Task 3: Simplify the department UI

**Files:**
- Modify: `public/app.js`
- Modify: `public/index.html` only if needed
- Modify: `public/styles.css` only if needed

- [ ] **Step 1: Remove the long Exchange administrator guidance text from department cards.**
- [ ] **Step 2: Keep mailbox/status visible and show concise API errors in the existing form/toast areas.**
- [ ] **Step 3: Ensure member movement refreshes status after a verified operation.**
- [ ] **Step 4: Run `node --check public/app.js`.**

### Task 4: Regression and local verification

- [ ] **Step 1: Run `npm test`.**
- [ ] **Step 2: Run `git diff --check` and syntax checks.**
- [ ] **Step 3: Restart the local server using the isolated test database.**
- [ ] **Step 4: Verify department UI and assignment error behavior at `http://localhost:3000/`.**
