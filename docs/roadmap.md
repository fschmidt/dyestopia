# MVP Roadmap

Written 2026-07-27, from a Q&A session that turned the loose notes in
[ideas.md](ideas.md) into decisions. Part 1 records what was decided (and is
the closest thing to a game design doc we have); part 2 is the build order.

## 1. What the MVP is

**A mobile-web match-3 puzzle game where colour mixing is the twist**, shipped
as ~10 stages to friends for feedback. One mode (puzzle), one board size,
no tools, no accounts.

### The core loop (decided)

- **Match-3 base.** Tiles are destroyed when 3+ of the same colour line up.
  Cleared tiles score by count, gravity pulls the board down, refill drops in
  from the top.
- **Merging is the twist.** Dragging a tile onto an orthogonal neighbour whose
  colour it mixes with (per the RYB rules in [`src/colors.ts`](../src/colors.ts),
  gated by the stage's active list) turns **both tiles into the result
  colour**. *Revised 2026-07-28 (combo playtest):* the mix is only legal when
  the dyed **target** completes a line with **two result-coloured tiles
  already in place** — the pair no longer supplies 2 of the 3, and the dye
  pours from the dragged tile onto the target, so **direction matters**:
  `orange|orange|red|yellow` mixes when the yellow is dragged onto the red,
  not the other way around. Mixed matches are earned by setup, which is what
  keeps player-made colours precious.
- **Move legality.** A move — swap *or* merge — is only allowed if it results
  in the destruction of at least 3 matching tiles. Illegal drops return home.
- **Cascades auto-resolve, cost nothing, and score.** They inherit the current
  player-built colour multiplier but do not increase it automatically. The
  cascade remains the payoff; choosing and extending a mix chain is what
  strengthens that payoff.
- **Refill drops seed colours only.** Mixed colours never fall from the sky —
  every secondary/tertiary on the board was made by a player, which is what
  makes them precious.

### Scoring (decided)

- Points per destruction are the sum of cleared tile values: primary 15,
  secondary 20, tertiary 30.
- **Mixing builds the score multiplier; swapping resets it.** A merge scores
  before raising the chain. Its first result colour leaves ×2; a repeated
  result holds; a new result raises the chain by one.
- Every clear caused by the move, including automatic cascade waves, uses the
  current colour multiplier. Cascades do not raise it themselves.
- Exact numbers are tuning work, not design work — pick simple constants and
  adjust in playtesting.

### Stage structure (decided)

- Win condition: **score threshold**, reached within a **move budget**
  (running out ends the stage; retry freely). Other goal types (explicit move
  puzzles, combo goals) come post-MVP.
- Stages vary **active colours, seed colours, threshold — and board size and
  shape**. The layout reserves a **10×10 cell area** with space above (score,
  target, moves) and below (future outside-board elements like tools); each
  stage defines its board as a **cell mask** inside that area, so a 3×3
  tutorial board, a full board, or a triangular one are all just data.
  ~10 stages, unlocked linearly.
- **Stages 1–3 are the tutorial**: tiny thresholds, colour sets that force one
  concept each (match → merge → cascade), one hint line per stage. No separate
  tutorial system.
- Furthest stage reached persists to localStorage (same pattern as
  [`src/settings.ts`](../src/settings.ts)); a simple stage-select screen shows
  progress and allows replay.

### The combo idea (spike, not commitment)

The flood-fill idea from ideas.md — *when a tile's colour changes and a
matching tile would mix with the result, all matching tiles convert to the
target colour* — is promising but self-admittedly unrevised. Decision:
**prototype it behind a debug toggle right after the match engine works**,
playtest for a day, then decide in or out. Stages are not designed around it
until it survives that test.

### Explicitly out of MVP

Tools/special tiles (recolor, reposition, destroy, palette swap) · other modes
(rogue-like, battle, chill/endless) · music (SFX only) · greyscale mode ·
any backend.

### Move resolution: merge before swap (decided)

When a tile is dropped on an orthogonal neighbour, the engine resolves in
order:

1. **Merge?** If the pair mixes and the result is stage-active, dry-run the
   **target alone** taking the result colour (revised 2026-07-28 — the
   dragged tile joins only in the real effect). The dyed target completes a
   3-line → the merge happens and both tiles convert.
2. **Swap?** Otherwise dry-run the swap. Clears 3+ → swap happens. This
   exception also covers mergeable pairs whose mix would *not* match — the
   swap gets its chance rather than the drop dead-ending.
3. **Illegal.** Neither clears → the tile returns home; no move is spent.

Consequences, accepted for MVP: the player cannot force a swap when a merge
would also match (a "force swap" gesture is parking-lot material); a
same-colour drop is always illegal — identical tiles can't merge, and
swapping them can't change the board; and since mixing anchors on the
target, the same pair can resolve differently in the two drag directions.

### Other decisions

- **Dead boards auto-reshuffle**, costing no move. Requires legal-move
  detection, which later enables hints too.
- **Board sizes and shapes vary per stage** (see stage structure above); the
  10×10 area is the layout constant, the board mask is stage data.

## 2. Build order

Each milestone is a shippable/playable state. Rough sizes are relative
(S/M/L), not dates.

### M1 — Match engine (L)

The heart, replacing the repaint-in-place demo in
[`GameScene.ts`](../src/scenes/GameScene.ts):

- Board as a **cell mask** in the 10×10 area from day one — rectangular masks
  first, but nothing may assume cols×rows. Gravity and refill follow the mask.
- Match detection (3+ in a row/column), clear with scoring by count.
- Gravity + refill from stage seed colours.
- Cascade resolution loop (initially shipped with a wave multiplier; M8
  replaces that scoring rule while preserving the loop).
- Move legality: dry-run the move, reject (return home) if no clear results.
- Legal-move detection + auto-reshuffle on dead boards.
- Deterministic RNG seeding hook so Playwright tests can assert board states
  via the existing `window.dyestopia` bridge.
- **Animations** (per shape, blob + mosaic, extending the motion language the
  shipped tiles already carry):
  - **Destruction/clear** — the one wholly new primitive (blob: liquid
    pop/burst; mosaic: crack out of the grout). The genre's feel hangs on it.
  - **Gravity fall** — per-column stagger and fall physics; landing reuses
    the existing drop settle.
  - **Spawn** — new tiles entering from above the board edge.
  - **Illegal-move refusal** — a distinct accent (wiggle/flash) so "not
    allowed" doesn't read like a missed drop; the legality rule teaches
    itself.
  - **Reshuffle choreography** — board-wide scramble built on the swap-travel
    skeleton.

*Exit: pure swap-based match-3 is playable and tested on one hardcoded stage.*

### M2 — Merging on top (M)

- Merge move: both tiles take the result colour (mechanic exists from the
  demo), then the match check runs.
- The **merge-before-swap resolution order** (see part 1) as the single entry
  point for every drop.
- Merge-clear score bonus (superseded by M8's chain multiplier);
  stage-active gating via existing `stageMix`.
- **Animation:** sequencing, not a new primitive — the existing merge
  pulse/tint-flash must hand off into the destruction so mix → burst reads as
  cause and effect.

*Exit: the actual game loop — match + merge — is playable.*

### M3 — Combo spike (S, timeboxed)

- Flood-fill colour-change prototype behind a `dyestopia` debug flag.
- **Animation is half the prototype:** a propagating recolour wave (per-tile
  tint crossfade exists; the distance-staggered ripple doesn't). Whether the
  mechanic reads at all depends on it.
- Playtest, decide: in (→ scope into M5 stages) or out (→ parking lot).

### M4 — Stages & meta (M)

- Extend `Stage` with threshold + move budget; win/lose flow, retry.
- Stage-select scene, linear unlock, localStorage progress.
- Author 10 stages: 1–3 teaching (match → merge → cascade), 4–10 curve into
  tertiary colours; per-stage hint line.
- **Animations** (HUD/meta layer — shape-agnostic, all new):
  - **Score feedback** — floating "+N" from cleared tiles, counter tick-up,
    and an escalation cue (retargeted in M8 from cascade depth to the
    player-built multiplier).
  - **Threshold & budget** — a moment when the threshold is crossed; a
    warning read on the last few moves.
  - **Win / lose** — board-wide celebration burst + score tally; a
    kind-but-deflating fail state.
  - **Stage select** — unlock reveal for a newly opened stage; scene
    transitions.

*Exit: someone can play front to back, close the tab, and come back.*

### M5 — Feel & mobile polish (M)

- SFX: match, merge, cascade wave, illegal move, win, lose (~6–8 sounds),
  mute toggle in settings.
- Animation *polish* pass — every animation is built in its own milestone
  (M1/M2/M4 above); this is tuning timings, easings and per-shape flavour
  against real play, not first implementations.
- Mobile-web pass: portrait layout, touch drag feel, viewport metas,
  performance on a mid phone via `dev:host`.

*Exit: it feels like a game, not a tech demo, on a phone.*

### M6 — Coherent visual system (M)

Give menus and the in-round HUD one readable, recognisable language across
every selectable background. The direction is **dye-lab labels over pigment**:
backgrounds stay expressive, while information and controls sit on restrained
surfaces with predictable contrast.

#### Architecture boundary

This milestone is a presentation layer, not a new dependency of the game:

- Define semantic visual tokens (surface, primary/secondary ink, accent,
  warning, spacing, type scale, radii and motion) behind one visual-system
  resolver. Scenes ask for roles such as `surface` and `primaryInk`; they do
  not contain background ids, sampled colours or contrast heuristics.
- Build a small set of Phaser UI factories/components — surface, button,
  segmented control, info strip and progress meter — which own their artwork,
  interaction states and text styling. Scene code supplies content, position
  and actions.
- Start with one universal high-contrast recipe that works over all five
  backgrounds. Leave an optional `VisualProfile`/resolver seam so a future
  background can select a light, dark or tinted recipe without changing scene
  layout or the background registry.
- Keep `board.ts`, stage data, scoring, move resolution, `Tile` and colour
  themes independent of UI profiles. The visual layer may observe game state;
  game state must not know how it is presented.
- Keep the primitives Phaser-local and shallow. No component framework,
  dependency-injection container or general design-system machinery is
  introduced for five scenes.

#### Screen work

- **Game HUD:** replace loose text with one compact top label containing stage,
  score/target progress, moves and the route back to stages. Moves gain semantic
  warning/critical states; the board itself remains unboxed.
- **Hint strip:** place the stage hint on a readable bottom surface; dim it
  after the first valid move and allow contextual re-emphasis later without
  coupling that behaviour to the board engine.
- **Menu:** preserve the large title and pigment strip, but group Play and
  Settings into a deliberate control surface with clear primary/secondary
  hierarchy.
- **Settings:** use segmented controls for shape and colours, a real sound
  switch, and visual background thumbnails in a swipeable/paged selector so no
  option can overflow the phone viewport. Keep the live tile preview on a
  neutral preview shelf.
- **Stage select and round overlays:** apply the same surfaces, button hierarchy
  and typography to navigation, unlock, win and lose states.
- Verify safe-area/portrait layout, keyboard and pointer focus states, minimum
  touch targets, and readable contrast over every background at both supported
  DPRs.

#### Verification and changeability

- Add component-level tests for semantic states and scene tests for hierarchy,
  bounds and persistence; avoid pixel-perfect snapshots as the primary
  contract.
- Capture a small visual matrix (five backgrounds × the menu, settings and game
  HUD) for human review.
- Prove the seam before exit by swapping the resolver to a second test profile
  without changing any scene or gameplay code.

*Exit: every MVP screen is readable and visually coherent on every background,
and a future visual recipe can replace or adapt the current one entirely inside
the presentation layer.*

### M7 — Switchable art direction (M)

Turn the M6 presentation seam into player-selectable visual skins. **Spray
Can** is the reference implementation; **Splash Colors** follows as a strict
restyle of the same composition.

#### Skin contract

- Persist a `visualStyle` setting independently from tile shape, colour recipe
  and background. A stale skin id falls back safely.
- A skin owns semantic colours, typography, radii, borders, shadows, surface
  texture and component motion. It may not own game rules, stage data or scene
  navigation.
- Shared UI factories expose a small number of deliberate treatment variants
  instead of scenes branching on skin ids.
- Selecting a skin rebuilds the presentation scene so every object reads one
  coherent profile. Switching never changes progress or an in-flight setting.

#### Spray Can reference skin

- Translate the exploration's dark spray-booth language: condensed label type,
  signal-yellow primary actions, hard offset shadows, construction-line
  borders, subtle diagonal surface texture and vivid pigment accents.
- Apply it to menu, settings, stage ledger, game HUD/hint strip, and win/lose
  overlays; retain the M6 readability and touch-target guarantees.
- Review all backgrounds, both supported DPRs, and portrait/landscape layouts.

#### Splash Colors follow-up

- Implement Splash Colors using **the exact object positions, dimensions,
  hierarchy and responsive breakpoints established by Spray Can**.
- Change only visual tokens and component drawing: light surfaces, soft
  shadows, rounded geometry, playful type, gradients and decorative colour
  treatment.
- Any desired positional change is a shared layout improvement and must be
  applied and verified for every skin, never hidden in Splash-specific code.

#### Verification

- Test registry fallback, persistence, user selection and scene-wide treatment
  consistency.
- Keep bounds, touch targets and navigation tests skin-independent.
- Capture a Spray Can visual matrix before accepting the reference skin, then
  capture matching views for Splash Colors to prove layout parity.

*Exit: Spray Can and Splash Colors can be selected in Settings; every MVP scene
changes coherently, gameplay and layout remain invariant, and both skins pass
the same behavioural/layout suite.*

### M8 — Player-built colour chains (M)

Replace the automatic cascade-wave multiplier with a multiplier the player
earns through consecutive mixing decisions. This makes the longer,
colour-aware route more valuable than taking the first available swap.

#### Rules and scoring model

- A **chain** is the uninterrupted run of legal player merges since the most
  recent legal swap or the start of the round. Illegal drops do not change it.
- The chain records the distinct **result colours** made by those merges, not
  the ingredient colours and not the colours cleared afterward.
- The first merge scores at ×1, then adds its result colour and raises the
  multiplier to ×2.
- A later merge whose result colour is already in the chain keeps the current
  multiplier: orange → orange remains ×2.
- A later merge with a new result colour scores at the current multiplier,
  then adds the result and raises the multiplier by one: orange → green scores
  at ×2 and leaves ×3, up to the stage's maximum.
- Derive `maxMultiplier` from stage rules: start at ×1 and add one for each
  active colour that the stage can produce by mixing two of its active colours.
  Seed primaries do not count merely because they are active. For example, a
  stage that can make orange and green caps at ×3; a no-mix stage caps at ×1.
  Derive this value rather than authoring a second piece of stage data that can
  drift from `active` and the global colour recipes.
- Reaching the maximum puts the persistent chain into **rainbow state**. The
  numeric multiplier still exists for calculation and accessibility, but its
  indicator and score feedback change treatment to communicate completion.
- A legal swap at ×1 is a normal ×1 clear and leaves the chain reset.
- A legal swap with a chain of ×2 or higher cashes it in as a **Chain
  Breaker**: every clear in that swap's complete resolution scores at twice
  the current multiplier. A ×3 chain therefore resolves at an effective ×6.
- If the persistent chain is at its stage maximum when swapped, it becomes an
  **Rainbow Chain Breaker** and every clear in that resolution scores at
  three times the current multiplier instead. A stage capped at ×3 therefore
  resolves its Rainbow Chain Breaker at an effective ×9.
- The Chain Breaker uses a snapshot of the persistent multiplier and maximum state
  taken when the legal swap begins. Gravity/refill cascades share that same
  effective value and do not alter it.
- Once the entire swap resolution has finished — all clears, falls, refills
  and cascades, immediately before win/lose/reshuffle handoff — reset the
  persistent chain to ×1. A Chain Breaker never carries into the next player move.
- A legal merge never cashes in or resets the chain. Illegal drops and free
  reshuffles do not change it.
- Remove the existing merge-specific score bonus and cascade-wave multiplier
  so the displayed multiplier is the single, explainable multiplier applied
  after summing the cleared tiles' tier values.
- Starting, retrying, winning or leaving a round resets the chain to ×1.

Represent this as explicit gameplay state: persistent chain results/current
multiplier, derived stage maximum, and an optional per-resolution scoring
snapshot (`normal`, `chain-breaker`, or `rainbow-chain-breaker`, plus effective multiplier).
Scoring consumes the resolution snapshot; it must not infer chain progress
from animation wave numbers or mutable UI state. Expose all three values
through the existing debug board report so tests and future hints can inspect
them without reading Phaser objects.

#### Feedback and information hierarchy

- Show the current multiplier persistently in the in-round info area, at ×1
  from the opening deal. It belongs beside score/target rather than on the
  board and must work in every visual skin and supported layout. Also expose
  progress toward the cap, for example `×3 / ×4`, without making the maximum
  compete with the current value.
- When a merge starts or extends a chain, animate the multiplier into its new
  value. Repeating a known result gives a smaller hold/confirmation treatment;
  a plain ×1 swap remains quiet.
- At maximum, replace the normal single-colour accent with a restrained
  animated rainbow treatment: a spectrum edge or moving gradient around the
  multiplier badge, `MAX ×N` as readable text, and a slow pigment shimmer.
  Keep the badge surface stable so it does not look like a new button.
- On a Chain Breaker, let the badge expand or split from `×N` into
  `×N ×2 → ×2N`, then send two colour ribbons toward the cleared line. On an
  Rainbow Chain Breaker, use three ribbons, a brief full-spectrum board-edge
  pulse and `RAINBOW CHAIN BREAKER ×3 → ×3N`. The effect should celebrate the cash-in while
  keeping tile colours readable and touch targets unobscured.
- Floating score labels show the points actually awarded and their multiplier.
  Their scale, weight, colour contrast and motion intensity step up with the
  current multiplier, with sensible visual caps so long chains remain readable.
- Rainbow scoring uses a light/neutral text fill for legibility with a
  spectrum outline, shadow or trailing pigment bands; do not fill the glyphs
  with a fast gradient that makes the number hard to read. Chain Breaker scores show
  the effective multiplier (for example `+270  ×9`) and retain the rainbow
  treatment for every cascade in that one resolution.
- The persistent score counter echoes the same hierarchy briefly when points
  land. Do not use cascade depth to style score feedback; two clears at ×3
  should share the same prominence even if one is an automatic wave.
- Give first-time players a concise hint that mixing different result colours
  grows toward rainbow, and swapping cashes in and breaks the chain.

#### Verification

- Unit-test chain transitions: initial ×1; first result ×2; repeated result
  holds; a second distinct result reaches ×3; further distinct results stop at
  the derived stage maximum; illegal drops and reshuffles leave state unchanged.
- Unit-test cap derivation for a no-mix stage, a secondary-colour stage and a
  tertiary-colour stage. Invalid/incomplete recipes must not inflate the cap.
- Unit-test swap snapshots: ×1 stays ×1; a non-max chain doubles; a max chain
  triples; every cascade reads the same snapshot; the persistent chain resets
  only after resolution completes.
- Unit-test scoring independently: every wave of a resolution uses the same
  move-established multiplier, and neither the old merge bonus nor wave depth
  changes the calculation.
- Scene-test current/max/effective values, rainbow entry, Chain Breaker cash-in and
  post-resolution reset through the debug bridge. Cover both merge directions
  through the existing move resolver.
- Extend skin-independent layout tests so the multiplier stays visible without
  colliding with score, target, moves or safe areas.
- Add visual checks at ×1, one below max, rainbow max, Chain Breaker and
  Rainbow Chain Breaker on both tile shapes and both visual skins, including a
  multi-wave cascade, to review prominence without relying on pixel-perfect
  snapshots.

*Exit: a player can deliberately build and read a multi-colour mix chain; all
clears pay the visible multiplier, the stage-specific maximum reads as rainbow,
swaps clearly cash in and reset the chain, Rainbow Chain Breakers reward reaching
the cap, automatic cascades never grow it, and higher-value score feedback is
unmistakably more prominent.*

### M9 — Friends release (S)

- Playtest + bug pass, tune thresholds/scoring.
- A lightweight way to receive feedback (even just a mailto link on the menu).
- Ship to dyestopia.fschmidts.net, send the link.

*Exit: feedback is arriving; its themes decide what post-MVP means.*

## Parking lot (post-MVP, from ideas.md + Q&A)

Tools/special tiles → the content lever · other goal types (move-limit
puzzles, combo goals) · combo rule if the spike said no · modes (rogue-like /
battle / chill) · music loop · greyscale accessibility · a "force swap"
gesture for mergeable pairs · weighted/director-driven refill.
