# Architecture Overview

The application uses one bingo event flow: generate a deck, print its cards, and
host the game. The home, cards and game routes all render the event workspace
with different entry stages. See [the event UX spec](docs/specs/bingo-event-ux.md)
and [the domain glossary](GLOSSARY.md) for the preserved behaviour and terms.

## Active modules

```text
Localized routes
  └─ Event workspace
       ├─ Event session: restoration and saved settings
       ├─ Game files and rules: import/export, draws and claims
       ├─ Card generation
       └─ Printed sheets
            ├─ Layout selection and ordered grouping
            ├─ Card markup and theme binding
            ├─ Preview scaling and physical paper measurements
            └─ Screen and print styling
```

The event workspace owns event state, user actions, layout selection, browser
printing and hosting. The printed-sheet module owns how the deck appears in both
preview and print. It does not read or modify the event session.

`app/components/PrintedSheets/PrintedSheets.tsx` is the rendering interface.
`printLayout.ts` owns supported layouts and paper measurements. Shared grouping
and counting functions also support event summaries and saved layout validation.
`printedSheets.css` owns card presentation, hiding the printed deck on screen,
and paginated print layout. The module emits the page rule from the same physical
measurements used by its preview.

Sheets use fixed card rows and natural print height. Reserving nearly the full
printable A4 height caused WebKit to spill the last footer onto an extra page.
Preview and paper both place cards at the top of their printable area; explicit
page breaks separate the ordered sheets.

## Browser effects

The workspace handles storage recovery/migration, file selection and downloads,
keyboard input, speech, audio and fullscreen. Theme and toast providers retain
shared appearance and notification state. Localised routes use next-intl.

The optional legacy FileUpload/BingoGame modules remain in the source tree and
test suite, but current production routes do not import them. Vector PDF
execution, including its worker adapter, is currently reached from that legacy
FileUpload module. It is not the active event workspace's print path.

## Verification

`bun run test:coverage --runInBand` includes all production TypeScript/TSX under
`app/`, plus `proxy.ts` and `next.config.ts`, even when no test imports a file.
Only test files and type declarations are excluded. Statements, branches,
functions and lines must each reach 100%; a test failure or coverage shortfall
returns a failing exit code.

Jest cannot establish physical pagination because it does not lay out CSS.
`bun run test:print:webkit` uses native WebKit printing on macOS to verify A4
page counts, card order, footer presence and preview/paper heading alignment.
It covers all four layouts, partial sheets and a 200-card deck. This is not a
substitute for an iOS Safari print-dialog check.

CI runs the complete coverage suite and critical game suite on Ubuntu, and the
native print suite against a production build on macOS. The final `checks` job
runs even after an upstream failure and fails unless both jobs succeeded.
Repository branch-protection settings must require these checks to block merges.
See [TESTING.md](TESTING.md) for commands and prerequisites.
