# Trusted Department Assignment Design

## Goal

Allow an OrgAdmin to assign or move a member to a department without LexFlow verifying that member's Exchange shared-mailbox permissions. Department assignment is the OrgAdmin's confirmation that the member has the necessary mailbox access outside LexFlow.

This design supersedes the earlier strict mailbox-access verification requirement.

## Behavior

- Every department continues to require a valid shared-mailbox email address.
- An OrgAdmin can assign an eligible member to a department immediately.
- LexFlow does not call an Exchange permission verifier before assignment.
- LexFlow does not grant, revoke, inspect, or report individual mailbox permissions.
- Existing organization isolation, member eligibility, and department-head replacement protections remain unchanged.
- The first eligible member assigned to a headless department continues to become its DepAdmin.

If mailbox permissions are missing or incorrect, Exchange and Outlook remain the authoritative enforcement boundary. LexFlow does not claim that access was technically verified.

## API and domain changes

The department-move endpoint validates the authenticated OrgAdmin, organization, member, target department, and DepAdmin replacement constraints, then performs the move transaction. It no longer accepts or produces a mailbox-access verification result.

The member response will contain department identity and effective role only. Mailbox access status and mailbox access messages are removed from the assignment response.

The mailbox-access verifier dependency, runtime adapter, and related environment configuration are removed. Existing database access-status columns and historical event records remain dormant for backward compatibility; no destructive migration is introduced and no new verification events are written.

## UI changes

- Remove **Access confirmed**, **Not verified**, and **Access issue reported** badges from department cards.
- Remove copy telling OrgAdmins to wait for shared-mailbox access confirmation.
- Remove mailbox-verifier errors from member assignment flows.
- Preserve the current department cards, shared-mailbox labels, member selectors, DepAdmin controls, and visual styling.

## Error handling

Assignments can still fail for ordinary authorization and domain constraints, including cross-organization resources, invalid or disabled members, missing departments, or attempts to move a current DepAdmin without first selecting a replacement. Mailbox-permission configuration is no longer an application error.

## Documentation

Remove mailbox-verifier environment variables and deployment instructions from `.env.example` and the README. Document that OrgAdmins are responsible for ensuring department members have appropriate shared-mailbox access in Microsoft 365 before assignment.

## Verification

- An OrgAdmin can assign an unassigned member without a verifier configuration.
- An OrgAdmin can move a member between departments without a verifier call.
- No mailbox-access status or verifier error appears in the department UI.
- Shared mailbox remains required when creating or editing a department.
- DepAdmin replacement protection and first-member promotion still work.
- Cross-tenant assignment remains hidden or forbidden.
- Existing Graph synchronization, role isolation, workflow, alert, and notification tests continue to pass.

## Out of scope

- Checking, granting, or revoking Exchange mailbox permissions.
- Displaying an assumed or manually confirmed access badge.
- Destructively removing historical access-event data from existing databases.
