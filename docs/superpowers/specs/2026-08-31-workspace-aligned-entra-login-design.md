# Workspace-Aligned Entra Login Design

## Objective

Align the Microsoft Entra sign-in screen with the authenticated LexFlow workspace so authentication feels like the entrance to the same product. Preserve every authentication, authorization, data, mailbox, session, and workflow behavior.

## Approved direction

Use a **workspace-shell echo**. The sign-in page will reuse the authenticated application's stage, shell, sidebar, card, typography, icon, and coral-action language instead of presenting a separate blue atmospheric experience.

The page follows the existing saved/system light–dark theme. It does not show organization-specific branding before authentication because the user's organization is not yet known.

## Visual architecture

The outer page uses the existing workspace stage background. A rounded shell contains two areas:

1. A compact brand rail that echoes the authenticated sidebar. It contains the LexFlow mark, product name, “Mailbox operations” label, concise trust indicators, and a three-step Inbox → Rules → Assignment routing motif.
2. A main surface with a restrained welcome introduction and one authenticated-style sign-in panel.

The routing motif is the page's signature element. It uses existing workflow icons and a subtle coral progress treatment. It communicates the product's mailbox-routing purpose without resembling live customer data.

On narrow screens, the areas stack into a single-column sign-in experience. Content remains readable without horizontal scrolling or clipped actions.

## Shared design system

The login page reuses the current application tokens:

- `--color-stage`, `--color-canvas`, `--color-card`, and `--color-soft` for surfaces.
- `--color-ink`, `--color-muted`, and `--color-subtle` for typography.
- `--color-coral` and `--color-coral-hover` for the primary action and routing emphasis.
- Existing line, radius, shadow, font, focus-ring, and motion tokens.
- Existing logo, eyebrow, icon, button, and card treatments.

Login-only blue and cyan colors, aurora glows, pointer spotlight, glass styling, and blue workflow states are removed. Light and dark modes derive from the same shared semantic tokens as the authenticated workspace.

## Interaction and accessibility

The page retains the current form and authentication hooks. The existing “Continue with Microsoft” action remains the only sign-in method.

Motion is limited to a short entrance sequence and a subtle routing indicator. The existing reduced-motion handling keeps all content immediately visible and disables nonessential animation. Keyboard focus remains visible through the shared focus ring. Error text remains in the existing accessible alert region.

## Strict behavior boundary

This change is presentation-only:

- Preserve the login form ID, error-region ID, submit control, and JavaScript event bindings.
- Preserve the Outlook/Entra start and callback routes.
- Preserve PKCE, state, nonce, redirect, issuer, tenant, membership, role, and session handling.
- Preserve all API payloads, database schemas and records, mailbox integrations, automation rules, metrics, and role-specific behavior.
- Do not alter authenticated workspace behavior or organization branding resolution.

Implementation is limited to login markup in `public/index.html`, login presentation rules in `public/styles.css`, and focused presentation-contract tests. Existing presentation-only animation selectors may be adjusted only as required to target the revised login structure.

## Error handling

Authentication callback errors continue to render in `#login-error`. The redesign must support short and long messages without changing error parsing, URL cleanup, or notification behavior. Loading and disabled states continue to use the existing form logic.

## Verification

Verification will include:

- Light and dark theme screenshots at desktop and mobile widths.
- No horizontal overflow at supported responsive sizes.
- Visible keyboard focus and readable callback errors.
- Reduced-motion rendering with stable visible content.
- Microsoft start-route redirect and callback URI smoke checks.
- Presentation-contract tests proving shared token use and retained authentication hooks.
- The complete automated test suite.
- A changed-file audit confirming no business-logic, authentication, database, or data files changed.

