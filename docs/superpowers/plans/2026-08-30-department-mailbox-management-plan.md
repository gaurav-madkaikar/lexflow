# Department Mailbox Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give OrgAdmins a Workspace Departments tab where every department has a required shared mailbox, members can be viewed and moved, and mailbox access issues are recorded without changing Exchange permissions.

**Architecture:** Extend the existing organization-scoped SQLite department model with a normalized mailbox address and user department foreign key, migrating existing text assignments. Add focused workspace service methods and OrgAdmin routes for department CRUD, member listing, moves, and access-status events. Add a new UI panel using the existing navigation, cards, forms, and error components.

**Tech Stack:** Node.js, Express, SQLite, vanilla JavaScript, HTML/CSS, Node test runner.

## Global Constraints

- Every department must have one required shared mailbox.
- Members belong to one department or no department.
- LexFlow only validates/logs mailbox access; it does not grant or revoke Exchange permissions.
- All department and member operations are organization-scoped and OrgAdmin-only.
- Preserve the existing UI visual language and existing workflow behavior.

---

### Task 1: Migrate and extend the department data model

**Files:**
- Modify: `src/db.js`
- Modify: `src/workspace.js`
- Test: `test/workspace.test.js`

**Interfaces:**
- Departments expose `{ id, name, sharedMailbox, accessStatus, accessMessage, createdAt }`.
- Users use `department_id` as the canonical assignment while retaining the existing department name for compatibility during migration.

- [x] **Step 1: Add failing migration and service tests** for required mailbox fields, migration of existing department text assignments, department-scoped uniqueness, and default access status.
- [x] **Step 2: Run `node --test test/workspace.test.js` and confirm the new tests fail.**
- [x] **Step 3: Add `shared_mailbox`, `access_status`, and `access_message` to departments and `department_id` to users with compatibility migration.** Map matching existing department names to IDs and leave unmatched members unassigned.
- [x] **Step 4: Update department listing/creation/editing to normalize mailbox addresses, enforce required values, and return access metadata.**
- [x] **Step 5: Run the focused workspace tests and confirm they pass.**

### Task 2: Add organization-scoped department APIs and access events

**Files:**
- Modify: `src/workspace.js`
- Modify: `src/app.js`
- Modify: `src/db.js` if an audit table is required by the migration
- Test: `test/workspace.test.js`
- Test: `test/app.test.js`

**Interfaces:**
- `GET /api/departments` lists departments for the signed-in organization.
- `POST /api/departments` accepts `{ name, sharedMailbox }`.
- `PATCH /api/departments/:id` accepts `{ name, sharedMailbox }`.
- `GET /api/departments/:id/members` lists only members in the signed-in organization and department.
- `POST /api/team/:id/department` accepts `{ departmentId }` and records the move/access review.

- [x] **Step 1: Add failing route/service tests** for CRUD, required mailbox validation, cross-tenant hiding, member listing, member moves, and access-event recording.
- [x] **Step 2: Implement OrgAdmin-only routes using existing `requireOrgAdmin` middleware and organization filters.**
- [x] **Step 3: Implement a best-effort access-review boundary that records `not_verified` unless a supported checker is available; never claim access was granted.**
- [x] **Step 4: Record old/new department and mailbox context for moves and return the updated member and department status.**
- [x] **Step 5: Run focused app/workspace tests and confirm they pass.**

### Task 3: Build the Workspace Departments tab

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

**Interfaces:**
- OrgAdmins see a Departments item in Workspace navigation.
- The panel supports department create/edit, department member display, member moves, and visible mailbox access status/messages.
- Existing Settings department controls remain functional or are reduced to a compatible link without duplicating conflicting behavior.

- [x] **Step 1: Add the Departments navigation item and panel using the current card/form styles.**
- [x] **Step 2: Render department cards with mailbox, access status, and members.**
- [x] **Step 3: Add create/edit forms requiring a department name and shared mailbox.**
- [x] **Step 4: Add member move controls and display access-review guidance after moves.**
- [x] **Step 5: Wire API errors to existing visible form/toast error components and run `node --check public/app.js`.**

### Task 4: Regression verification and local smoke test

**Files:**
- Modify: `test/workspace.test.js`, `test/app.test.js`, or documentation only if verification exposes a necessary correction

- [x] **Step 1: Run `npm test` and confirm all existing and new tests pass.**
- [x] **Step 2: Run `git diff --check` and JavaScript syntax checks.**
- [x] **Step 3: Restart the local server using the isolated test database.**
- [ ] **Step 4: Verify the Workspace Departments tab, required mailbox form, member listing, and move feedback at `http://localhost:3000/`.**
