# TripPlanner design system (tokens-only)

Travel wallet for bookings (flights, hotels, cars). Mobile app (iOS first), minimal + "liquid glass":
translucent glass panels over coloured covers, deep dark background, ONE warm accent. Dark is the
primary theme, light is equal. There is NO component bundle here: you get tokens, fonts and rules.
Build mockups as plain HTML/CSS using ONLY the vocabulary below; never invent hex values or px sizes.

## Setup
```html
<link rel="stylesheet" href="styles.css">
<body>  <!-- follows the OS theme; force with <html data-theme="light|dark"> -->
```
`styles.css` defines every token as a `--*` custom property, registers the fonts, and sets the
`body` background/text/font. Without it nothing is styled. Phone frame: design at 390px width.

## Styling idiom: CSS variables (no utility classes, no frameworks)
Write `var(--*)` everywhere. Families (all real names):
- Colour (theme-aware): `--color-bg`, `--color-surface`, `--color-surface-strong`, `--color-surface-border`,
  `--color-divider`, `--color-text`, `--color-text-secondary`, `--color-text-tertiary`, `--color-tab-inactive`,
  `--color-accent`, `--color-on-accent`, `--color-warn-bg`, `--color-warn-border`, `--color-danger`,
  `--color-scrim`, `--color-cover-scrim`, `--color-inverted-pill`, `--color-inverted-pill-text`.
  Trip-cover placeholders: `--cover-1` … `--cover-5`.
- Radius: `--radius-tile|field|card|cover|sheet|pill|tab-bar`.
- Spacing: screen frame `--space-screen-x` (20), `--space-gap` (12), `--space-block` (20), `--space-section` (24);
  inner padding scale `--space-xs|sm|md|lg|xl|xxl` (4/8/12/16/24/32). Two groups on purpose; don't merge.
- Sizes: `--layout-min-touch` (44), `--layout-border-width` (1), `--layout-tab-bar-height`, `--layout-fab-size`, … (see tokens/metrics.css).
- Type: `--font-display|bold|medium|regular|mono`, `--font-size-hero|auth-title|h1|city-hero|card-title|h2|body|small|caption|micro`.
  Role classes: `.type-hero .type-auth-title .type-h1 .type-city-hero .type-card-title .type-h2 .type-button .type-body .type-small .type-caption .type-micro .type-mono .type-mono-small`.
- Glass panel: class `.glass` (add `.glass--strong` over an image). It = blur + translucent fill + 1px border; all three are mandatory.

## Hard rules
- Manrope for all text: ExtraBold (`--font-display`) for screen titles and city names, Bold for section titles and buttons,
  Medium for body. NEVER SemiBold 600. IBM Plex Mono (`--font-mono`) ONLY for "ticket" data: airport codes (WAW, KRK),
  dates on cards, flight/ticket/policy numbers, seats. Never for titles, buttons or passenger counts.
- Icons: Feather set only (outline, uniform stroke); sizes 16 / 20 / 24. No emoji, no text glyphs (`<`, `…`, `+`, `→`) as icons.
- Touch targets >= 44px including inline links. Text contrast >= 4.5:1 in BOTH themes; every screen must work in light and dark.
- Disabled = `--color-divider` fill + `--color-text-tertiary` text, never opacity. Pressed = opacity .7 is fine.
- `--color-danger` only for destructive actions and field errors. Colour must never be the only carrier of meaning (add a word).
- No gradients for decoration, no left colour-stripe cards, no Inter/Roboto/Arial, no fake status bar or keyboard.
- Phase 1 excludes: multi-currency conversion, full offline sync, guest mode, Booking import, trip sharing, Live Activity, Apple Wallet export.
- Every record (flight, hotel, car, document) has a `source`: manual | imported_pending | imported_confirmed. Times are UTC + the
  place's IANA timezone; currency is per record; a trip has exactly one owner.

## Where the truth lives
Read before styling: `styles.css` and the files it imports (`tokens/*.css`); `guidelines/tokens.md` (canonical values and
meaning), `guidelines/README.md` (design intent, glass, covers), `guidelines/screens/*.md` (per-screen specs: match them,
flag disagreements instead of silently deviating).

## Example: trip card (glass over a cover)
```html
<div style="background:var(--cover-1);border-radius:var(--radius-card);height:172px;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:var(--color-cover-scrim)"></div>
  <div class="glass glass--strong" style="position:absolute;left:var(--space-md);right:var(--space-md);bottom:var(--space-md);
       border-radius:var(--radius-card);padding:var(--space-md)">
    <div style="font-family:var(--font-display);font-size:var(--font-size-card-title)">Краков</div>
    <div class="type-mono-small" style="color:var(--color-text-secondary)">12 – 18 OCT · WAW → KRK</div>
  </div>
</div>
```
