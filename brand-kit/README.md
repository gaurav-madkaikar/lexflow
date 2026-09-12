# LexFlow Brand Kit v1.0

Open **LexFlow-Brand-Guide.pdf** first. This is a proposed brand system grounded in the current LexFlow application, not a claim of formal trademark registration or legal clearance.

## Included
- 12-page printable brand and product design guide.
- SVG monograms, wordmark lockups, reversed logo, favicon, and 8-icon sprite.
- Editable 1200 x 630 social card and HTML email signature.
- Light/dark JSON design tokens and reusable CSS starter styles.

## Asset use
Use `lexflow-lockup-dark.svg` on light backgrounds and `lexflow-lockup-reversed.svg` on dark backgrounds. `lexflow-lockup-light.svg` is an alternate filename for the light-colored reversed lockup. SVG wordmark text remains editable and uses Arial/Helvetica; monograms are vector paths. Open SVGs in Figma, Illustrator or a browser. Convert wordmark text to outlines in your design editor before handing off print artwork if exact font portability is required.

Use icons with `<svg><use href="logos/icons.svg#lf-mail"></use></svg>` on a web server; symbol IDs: mail, check, clock, search, arrow, calendar, user, bell. Give interactive icons accessible names.

## Colors and type
Core app palette is retained. Dark-mode on-accent text is intentionally dark to improve contrast on bright coral; this is a recommendation, not an already-applied app change. The opaque dark border token approximates the app's layered border. Check final composited contrast.
No commercial font files are distributed. Avenir Next and Helvetica require appropriate licensing where applicable. Inter is an optional separately obtained alternative. The PDF uses Helvetica for portability.

## Templates
Replace bracketed fields in the email signature. Social artwork contains no invented website or contact details. All dashboard examples are sample data. This ZIP contains no database, user records, tokens or credentials. This delivery does not modify or push the application.

## Implementation
Load tokens/lexflow.css, then set `data-theme="dark"` on the document for dark mode. JSON uses readable semantic keys, not a Figma-specific token plugin schema. UI examples are design references, not a complete component library.
