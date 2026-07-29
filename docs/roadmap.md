# MVP Roadmap

Dyestopia is a mobile-web match-3 game where players mix colours to build a
score multiplier, then cash the chain in with a swap. The MVP is ten short
puzzle stages, built for playtesting with friends; accounts, additional modes,
music, and a backend remain outside its scope.

## Current state

The complete game loop and most of the MVP presentation are playable today:

- Mask-shaped boards support legal swaps and directional merges, matches,
  cascades, seed-only refills, dead-board reshuffles, deterministic RNG, and
  the optional flood-fill combo prototype.
- Tiered colour scoring, player-built mix chains, Chain Breakers, rainbow
  maximums, and their HUD and animation feedback are implemented.
- Ten stages include score targets, move budgets, tutorial hints, win/lose and
  retry flows, stage selection, independent tutorial and stage progression,
  persistent Cleared records, and local progress.
- A separate six-lesson Tutorial section launches deterministic prepared boards
  through the normal game scene and rules, with progressive HUD disclosure,
  move guidance, sequential unlocks, replayable clears, and the temporary
  **Unlock all stages** setting.
- Mobile layout, touch input, procedural SFX and mute, tile shapes and colour
  themes, backgrounds, semantic UI components, and selectable Spray Can/Lab
  visual styles are in place; the game is deployed at
  `dyestopia.fschmidts.net`.
- Playwright covers the engine, stages, settings, sound, motion, layouts, and
  visual-system contracts at both supported pixel densities.

## Remaining

### M1 — Tutorial

- Finish authoring and playtesting the prepared boards for the real Match, Mix,
  Chain, and breaker goals defined in [tutorial.md](tutorial.md).
- Finish terminology highlighting and mechanic-specific step and success
  feedback.

*Exit: a new player can learn the complete core loop without outside
explanation.*

### M2 — Tools MVP

- Establish the tool contract and add the **free move tile** as the first tool:
  it can be merged or swapped with any other tile.
- Give every tool its own tutorial stage. The stage must both teach the tool
  and provide a focused play- and testing ground for its behaviour.
- Cover free-move interactions, scoring, chains, cascades, legal-move
  detection, reshuffles, animation, and stage reset in automated tests.

*Exit: the free move tile is understandable, playable, and testable in its own
tutorial stage, with a reusable pattern for adding later tools.*

### Later — Finish switchable art direction

- Add **Splash Colors** as a restyle of the existing shared layout and
  component system; it may change visual tokens and drawing, not gameplay or
  scene geometry.
- Verify selection, persistence, fallback, layout parity, touch targets, and
  the key game states across both tile shapes and all shipped visual styles.

*Exit: Splash Colors and Spray Can are selectable, coherent across every MVP
scene, and pass the same behavioural and layout suite.*

### Later — Resolve the combo spike

- Playtest the debug-only flood-fill recolour mechanic and decide whether to
  ship it, revise it, or remove it.
- If retained, tune the propagation and stages around it; otherwise remove the
  flag and move the idea to the parking lot.

*Exit: the MVP has one intentional, documented mixing model.*

### Release — Friends playtest

- Run a phone-focused playtest and bug pass, then tune stage thresholds and
  scoring from observed play.
- Add a lightweight feedback route and send out the release.

*Exit: friends can complete the game and feedback is arriving.*

## Parking lot

Additional tools and special tiles · alternative goals · rogue-like, battle,
and endless modes · music · greyscale accessibility · force-swap gesture ·
weighted/director-driven refills.
