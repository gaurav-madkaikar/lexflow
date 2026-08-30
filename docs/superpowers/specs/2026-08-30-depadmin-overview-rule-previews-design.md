# DepAdmin Overview and Automation Rule Previews

## Summary

Add a dedicated `Overview` landing view for DepAdmins. The overview presents the department's unassigned inbox and automation rules side by side without replacing the existing full Inbox or Automation Rules sections.

The two overview cards use matching dimensions and show at most five compact entries each. When a collection contains more than five entries, its card provides a `View all` action that opens the corresponding full section.

## Scope

- DepAdmins only.
- No database, Microsoft Graph, synchronization, or API changes.
- No change to OrgAdmin, PlatformAdmin, or Member navigation and visibility.
- Preserve the existing department boundary: rule and email data continue to come from the authenticated DepAdmin's headed department only.

## Navigation

- Add `Overview` as the first item in DepAdmin workspace navigation.
- Make `Overview` the default DepAdmin view after sign-in and whenever the current view is not valid for that role.
- Retain the existing `Inbox`, `Assigned`, `Completed`, `Automation rules`, `Activity`, and `Notifications` items.
- `View all` from Unassigned inbox opens `Inbox` and marks that navigation item active.
- `View all` from Automation rules opens `Automation rules` and marks that navigation item active.

## Overview layout

The existing DepAdmin hero and summary metrics remain above the overview content. Below them, render an overview grid containing:

1. `Unassigned inbox`
2. `Automation rules`

At desktop widths where the cards are side by side:

- use two equal-width columns;
- give both cards the same fixed 660px height;
- keep card headers and footers aligned; and
- clamp compact row content so neither card expands beyond the shared height.

Below the existing single-column breakpoint, stack the cards at full width. The five-entry cap remains, but card height may grow as needed to avoid clipping controls or text at narrow widths.

Each card has a stable footer. When the total is five or fewer, the footer reports `Showing all N`. When the total exceeds five, it contains `View all N` as a button. This keeps the cards aligned without displaying an inactive or misleading control.

## Unassigned inbox preview

- Sort unassigned messages by received time, newest first, matching the full Inbox section.
- Render at most the first five.
- Use a compact overview row with subject, sender, received time, source, and unassigned status.
- Omit body preview and assignee details from the overview row to keep row heights bounded; those details remain available in the full Inbox and email dialog.
- Selecting a preview row opens the existing email-detail dialog.
- If there are no messages, show the existing empty-inbox treatment within the fixed card body.

## Automation rules preview

- Sort rules by ascending priority and then ID, matching the full Automation Rules section.
- Render at most the first five.
- Show rule name, compact matching criteria, assignee, priority, and enabled/paused status.
- Retain the existing Edit, Pause/Enable, and Delete actions for each previewed rule.
- Retain the `New rule` button in the card header and reuse the existing rule dialog and validation.
- If there are no rules, show the current empty state and keep `New rule` available.

The dedicated Automation Rules section continues to show every rule with the same actions. Overview and full-section interactions operate on the same in-memory bootstrap data and existing department-scoped endpoints, so updates immediately appear in both views after the normal bootstrap refresh.

## Authorization and errors

- The overview is rendered only when the bootstrap user role is `dep_admin`.
- No rule or email data is added to OrgAdmin, PlatformAdmin, or Member bootstrap payloads.
- Existing API checks continue to require the current department head and constrain all reads and mutations by both `organization_id` and `department_id`.
- Rule form validation remains inline in the dialog. Toggle and deletion failures continue to use the existing toast treatment.

## Testing

- Verify DepAdmin navigation contains Overview and that it becomes the default landing view.
- Verify other roles cannot render or navigate to Overview.
- Verify both overview cards render with the shared layout class and a five-entry cap.
- Verify `View all` is absent at five entries and present at six entries.
- Verify each `View all` action opens its full section.
- Verify rule creation, editing, enable/pause, deletion, and email-detail opening still use the existing controls.
- Retain and run the existing API tests for department-scoped rule access and cross-department isolation.
- Check the equal two-column layout at desktop width and the unclipped stacked layout at narrow width.
