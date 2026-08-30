# Lex Flow repository guidance

## Scope

- This checkout is the ITR email automation implementation of Lex Flow.
- Make requested Lex Flow code, dependency, configuration, and UI changes only inside this repository.
- Do not apply, copy, or propagate changes to another Lex Flow checkout, repository, or branch unless the user explicitly asks.
- Before making repository changes, confirm the active Git branch is `itr-email-automation`. If it is not, stop and ask the user before editing.

## Current dashboard direction

- Use a restrained, Apple-inspired enterprise system: neutral layered surfaces, crisp typography, subtle translucency, thin dividers, limited blue accents, and purposeful depth. Keep visual decoration subordinate to operational data.
- Prefer decision-useful charts and compact distribution indicators over decorative graphics. Every chart must have a clear business question, readable labels, and reduced-motion behavior.
- Keep the dashboard top bar compact: a wide email search field followed by Sync now, Notifications, and a circular admin avatar.
- Put account identity and Sign out inside the admin avatar menu rather than showing them as separate top-bar controls.
- Keep the date, Review inbox, and calendar actions on the dashboard, but reserve the promotional workflow hero copy for a future landing page.
- Present KPI cards before the email workflow, with the compact email-flow chart below the queue.
- Play the subtle Web Audio notification chime only when the unread count increases after initial bootstrap. Keep the existing accessible live announcement and tolerate browsers that have not yet granted audio through a user interaction.
- Play the separate ascending completion chime only after the mark-complete request succeeds; failed requests remain silent.
- Play the short descending read-confirmation chime only after a notification is successfully marked read.
- Treat the notification panel as an active unread queue: read items disappear, opening an item marks it read, and completing an email retires every notification tied to it. Keep completion history in the activity audit trail instead of creating a fresh completion notification.
- Keep the Open assigned, Completed, and Unread KPI cards linked to their matching workspace views whenever their count is above zero. Preserve native button semantics, keyboard access, and a non-interactive state for zero-value cards.

## CFO finance workspace

- CFO users have a dedicated, read-only finance workspace and must not receive mailbox, rules, settings, or email-operation access.
- Use the immersive bento layout, soft financial gradients, thin dividers, and abstract data forms from the approved health-dashboard reference. Reuse the earlier Lex Flow visual treatment only for KPI cards.
- The prototype uses deterministic sample data attributed to AR Revenue, AP, Tax, and Invoicing. It supports MTD, QTD, YTD, and trailing-12-month periods with USD consolidated reporting and USD, INR, EUR, and GBP exposure.
- Keep finance APIs read-only until the user explicitly requests team entry, imports, or live accounting integrations.
- Provide interactive Overview, AR, AP, Tax, Invoicing, and FX module tabs. Each deep-dive module should retain the shared reporting period and expose its own KPIs, visual analysis, and supporting records.
- Use Anime.js for purposeful module, card, and data-transition motion while always respecting `prefers-reduced-motion`.
- Keep the CFO overview decision-first: show only five priority KPIs initially, preserve the complete metric-card library behind an accessible disclosure, and group expanded metrics by revenue performance, working capital, and outlook/risk.
- Keep the CFO header area compact: do not restore a large promotional intro headline above the module tabs, and keep KPI cards dense enough to scan without dominating the dashboard.

## Microsoft Vacation Mode

- Outlook automatic replies remain a supported read-only source, while a member may explicitly switch to Lex Flow's manual Vacation Mode and choose a start and return time. Once a manual preference exists, it takes precedence until the member turns it off; Lex Flow still never modifies Outlook settings.
- Keep Vacation Mode member-only. Administrators may see availability, sync health, principal mapping, dates, and held-work counts, but never meeting titles or briefing contents. CFO users have no access to vacation or mailbox operations.
- While a member is actively away, preserve rule intent in an OOO hold and keep the email unassigned and visible to administrators. Do not hide normal unassigned SLA coverage.
- On return, release all still-unassigned held work in one transaction and create one briefing notification. Never create an assignment-notification storm.
- Calendar capture is metadata-only: subject, organizer, time, timezone, response, location, sensitivity, recurrence, and online link. Never store bodies, attachments, transcripts, or full attendee lists; always redact private titles.
- Briefing ordering must remain deterministic and expose its priority reasons. Calendar failure must not block email release; publish a partial briefing and retry idempotently for 24 hours.
- Keep Anime.js motion concise and respect `prefers-reduced-motion` in status, history, and briefing interactions.
- Keep the Vacation switch accessible with native switch semantics. Play the synthesized swoosh only after a successful enable and the short glass-like effect only after a successful disable; failed changes remain silent.
- Keep the return-briefing preview clearly labeled as sample data and separate from persisted briefing history.
