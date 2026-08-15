# Gmail Bounded Initial Sync Design

## Goal

Make a newly connected Gmail account reach a successful incremental-sync state without attempting to download an entire large Inbox. Preserve LexFlow's one-minute polling cadence and Gmail received-time semantics.

## Scope

The first Gmail sync imports at most the first 500 Inbox results returned by Gmail. After that bootstrap succeeds, LexFlow stores the Gmail history cursor and processes only subsequent mailbox changes.

The change also makes one malformed, vanished, or no-longer-Inbox message skippable and adds bounded retry handling for Gmail rate limits. Full historical import, configurable import depth, background migration jobs, and attachment or body download remain out of scope.

## Initial synchronization

The Gmail source reads the mailbox profile first and retains its `historyId`. It then requests one `users.messages.list` page with the `INBOX` label and `maxResults=500`; it deliberately ignores `nextPageToken`. Gmail message details continue to be fetched in bounded batches.

After all valid details from that page are mapped, the workflow imports them transactionally and stores the captured history cursor in the same successful sync operation. Mail received while the bootstrap request is running is therefore collected by the next history-based incremental sync.

The 500-message cap applies only when no Gmail cursor exists. Incremental history synchronization and expired-history recovery continue to use the same source boundary; an expired cursor falls back to the same bounded 500-message bootstrap rather than a full mailbox download.

## Per-message tolerance

A message detail is ignored when it:

- disappeared between list and detail retrieval;
- no longer carries the `INBOX` label;
- lacks a stable Gmail message ID; or
- lacks a valid non-negative `internalDate` timestamp.

Valid messages in the same batch still import. Missing subjects, sender names, snippets, or headers retain the existing safe fallbacks. LexFlow never substitutes the current time for a missing `internalDate`, because overdue timing must remain based on the provider's received time.

Skipping an invalid message does not expose its ID, sender, subject, or content in API responses or logs. A skipped message is considered again only if a later Gmail history event references it.

## Rate-limit handling

Gmail HTTP 429 responses receive at most two retries inside the Gmail adapter, for three total request attempts. A valid `Retry-After` value of 30 seconds or less is honored; a longer value ends the current sync so the scheduler can try later. Without that header, retries wait one second and then two seconds. This keeps a mailbox sync from remaining in flight indefinitely.

Tests inject the delay function so retry behavior is deterministic and does not sleep. If the retry budget is exhausted, the existing source-level error isolation records a safe Gmail error and the scheduler tries again on its next one-minute interval. OAuth credentials remain connected.

## Data and API impact

No database migration, endpoint, or response field is required. Existing Gmail connection, cursor, email identity, notification, activity, imported-count, and assigned-count behavior remains unchanged. The current admin Settings card continues to show the per-source success or error state.

## Verification

Focused tests will verify:

1. Initial Gmail sync requests only one Inbox list page with `maxResults=500`, even when Gmail returns `nextPageToken`.
2. The profile history cursor is returned after the bounded initial import.
3. Vanished, non-Inbox, and invalid-metadata messages are skipped while valid siblings import.
4. HTTP 429 honors bounded retry behavior and succeeds when a later attempt works.
5. Exhausted rate-limit retries return a safe error without exposing tokens or message data.
6. Incremental history sync and expired-history recovery retain their existing behavior, with recovery using the bounded bootstrap.
7. The complete existing test suite continues to pass.

After implementation, restart LexFlow so the new source behavior is active, allow Gmail's temporary quota pressure to settle, trigger one sync from the existing browser tab, and verify the Gmail card shows a successful sync instead of **Needs attention**.

## Success criteria

The connected Gmail account can complete its first sync with no more than 500 existing Inbox messages, save a history cursor, and then process new mail incrementally every minute. One bad message cannot fail the mailbox, and transient Gmail rate limiting cannot create an unbounded request loop.
