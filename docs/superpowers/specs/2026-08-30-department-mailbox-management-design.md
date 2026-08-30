# Department Mailbox Management

## Goal

Allow OrgAdmins to manage departments that each have one required shared mailbox, view department members, move members between departments, and record mailbox-access warnings without granting or revoking Exchange permissions.

## Data model

- Add a required organization-scoped `shared_mailbox` field to departments.
- Add an organization-scoped `department_id` relationship for users.
- Migrate existing users from department-name text to department IDs without losing assignments.
- Keep one department per member and zero or more members per department.
- Enforce organization-scoped department and mailbox uniqueness.

## UI

Add a **Departments** tab under Workspace navigation using the existing visual language. OrgAdmins can create and edit departments, see each department’s members, and move members between departments. Department forms require a name and shared mailbox address.

The department view displays mailbox access status as `Not verified`, `Access confirmed`, or `Access issue reported`, plus any recorded guidance for Exchange administrators.

## Mailbox access behavior

LexFlow does not grant or revoke Exchange permissions in this phase. When a department is created or a member moves, LexFlow records the configured mailbox relationship and performs a best-effort access check only when the configured connector supports it. If verification is unavailable, it records `Not verified`; known failures are recorded and shown in the UI. Exchange administrators remain responsible for Full Access and Send As permissions.

Department moves record an audit event containing the member, previous department/mailbox, and new department/mailbox.

## API and authorization

- Add organization-scoped department CRUD endpoints.
- Add a department member listing endpoint.
- Add an OrgAdmin-only member department-move endpoint.
- Validate mailbox addresses and organization ownership on every route.
- Preserve existing OrgAdmin-only workflow administration and member authorization.

## Testing

- Department creation requires a valid mailbox and rejects duplicates.
- Department edits preserve organization isolation.
- Existing department assignments migrate correctly.
- OrgAdmins can list department members and move members.
- Members cannot manage departments or move users.
- Moves record the old/new mailbox context and access status.
- Cross-tenant department reads and writes are hidden or rejected.
- Existing workflow, assignment, notification, and sync tests continue to pass.
