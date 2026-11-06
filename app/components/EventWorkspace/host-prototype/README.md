# Throwaway host layout study

Question: which layout makes calling numbers, checking the board and presenting
live bingo easiest? No direction has been selected yet.

Run `bun run prototype:host`, then open:

- A: http://localhost:3101/en/game?variant=A — caller's desk, actions beside the latest call.
- B: http://localhost:3101/en/game?variant=B — match sheet, board first with a horizontal call header.
- C: http://localhost:3101/en/game?variant=C — presentation stage, optional number board.

Use the floating arrows or keyboard left/right arrows to compare. Sample calls,
pause, target selection, audience mode and an empty state are interactive.
Expand “Prototype state & demo controls” to inspect all state or start empty.
Claim checking pauses the demo and shows a simulated explanation; it does not
verify actual cards. No saved games or browser storage are read or changed.

This is intentionally untested throwaway code on `codex/prototype-host-layouts`,
not part of PR #150. The variant route and switcher are development-only.
After a direction is selected, implement it properly in production, with the
production regression suite, and retain this branch as the primary design source.
