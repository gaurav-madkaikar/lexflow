# Overview Density and Rule Priority Options

## Summary

Refine the DepAdmin overview so its Unassigned inbox and Automation rules cards remain aligned without reserving a fixed 660px of vertical space. Replace free-form numeric rule priorities with four user-facing options: Low, Medium, High, and Critical.

This design amends the fixed-height portion of `2026-08-30-depadmin-overview-rule-previews-design.md`. The existing five-entry preview limit, `View all` behavior, navigation, permissions, and department scoping remain unchanged.

## Scope

- DepAdmin overview layout and rule-priority controls.
- Rule creation, editing, display, validation, and evaluation order.
- No database schema change.
- No Microsoft Graph, authentication, organization, department, mailbox, or role changes.
- No change to the existing five-entry preview limit.

## Content-adaptive overview layout

At desktop widths, the overview remains a two-column grid with equal-width cards. Remove the fixed `660px` card height and allow the grid row to derive its height from the taller card's actual content.

- Stretch both grid items to the resulting row height so the card bottoms and footers remain aligned.
- Keep each card as a vertical flex container so its footer stays at the bottom.
- Do not add a replacement fixed height or artificial minimum height.
- Keep list overflow hidden only as needed for the existing five-entry preview; card content must not be clipped.
- If one collection has fewer entries, it may have a small amount of internal space to align with the taller card, but it will no longer expand to 660px.

At and below the existing 1120px breakpoint, stack the cards. Each stacked card uses its own natural height so the content of one card does not create whitespace in the other.

## Fixed priority model

The rule form replaces the numeric priority input with a required select containing:

| Label | Stored value | Evaluation order |
| --- | ---: | ---: |
| Critical | 10 | 1 |
| High | 20 | 2 |
| Medium | 30 | 3 |
| Low | 40 | 4 |

The select presents the labels `Low`, `Medium`, `High`, and `Critical`, and defaults new rules to `Medium`. Existing rules use their stored canonical value to select the corresponding label when edited.

The integer representation remains an internal compatibility detail. Rule cards and dialogs show labels rather than numeric values. The API continues to accept and return the numeric `priority` field, avoiding a schema or response-contract migration.

## Validation and rule evaluation

- Rule creation accepts only `10`, `20`, `30`, or `40` for `priority`.
- A patch that includes `priority` applies the same allowlist validation.
- A partial patch that omits `priority` preserves the rule's current value.
- Invalid values return the existing field-level validation shape with a message directing the user to choose Low, Medium, High, or Critical.
- Client-side validation uses the same allowlist and message.
- Matching rules remain sorted by ascending stored value and then rule ID. This evaluates Critical before High, High before Medium, and Medium before Low.
- The overview and full Automation rules section use the same label helper and sorting behavior.

The active database currently contains only canonical values (`10`, `20`, and `30`), so no data rewrite is required. Server-side write validation prevents new noncanonical values.

## Errors and accessibility

- The priority select retains its visible label and required-field semantics.
- Validation errors remain attached to the priority field and announced through the existing rule-dialog error region.
- Layout changes do not alter keyboard order, focus handling, card actions, or `View all` behavior.
- The responsive stacked layout must not clip rule actions or email rows.

## Testing

- Verify overview CSS no longer declares the 660px fixed height.
- Verify desktop cards use equal-width columns and content-adaptive stretching.
- Verify stacked cards return to independent natural heights at the existing breakpoint.
- Verify the rule form exposes exactly Low, Medium, High, and Critical and defaults to Medium.
- Verify rule cards display priority labels rather than numeric values in both overview and full views.
- Verify create and patch requests accept `10`, `20`, `30`, and `40` and reject other values without mutating data.
- Verify overlapping matching rules are evaluated Critical, High, Medium, then Low, with rule ID as the tie-breaker.
- Retain the five-entry preview and `View all` tests.
- Run the complete automated test suite and smoke-test the DepAdmin overview at desktop and stacked widths.
