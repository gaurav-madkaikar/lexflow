# Edit Initial OrgAdmin Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow PlatformAdmins to replace an organization’s initial OrgAdmin email and Entra object ID in place.

**Architecture:** Extend the existing organization PATCH operation to validate and atomically update the organization’s OrgAdmin membership. Extend the existing organization edit form to display and submit those membership fields, while keeping the Entra tenant ID immutable and invalidating organization sessions after replacement.

**Tech Stack:** Node.js, Express, SQLite, vanilla JavaScript, Node test runner.

## Global Constraints

- Preserve the existing UI design.
- The email must match the organization’s configured domain.
- The object ID must be a valid Entra GUID.
- Duplicate email or Entra identity conflicts must not partially update data.
- The Entra tenant ID remains immutable.

---

### Task 1: Extend the tenant identity update API

**Files:**
- Modify: `src/tenants.js`
- Modify: `src/app.js`
- Test: `test/tenants.test.js`

**Interfaces:**
- Update `updateOrganization({ db, organizationId, input, now })` to accept `initialAdminEmail` and `initialAdminObjectId`.
- Keep `PATCH /api/platform/organizations/:id` PlatformAdmin-only and pass the immutable current tenant ID plus the two identity fields.

- [x] **Step 1: Add failing tests** for successful replacement, role/status preservation, tenant ID preservation, invalid domain/object ID, duplicate identity conflict, missing OrgAdmin membership, session invalidation, and non-PlatformAdmin rejection.
- [x] **Step 2: Run `node --test test/tenants.test.js test/app.test.js` and confirm the new tests fail.**
- [x] **Step 3: Implement validation and an atomic membership replacement inside the existing transaction.** Find the organization’s OrgAdmin membership, normalize/validate both fields, update the membership, and delete organization sessions after success. Convert uniqueness failures into safe field-aware errors.
- [x] **Step 4: Update the route to pass the new fields while ignoring any client-supplied tenant ID.**
- [x] **Step 5: Run the focused tests and confirm they pass.**

### Task 2: Expose and submit the fields in the existing UI

**Files:**
- Modify: `public/app.js`
- Modify: `public/index.html` only if the existing fields cannot be reused for edit mode
- Test: `test/app.test.js` if request payload coverage belongs there

**Interfaces:**
- Organization edit mode populates `initialAdminEmail` and `initialAdminObjectId` from the organization membership data.
- Organization create mode retains its existing required fields and behavior.

- [x] **Step 1: Extend the PlatformAdmin bootstrap organization payload** to include the current initial OrgAdmin identity without exposing unrelated credentials.
- [x] **Step 2: Update edit-mode form population and visibility** so the two fields are shown and editable while the tenant ID remains read-only.
- [x] **Step 3: Include both fields in PATCH requests and keep them required during editing.**
- [x] **Step 4: Render returned API validation errors using the existing form error behavior.**
- [x] **Step 5: Run syntax checks with `node --check public/app.js`.**

### Task 3: Regression verification and local restart

**Files:**
- Modify: `test/tenants.test.js` and `test/app.test.js` only if test fixes are required

- [x] **Step 1: Run `npm test` and confirm all tests pass.**
- [x] **Step 2: Run `git diff --check`.**
- [x] **Step 3: Restart the local server with the existing isolated test database.**
- [ ] **Step 4: Refresh `http://localhost:3000/` and verify the organization edit form exposes both fields for `LexflowTest`.**
