# UI Theme, Sound, and Visual Effects Port Design

## Summary

Port the presentation quality of `itr-email-automation` into `itr-final-app-impl` without merging or cherry-picking behavioral code. The current branch remains authoritative for Entra authentication, roles, tenancy, Graph integration, mailbox processing, conversations, rules, Metrics, notifications, and every API contract.

The port includes a Microsoft-only atmospheric login page, shared Light/Dark themes, restrained motion, synthesized notification sounds, and a persistent mute control. It explicitly excludes CFO, vacation mode, local passwords, React/Tailwind UI infrastructure, generated UI bundles, and all server-side logic from the source branch.

## Source analysis

`itr-email-automation` diverged from the current branch at commit `59f0297`. Its two later commits combine unrelated concerns:

- `d4acd17` adds CFO dashboard and vacation-mode behavior, database changes, endpoints, dependencies, and UI infrastructure.
- `e69daa4` redesigns login and adds shared dark mode, but is built on top of the CFO/vacation/local-auth application.

Consequently, neither a merge nor cherry-pick is safe. The useful presentation patterns must be manually adapted to the current application structure.

Reusable references include:

- Dark atmospheric login art direction and responsive layout.
- Shared Light/Dark token values and account-menu theme control.
- Anime.js page, list, dialog, menu, card, and toggle effects.
- Web Audio notification, completion, and read chimes.
- Reduced-motion guards and content-signature animation gating.

Rejected source material includes:

- CFO role, dashboard, chart stack, React roots, and finance modules.
- Vacation state, briefings, endpoints, database fields, sounds, and dialogs.
- Local email/password login, password reveal, demo credentials, and `/api/login`.
- Tailwind, Vite, shadcn, Visx, Motion React, generated `public/ui-assets`, and their dependency graph.
- Source-branch server, database, authentication, workflow, metrics-calculation, and API changes.

## Architectural boundary

The current HTML semantics and application behavior remain intact. Presentation additions are isolated into three browser modules:

### `public/theme.js`

Owns:

- `THEME_STORAGE_KEY = 'lexflow-theme'`.
- Resolving a saved `light` or `dark` choice.
- Falling back to `prefers-color-scheme` on first visit.
- Applying `data-theme` and the `dark` class to the document root.
- Updating `meta[name="theme-color"]`.
- Updating the account-menu theme control and responding to OS changes only while no explicit choice exists.

It does not inspect user roles or application data.

### `public/ui-effects.js`

Owns:

- The `prefers-reduced-motion` guard.
- Login entrance and ambient workflow effects.
- Account-menu and theme-toggle effects.
- Workspace-module, email-list, email-detail, metric-card, and meter effects.
- Content signatures that prevent polling from replaying unchanged animations.

The module receives DOM nodes or immutable presentation signatures. It does not call APIs, update application state, or choose navigation destinations.

### `public/notification-audio.js`

Owns:

- `SOUND_STORAGE_KEY = 'lexflow-notification-sounds'`.
- AudioContext initialization after the first pointer or keyboard gesture.
- Synthesized notification, completion, and read chimes.
- Persistent enabled/muted preference, defaulting enabled.
- Silent failure when Web Audio or storage is unavailable.

The module exposes explicit presentation methods. `public/app.js` decides when a successful existing event invokes them.

Anime.js is the only new dependency. `src/app.js` serves its ESM bundle from a same-origin `/vendor/animejs.js` route using the same pattern as the existing Chart.js route. This static vendor route is the only server file change allowed.

## Visual system

The current layout, modules, labels, responsive breakpoints, five-entry overview limits, and interaction hierarchy remain authoritative.

### Login

The login page uses the source branch's dark atmospheric direction:

- Dark blue-black canvas with subtle grid and aurora glows.
- Pointer-following glow on fine-pointer devices.
- LexFlow brand header and enterprise-security status.
- Large workflow message and a three-stage animated workflow strip.
- Glass sign-in card with Microsoft-only copy and one `Continue with Microsoft` action.
- Responsive single-column treatment at narrower widths.

The login action continues navigating immediately to `/api/auth/outlook/start`. No local email/password fields, password visibility control, demo credentials, or success animation that delays the redirect are introduced.

### Authenticated workspace

Light mode retains the current visual identity. Dark mode adds semantic token values for canvas, cards, soft surfaces, text, borders, status colors, focus rings, shadows, and chart colors.

Dark coverage includes:

- Sidebar, navigation, organization branding, top bar, and account popover.
- Overview, email threads and messages, assigned groups, rule cards, activity, and notifications.
- Team, organization settings, and Graph Integration states.
- Metrics cards, charts, legends, tables, detail disclosures, loading states, and empty states.
- Forms, buttons, dialogs, drawers, toasts, validation, errors, and progress indicators.

The theme is applied by a small inline head script before styles render, preventing a flash of the wrong theme. The account menu gains an accessible theme control with `aria-pressed`, icon transition, and visible Light/Dark label.

## Sound design

Sounds are synthesized with low-volume Web Audio oscillators; no sound files or external requests are used.

- New-notification chime: plays only when unread count increases after the initial bootstrap baseline.
- Completion chime: plays only after the existing task-completion mutation succeeds.
- Read chime: plays only after the existing mark-notification-read mutation succeeds.
- No sound occurs on initial bootstrap, ordinary polling with unchanged counts, errors, navigation, sign-in, or rendering.

The account menu includes an accessible `Notification sounds` control. It defaults enabled and stores the user's choice locally. Muting prevents all three sounds. Audio initialization follows browser autoplay rules and begins only after a user pointer or keyboard gesture.

Sound does not change notification state, task state, polling cadence, error reporting, or mutation ordering.

## Motion design

Motion is restrained and functional:

- Login elements reveal in a short stagger; the workflow line and live dot animate ambiently.
- Workspace cards/modules reveal after actual view changes.
- Email or thread rows stagger only when a signature of visible IDs/status/assignees changes.
- Email-detail content reveals when the dialog opens.
- Account popover and theme control use short scale/fade transitions.
- Metric cards use pointer spotlight and subtle hover lift; meters reveal when values change.
- Existing toast and dialog CSS transitions receive visual polish without lifecycle changes.

All JavaScript motion is disabled when `prefers-reduced-motion: reduce` matches. CSS receives matching reduced-motion overrides. Motion never delays Entra navigation, API requests, state updates, dialog availability, or route/view selection.

## Application integration

`public/app.js` remains the behavioral coordinator and adds presentation-only hooks:

- Initialize theme and sound controls after element discovery.
- Invoke login entrance when the login view becomes visible.
- Invoke workspace effects after existing render/view transitions.
- Pass a stable signature to email-list and metric effects.
- Invoke detail reveal after `showModal()`.
- Invoke notification sound only when `unreadCount > lastUnreadCount` and `lastUnreadCount !== null`.
- Invoke completion/read sounds only after their existing mutations resolve successfully.

The current feedback queue remains the sole toast/notification-modal implementation. It is restyled but not replaced by the source branch's single-toast behavior.

The current Entra callback error display, role navigation, organization logo/name, thread expansion, attachment-rule control, timezone formatting, Metrics module, and Graph Integration panel are preserved.

## Error handling and accessibility

- Unsupported or blocked Web Audio is silent and does not create feedback errors.
- AudioContext resume failures are ignored locally.
- Local-storage failures preserve in-memory theme/sound choices for the current page.
- Animation failures leave final DOM content visible and interactive.
- Theme and sound controls are keyboard accessible and expose current state through `aria-pressed` and labels.
- Existing focus management, skip links, dialog semantics, live regions, and field errors remain intact.
- All new visual states meet the current focus and contrast expectations.
- Fine-pointer effects do not run for touch pointers.

## Change allowlist

Expected implementation files:

- `package.json`
- `package-lock.json`
- `src/app.js` only for the static Anime.js vendor route
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/theme.js` (new)
- `public/ui-effects.js` (new)
- `public/notification-audio.js` (new)
- Focused browser-module and UI contract tests under `test/`

Any additional production-file change requires separate review before implementation.

## Behavioral denylist

The port must not modify:

- Database schema, migrations, or stored business data.
- Entra/OIDC start, callback, token, session, tenant, membership, or role logic.
- API request/response shapes or authorization middleware.
- Graph/Gmail ingestion, shared mailbox configuration, sync, or cursors.
- Department, member, DepAdmin, OrgAdmin, or PlatformAdmin behavior.
- Rules, attachment matching, assignment, completion, reopening, or notifications.
- Metrics calculations, filters, timezones, or data contracts.
- Polling intervals, alert intervals, or error semantics.

## Testing and verification

Automated tests cover:

- Theme resolution from storage and OS preference.
- Explicit theme persistence and OS-change behavior.
- Sound default, mute persistence, user-gesture arming, and unsupported-audio fallback.
- New-notification gating after baseline and no duplicate polling sound.
- Completion/read chime hooks only after successful mutations.
- Reduced-motion and animation-signature gating.
- Microsoft-only login with no password controls or `/api/login` references.
- Theme and sound controls' accessible names and states.
- Static exclusion of CFO, vacation, local-login, React roots, generated UI assets, and disallowed dependencies.
- Existing application, tenant, workflow, Graph, conversation, Metrics, and UI tests.

Browser smoke testing covers:

- Login layout and Microsoft redirect action at desktop and narrow viewport.
- First-visit system theme, saved theme, no flash, and account-menu toggle.
- Every role's available pages in Light and Dark modes.
- Current overview, threads, rules, Team, Settings, Graph Integration, Metrics, dialogs, and feedback queue.
- Notification increase, successful completion/read sounds, mute persistence, and no initial-load sound.
- Reduced-motion behavior and absence of console errors.

Final review includes `git diff --check`, full `npm test`, and a path audit. The path audit must show no changes outside the allowlist and no changes in the behavioral denylist except the reviewed static Anime.js vendor route.

## Acceptance criteria

- The current application's behavior and API contracts remain unchanged.
- Login adopts the approved atmospheric design with Microsoft-only authentication.
- Light/Dark theme follows OS preference initially and remembers explicit choice.
- Dark mode covers all current modules without layout or readability regressions.
- New-notification, completion, and read sounds follow the approved gating rules.
- Users can persistently mute sounds.
- Motion is restrained, signature-gated, and disabled for reduced-motion users.
- CFO, vacation, local passwords, React/Tailwind infrastructure, and generated source-branch bundles are absent.
- All automated tests and browser smoke checks pass.
