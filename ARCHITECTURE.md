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
       ├─ Local game library: IndexedDB deck snapshots and deletion markers
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

Offline installation precaches the root and all localised home, cards and game pages alongside
the build's scripts, styles and public assets. Locales are shared between routing and the precache
manifest. Workbox completes the new precache before the replacement worker activates.
Completed updates claim open clients without reloading them or clearing saved event
state. The next ordinary navigation or refresh uses the new build; reconnecting
does not automatically reload a running game. Build revisions keep cached page HTML
and its scripts aligned across deployments. Navigation uses a network-first route
before the precache route, so online refreshes can fetch current HTML even while
a worker update is delayed. Navigation cache names include the installed build
revision; activation removes older navigation caches so HTML cannot outlive its
retired scripts. Offline navigation uses the current build’s most recent visited-page
copy, then falls back to the installed precache for unvisited entry points.

The offline readiness module asks the active worker for its exact precache and revision keys,
then verifies cached HTML and every referenced script and stylesheet.
Missing entries can be repaired online. The status module remains silent when ready and shows a warning on failure. It
checks again on reconnect, controller replacement or returning to the page. Storage persistence is requested without
blocking readiness; the browser can deny it. Missing resources are repaired by the
active worker through a bounded message exchange, avoiding page fetches through a
missing precache route. Online checks discover worker updates without blocking cache verification. Controller
changes trigger a fresh readiness check. The current session remains in localStorage;
the game library keeps separate snapshots in IndexedDB.

A separately packaged desktop release is not required for these offline behaviours. The existing
installable web app remains the primary distribution; local file ownership or managed kiosk
requirements would justify reconsidering a native package.

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
The production service worker is also included. Only test files and type declarations are excluded. Statements, branches,
functions and lines must each reach 100%; a test failure or coverage shortfall
returns a failing exit code.

Jest cannot establish physical pagination because it does not lay out CSS.
`bun run test:print:webkit` uses native WebKit printing on macOS to verify A4
page counts, card order, footer presence and preview/paper card alignment.
It covers all four layouts, partial sheets and a 200-card deck. This is not a
substitute for an iOS Safari print-dialog check.

CI runs the complete coverage suite and critical game suite on Ubuntu, and the
native print suite against a production build on macOS. The final `checks` job
runs even after an upstream failure and fails unless both jobs succeeded.
Repository branch-protection settings must require these checks to block merges.
See [TESTING.md](TESTING.md) for commands and prerequisites.

## Local game library and print preferences

`EventWorkspace/gameLibrary.ts` owns the `bingoGameLibrary.v1` IndexedDB database.
Each game has a stable UUID, validated session, theme snapshot and update timestamp.
Writes resolve after transaction commit. Older queued writes cannot replace a newer
snapshot. Removing a saved copy leaves a persistent deletion marker, preventing a
second tab from recreating that ID. The current session uses a null library ID until
explicitly saved again with a new ID; removing its copy preserves the open deck.

The workspace serializes writes and waits for them before opening another saved
game. Legacy current sessions are adopted on first load. Previously overwritten
sessions cannot be recovered; importing a `.bingoCards` file creates a saved entry.
The library is local to this browser profile and origin. Clearing site data or
browser storage eviction can remove it; downloaded files remain the backup option.

`PrintedSheets/printOptions.ts` validates persisted print preferences, including
bounded raster data URLs. `PrintPreferences` validates image decoding before use.
Logo images stay on the device. The same rendering options apply to preview and
paper, with bounded header/footer dimensions and fixed number sizing.
