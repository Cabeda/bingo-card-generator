# Bingo UX prototype — C revision

Run `bun prototype`, then open `/en?variant=C`.

C now follows the event from start to finish:

1. Generate: event name, card count, retained theme, sheet estimate.
2. Print: preview the actual cards, print four per A4 sheet (or use the browser’s
   Save as PDF), and download a compatible `.bingoCards` backup.
3. Host: use the same event, beginning with zero calls; draw without replacement,
   pause, choose the winning target, and switch to audience view.

Step navigation preserves generated cards and calls in memory. Regeneration
replaces the set and resets the next host session. Refreshing loses the session.
The downloadable game file preserves cards only, not draw history or themes.

C’s game screen separates current/recent calls and the winning target from the
number board, with host controls in a single toolbar. Theme controls live under
Settings while hosting. All original presets and light/dark/system modes remain.
The original A/B explorations remain available via the prototype switcher.

This is throwaway code on `codex/prototype-bingo-ux`. Claim validation, restored
sessions, translations and synchronized remote displays still need production
integration. `/en/game?variant=C` opens the seeded demonstration directly.

Verified in the browser: generate eight cards, inspect the matching preview,
start with zero calls, draw, return to printing, and resume with the call retained.
The in-app print command was invoked, but native print-preview inspection was
unavailable; physical pagination and PDF output still need visual verification.

No variant has been promoted into the default production routes.

Saved-game shortcut: C’s entry screen offers “Open game file → Host”. It uses
the existing parser and retains the file’s card numbers and grids, accepting
legacy trailing separators and case-insensitive .bingoCards extensions. On success
it goes straight to hosting with no calls drawn, without generation or printing.
The event name comes from the filename because this format stores only cards.
Invalid file structure leaves the current game intact. Legacy repeated numbers
within a card are preserved rather than silently altering printed cards.
