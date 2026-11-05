# Bingo event UX — selected C layout

Implement the user-selected prototype C as the default application, retaining
light/dark/system appearance, all preset card themes and custom themes.

## User requirements

- Clear first-use guidance and a clean, organized interface.
- One event flow: generate a game, print the cards, host the game.
- Generation and hosting may happen on different days. A prominent saved-game
  path must open an existing `.bingoCards` file directly into hosting, preserving
  printed cards and starting with zero drawn numbers.
- Keep the saved-game path out of the setup explanation: show separate
  “Prepare a new game” and “Host a saved game” choices with only the selected
  path’s controls visible.
- Hosting on a large screen must retain the current number, recent calls,
  full 90-number board, current winning target, pause state and progress.
- Give hosting a fun family-game feel using restrained number reveals, recent-call
  arrivals and a small verified-win celebration. Keep the board stationary and
  respect reduced-motion preferences.

## Integration requirements

- Remove prototype switches, A/B layouts, sample draws and query-string gating.
- Retain language selection and provide new copy in EN/PT/ES/FR.
- Retain refresh recovery, keyboard drawing, optional audio/voice, line/bingo
  validation and restart controls.
- Draw from all 90 numbers without replacement. Validate each line as nine grid
  cells, ignoring blanks. Accept the existing backup fixture and its legacy
  trailing separators; never rewrite repeated numbers on already printed cards.
- Failed imports must leave the current game intact.
- Print four actual generated/imported cards on each A4 page; allow browser PDF
  output and compatible game-file download.
- Confirm replacing a prepared/running game and restarting calls.

## Validation and review

User agreed to tests at the public game-file API and user-facing event flow.
Review baseline is `6ed77c3`, the final prototype commit before implementation.
The prototype is retained in that commit’s history, not in production routes.
Separate standards/spec reviews inspect the implementation against this baseline.
