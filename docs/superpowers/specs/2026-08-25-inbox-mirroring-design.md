# Inbox Mirroring Design

## Goal

Keep the LexFlow dashboard aligned with each connected provider's Inbox by removing local work items when Outlook or Gmail explicitly reports that they are no longer in that Inbox.

## Approved behavior

LexFlow mirrors Inbox membership. Deleting, archiving, moving, or trashing an email removes it from the dashboard after the next successful incremental sync. Messages that remain in the provider Inbox remain in LexFlow.

The provider's explicit incremental events are authoritative:

- Microsoft Graph `@removed` entries from the Inbox delta feed remove the corresponding Outlook work item.
- Gmail `messagesDeleted` entries and `labelsRemoved` entries containing the `INBOX` label remove the corresponding Gmail work item.
- A later provider event that puts a message back in the Inbox imports it again through the existing new-message path.

The bounded 500-message Gmail bootstrap and expired-history recovery do not treat absence from the first page as deletion. An absent message might simply fall outside that bounded page, so snapshot reconciliation would risk deleting valid Inbox work.

LexFlow may already have Gmail or Outlook cursors created by versions that discarded removal events. To clean those existing stale rows safely, each live source performs one versioned membership reconciliation for its retained rows. Gmail retrieves each retained message and classifies a 404 or a valid response without `INBOX` as removed. Outlook retrieves each immutable message ID through the folder-scoped Inbox endpoint and classifies a 404 as removed. These checks are capped naturally by the workspace's existing 500-email retention limit, complete successfully before their version markers are stored, and are not repeated during normal one-minute polling. Reconnecting Gmail clears its marker so the new connection is checked once. If Gmail later reports that its history cursor has expired, bounded full-sync recovery explicitly forces the same retained-ID reconciliation even when the version marker already exists; this closes any removal gap in the lost history window.

## Source contract

Every mail source may return:

```js
{
  messages: MailMessage[],
  removedProviderIds: string[],
  nextCursor: string | null,
}
```

`removedProviderIds` defaults to an empty array for sources without removals. A source must keep `messages` and `removedProviderIds` disjoint. Provider IDs use the same identity format already stored in `emails.provider_id`; Gmail therefore namespaces raw message IDs with the connected account.

Each live source additionally exposes a versioned reconciliation operation:

```js
reconcileInbox(providerIds) -> {
  presentProviderIds: string[],
  removedProviderIds: string[],
}
```

The result exhaustively and disjointly classifies every requested ID. Unknown or malformed provider metadata fails the sync instead of advancing the cursor or the reconciliation marker.

Graph accumulates valid tombstone IDs while walking every delta page. Gmail requests all four relevant history types without a Gmail `labelId` filter, because filtering for the current `INBOX` label can hide the event that removed that label. Gmail processes history records chronologically and retains the final observed state for each message.

## Transaction and scoping

The workflow validates the complete source response before changing the database. Removals are applied inside the same SQLite transaction as message upserts, automation, retention enforcement, and cursor advancement.

Each deletion is constrained by all of:

- `provider_id`;
- the source provider; and
- the source mailbox address, compared case-insensitively.

This prevents one connector from deleting another connector's data. If response validation, deletion, insertion, automation, retention, or cursor persistence fails, SQLite rolls the entire sync back. A Gmail connection invalidated while a request is in flight also commits nothing.

## Related records

Existing foreign-key behavior remains intentional:

- assignment and overdue notifications for a removed email are deleted through `ON DELETE CASCADE`;
- alert-delivery records are deleted through `ON DELETE CASCADE`;
- activity history remains, with `activity.email_id` set to `NULL`; and
- `email_thread_owners` remains so a future reply in the same conversation returns to the corrected or rule-selected owner.

No status, rule, retention, department, alert timing, or credential setting changes.

## User interface

No new UI control is required. Bootstrap already reads the local email table and the client already refreshes it. Once a successful sync deletes a row, the next render removes it from Inbox, Assigned, Completed, metrics, employee groups, searches, date results, and collapsible conversations. If the newest item in a conversation is removed, the next retained item becomes the conversation summary.

If an email detail dialog is open when polling discovers that the selected email is no longer visible to the current user, the client closes the stale dialog, clears its selection and opener state, announces that the email is no longer available, and restores focus to the route heading. This also safely covers a member losing access because an admin reassigned the email.

## Verification

Automated tests cover:

1. Graph returns normal messages and valid `@removed` IDs from multiple delta pages.
2. Gmail requests `messageAdded`, `messageDeleted`, `labelAdded`, and `labelRemoved` history without a current-label filter.
3. Gmail removes hard-deleted messages and messages whose `INBOX` label was removed, while ignoring unrelated label removals.
4. Source addition/removal state is deterministic and the two output collections remain disjoint.
5. Workflow deletion is provider-and-mailbox scoped.
6. Notification and alert-delivery rows cascade, activity history remains, and sticky conversation ownership remains.
7. Deletion and cursor advancement roll back together on failure.
8. Full and expired-cursor bootstrap remain bounded and do not infer deletions from snapshot absence.
9. Existing retained Gmail and Outlook IDs receive one authoritative membership reconciliation per source, whose version marker is stored only with a successful sync; Gmail clears its marker on reconnect.
10. Gmail expired-history recovery forces another authoritative reconciliation even when its version marker is already complete.
11. A selected email that disappears on refresh cannot remain visible or actionable in an open dialog.
12. The complete existing test suite continues to pass.

## Success criteria

After an incremental sync reports an email as no longer belonging to a connected Inbox, that email is absent from every LexFlow dashboard view. Existing stale Gmail and Outlook rows are corrected once after upgrade. A failed or stale sync cannot partially remove an email, and no connector can remove another mailbox's work.
