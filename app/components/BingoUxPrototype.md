# Throwaway bingo UX exploration

Question: which layout makes first use clear and keeps a room of players oriented?

Run `bun install`, then `bun prototype`. Open `/en?variant=A` or
`/en/game?variant=A`. Compare A, B and C using the floating arrows or keyboard
left/right arrows. The default routes retain the existing application.

- A, Guided studio: explain create → print → play, with setup beside the explanation.
- B, Event workspace: a preparation checklist and dedicated host desk.
- C, Audience first: lead with the projected game and prioritize the current call.

Try drawing, pausing, changing the winning target, switching audience view and
entering full screen. All state is in memory. Numbers are simulated; card creation,
printing, claim validation and a synchronized second display are not implemented.
The English-only prototype explores hierarchy before translation work.

Recommended direction, pending user review: A for preparation and C for projection.
Always retain the current call, previous five calls, all 90 numbers, current target,
paused state, number of calls and a clear instruction for claiming a win. Keep these
in fixed positions. Host actions belong in a separate host surface for live events.
Audience view here only hides controls on the same screen; it is not a remote display.

Capture branch: `codex/prototype-bingo-ux`. No layout has been selected or promoted.
Before production, verify readability from the back of the actual room, at the
projector's resolution and contrast. Full screen depends on browser support.

Theme retention: all layouts now use the existing light/dark/system appearance.
The original Classic, Modern, Vintage, Dark, High Contrast and Kids card themes,
plus saved custom themes, are available in the header. Selection uses the existing
provider and its persistence; it updates the card sample and demo call colours.
Layout selection no longer imposes a separate colour palette.
