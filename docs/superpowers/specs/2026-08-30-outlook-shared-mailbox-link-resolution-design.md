# Outlook Shared-Mailbox Link Resolution

## Summary

Fix Outlook links that report a shared-mailbox message as moved, deleted, or unavailable. LexFlow currently requests immutable Graph IDs and stores Graph's accompanying `webLink`. The active links contain the immutable `AAk...` item identifier, which Outlook on the web does not resolve correctly in this shared-mailbox flow.

Preserve immutable IDs for synchronization and local record identity. Resolve a current regular-ID `webLink` through Microsoft Graph when an authorized user opens an Outlook email's detail dialog.

## Scope

- Outlook messages synchronized from department shared mailboxes.
- DepAdmins viewing their headed department and Members viewing their own assignments.
- No database reset, schema migration, credential change, or additional Graph permission.
- Gmail and demo-message links retain their current behavior.
- Existing assignment, completion, notification, activity, and synchronization records remain unchanged.

## Graph link resolver

Extend the Outlook integration with a resolver that accepts `organizationId`, `mailboxAddress`, and the immutable Graph message ID.

1. Confirm the organization still has an active Outlook connection for the requested mailbox's organization.
2. Use the existing application access token and `Mail.Read` access to retrieve the immutable message with `Prefer: IdType="ImmutableId"`, selecting `internetMessageId`, `subject`, and `receivedDateTime`.
3. Query the same shared mailbox without the immutable-ID preference, filtering by the URL-encoded and OData-escaped `internetMessageId`, and select `webLink`, `subject`, and `receivedDateTime`.
4. Prefer the result matching the stored subject and received timestamp when Graph returns more than one copy.
5. Accept only an HTTPS URL hosted by `outlook.office.com` or `outlook.office365.com`.

Cache successful resolutions in memory for two minutes using organization, normalized mailbox address, and immutable message ID as the key. The cache avoids duplicate Graph requests while a user reopens the same message but is short enough to refresh links after mailbox changes. Disconnecting an organization's Outlook integration clears its cached entries.

The resolver does not overwrite the database's immutable provider ID or raw synchronized URL.

## Authenticated API

Add `GET /api/emails/:id/open-link` under the existing session middleware.

- DepAdmins may resolve only messages in the department they currently head.
- Members may resolve only messages assigned to them.
- OrgAdmins and PlatformAdmins remain email-blind.
- Cross-organization, cross-department, and unassigned-member access returns a resource-hiding `404`.
- Non-Outlook messages return the existing safe URL without invoking Graph.
- Outlook requests require the message's provider ID and shared-mailbox address to agree before the immutable ID is passed to the integration.
- Return `{ "webUrl": "https://..." }` on success.

If the message no longer exists, has no internet message ID, cannot be matched to a regular Graph message, or Graph returns an unsafe URL, return a concise exposed error suitable for inline display. Do not include Graph identifiers, tokens, mailbox content, or raw provider responses in the error.

## Email-dialog behavior

When an email detail dialog opens:

- Gmail and other already-safe non-Outlook links remain immediately available.
- For Outlook, hide or disable the link and show `Preparing Outlook link…` while requesting `/api/emails/:id/open-link`.
- When resolution succeeds, set the existing new-tab link to the returned URL and label it `Open in Outlook`.
- When resolution fails, keep the link unavailable and show the safe API message in a dedicated inline alert in the dialog.
- Ignore an old request's response if the user closes the dialog or opens a different message before it completes.

The UI must never navigate to a URL that fails the existing HTTP(S) safety check.

## Testing

- Verify the resolver makes one immutable-ID lookup followed by one regular-ID lookup and returns the regular `webLink`.
- Verify `internetMessageId` is safely escaped and duplicate results prefer matching subject and received time.
- Verify the two-minute cache and organization disconnect invalidation.
- Verify missing messages, missing identifiers, Graph failures, and unsafe hosts expose safe errors without identifiers or secrets.
- Verify DepAdmin and Member access succeeds only within their current email scope and all hidden resources return `404`.
- Verify Outlook dialog loading, success, failure, and stale-response handling.
- Verify Gmail links do not invoke the Outlook resolver.
- Run the complete test suite and a local browser smoke test without opening or mutating a real mailbox message.

## References

- [Microsoft Graph message `webLink`](https://learn.microsoft.com/en-us/graph/api/resources/message?view=graph-rest-1.0)
- [Microsoft Graph immutable Outlook IDs](https://learn.microsoft.com/en-us/graph/outlook-immutable-id)
- [Microsoft Graph Get message](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0)
