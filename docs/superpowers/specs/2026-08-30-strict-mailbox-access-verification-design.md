# Strict Mailbox Access Verification

## Goal

Prevent a member from being added to or moved into a department unless LexFlow can verify the member’s required access to that department’s shared mailbox.

## Behavior

- Remove the mailbox-access guidance message from department cards.
- Department creation remains available and requires a valid shared mailbox address.
- Member creation into a department and member department moves require a configured mailbox-access verifier.
- The verifier must confirm the user has the required shared-mailbox permissions before the operation commits.
- A missing verifier, verifier error, or missing required permission rejects the operation without changing membership.
- LexFlow does not grant or revoke Exchange permissions.
- Successful and failed checks are recorded with organization, user, department, mailbox, result, and timestamp.

## Verification boundary

The application uses a verifier interface rather than treating app-only mailbox-read access as proof of user delegation. The production adapter is expected to use authoritative Exchange permission data, such as Exchange Online mailbox and recipient permission checks. The verifier reports whether required permissions are present; it does not mutate Exchange configuration.

## API and UI

- Member add and department move endpoints invoke the verifier before database mutation.
- The existing visible error components show concise setup, permission, or verifier-failure messages.
- Department cards show mailbox and current verification status without the long Exchange-admin guidance paragraph.
- API tests inject deterministic verifier results; production configuration determines whether the verifier is available.

## Testing

- Missing verifier rejects member assignment.
- Verifier-confirmed access permits assignment.
- Missing Full Access or Send As rejects assignment atomically.
- Verifier failures are recorded and do not change membership.
- Department creation still works with a required mailbox.
- Existing organization isolation and OrgAdmin authorization remain enforced.
- Existing workflow, sync, assignment, and notification tests continue to pass.
