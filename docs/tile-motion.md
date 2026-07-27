# Tile motion: drag, swap, merge — and clear, fall, refuse

Design notes for the gameplay moves, for both shapes. Companion to the
tile style explorations doc. Implemented: the numbers live in each shape's
`motion` block (`src/tiles/shapes/`), the shared skeleton in `src/tiles/Tile.ts`.

## Principles

1. **Same skeleton, different flavour.** Every move has one shared tween
   structure (pick up → travel → settle). The shapes only differ in the
   parameters: durations, overshoot, whether the tile deforms. This keeps the
   game feel consistent across styles and the code to one implementation.
2. **Transforms carry the move; frames carry the flourish.** As established in
   `Tile.ts`: position, scale, angle, alpha and tint are tweens. The baked
   idle frames are only borrowed for accents — speeding the blob's wobble up
   when it's agitated, jumping the mosaic to its glint window so a landing
   tile catches the light. Both are free: `anims.timeScale` and
   `anims.setCurrentFrame` on textures we already have.
3. **The shapes have opposite physics.** The blob is liquid: it stretches,
   sloshes, absorbs. The mosaic is ceramic set in grout: it is rigid, lifts
   out square, and *clicks* back in — its life is light, not deformation
   ("the light moves, not the tile"). Every parameter below follows from
   that: blob animations are slower and elastic, mosaic ones are quick and
   crisp.

## Dragging

Three phases: pick up (pointer down + move threshold), follow, drop.

### Shared skeleton

- **Pick up:** scale up, bring to top depth, kill the hover tween.
- **Follow:** the tile chases the pointer with a short lerp (~0.25/frame)
  rather than snapping — the lag is what sells weight, and it gives us a
  per-frame velocity to drive the shape-specific lean/stretch.
- **Drop:** tween to the destination cell centre, settle, restore depth.

### Splash (blob)

- **Pick up:** scale to **1.12** with `Back.easeOut` (170 ms) — it's the hover
  lift, but juicier. Bump `anims.timeScale` to **~1.8**: the outline wobbles
  faster, wet paint agitated by being picked up.
- **Follow:** the blob *flows* toward the pointer — it elongates along the
  actual pull direction, not a screen axis, by an amount driven by how far
  the pointer has run ahead. Pull hard and it smears out toward your finger;
  let it catch up and it contracts back to round. Two mechanics carry it:
  - **Directional stretch from transforms alone:** no transform can stretch a
    sprite along an arbitrary axis, but a pair can — the container rotates to
    the pull direction and stretches along its own x (up to +32%), while the
    sprites inside counter-rotate so the artwork and its light stay upright.
    The net transform is a pure directional stretch: the silhouette shears
    exactly the way slime pulls, and the baked highlight never swings. On
    release the wind-up cancels itself, so it snaps to rest invisibly.
  - **A damped spring, not a lerp:** the stretch amount chases the pull
    through a spring (stiffness 0.16, damping 0.9), so it overshoots and
    wobbles back to round when the pointer stops mid-drag — the jiggle that
    sells thick liquid. The mosaic defines no `flow`: it keeps the rigid
    axis-aligned pose and lean, because ceramic doesn't pour.
- **Drop:** land with a splat: `scaleX 1.18 / scaleY 0.84` on impact, then
  `Back.easeOut` to 1 over 260 ms. `timeScale` eases back to 1 over ~400 ms so
  the paint visibly calms down after landing.

### Mosaic

- **Pick up:** scale to **1.08**, and tween `angle` from the jitter rest angle
  to **0** (120 ms, `Quad.easeOut`) — the tile comes out of the grout square
  in your hand. No deformation, ever: it's ceramic.
- **Follow:** rigid, with a velocity-proportional *lean* only: angle tips into
  the movement direction, clamped to ±6°, returning to 0 when still. Slightly
  tighter pointer lerp than the blob (~0.35) — it's a hard object, not a
  slosh.
- **Drop:** the click. Tween to the cell, scale dips to **0.98** and returns
  (90 ms), angle tweens to the destination cell's jitter angle. On landing,
  jump the idle to the start of the **glint window** (frame ≈ `0.08 * frames`)
  so the sweep crosses the glaze as it settles — the light acknowledging the
  placement.

## Swapping

Both tiles exchange cells. The player-initiated tile is the "active" one and
travels on top.

### Shared skeleton

- **Anticipation:** both tiles do a small pull (scale 0.95, ~70 ms) before
  launching — telegraphs the swap and reads as intent, not teleportation.
- **Travel:** both tween to each other's cells; active tile on higher depth.
- **Settle:** each lands with its shape's drop settle from above, and takes
  over the other cell's identity (jitter index for the mosaic).

### Splash (blob)

- **Travel:** 380 ms, `Sine.easeInOut`, and the two tiles **arc around each
  other** — offset each path perpendicular to the travel axis by ~15 % of the
  distance (a counter-tween on the off-axis coordinate), so they slosh past
  like two drops circling in water. Both stretch along their travel direction
  (~1.12) for the duration.
- **Settle:** the splat landing. Nudge one tile's idle `startFrame` if they'd
  end up wobbling in sync — the board must not breathe in unison.

### Mosaic

- **Travel:** 260 ms, `Cubic.easeInOut`, **straight lines** — grid objects
  move on the grid. Both lift (active to 1.08, passive to 1.04, both
  straighten to 0°) and pass over the grout; the height difference lets them
  visibly cross.
- **Settle:** simultaneous clicks — the 0.98 dip, angles to their new cells'
  jitter, and the glint one-shot on *both*, slightly staggered (~60 ms) so it
  reads as two placements, not one flash.

## Merging

The thematic heart: dyes mixing. Merges happen between orthogonal neighbours
and *both tiles survive the mix*: each stays on its cell and both come out
dyed the result colour. Whether a drop merges at all is game logic
(`resolveMove` in `src/board.ts`: merge before swap, and only if the merge
clears — the pair supplies 2 of the 3 result tiles a match needs). The colour
change is a tint tween on the base sprite — interpolate with
`Phaser.Display.Color.Interpolate` in an `onUpdate`, since tint isn't
directly tweenable.

Because a legal merge always clears, the pulse never stands alone: it **hands
off into the destruction**. The pair finishes its swell already part of a
line, and the burst fires the moment the pulse settles — mix → burst reads as
cause and effect, which is the whole pitch of the mechanic. A merged tile the
line doesn't include stays behind as a player-made colour.

### Shared skeleton

- **Contact:** the drop *is* the contact — the dragged tile is released over
  its neighbour, and the mix triggers immediately, not after a return trip.
- **Pulse:** both tiles pulse in place while their tints crossfade; the
  dragged one glides back to its home cell as it happens. Position and pulse
  ride on different properties, so the two tweens coexist.
- **Result:** both tints arrive at the mixed colour. The flash that sells the
  moment is a tint overshoot toward white at the pulse peak — the gloss can't
  exceed alpha 1, so the flash is the tint's job.

### Splash (blob)

Two wet blobs communicating volume.

- **Pulse:** both swell to **1.2** over 160 ms, then `Back.easeOut` down to 1
  over 320 ms. During the swell, `timeScale` spikes to **~2.5** and decays:
  the outline thrashes and calms, the one part of "liquid met liquid" only
  the baked frames can say.
- **Colour:** tint crossfades across the swell (~350 ms), overshooting toward
  white at the peak so the mix reads as a splash of light, then landing on
  the pigment result.

### Mosaic

Ceramic can't flow, so the merge is a *re-firing*: the glaze flashes over and
the pair comes out of the kiln in the new colour.

- **Pulse:** a sharp click pulse on both: 1 → **1.12** → 1 (240 ms total,
  snappier than the blob's swell).
- **Colour:** faster crossfade (~200 ms) landing on the pulse peak, followed
  immediately by the **glint sweep** — the kiln flash that makes the new
  colour official.

## Combo ripple (M3 prototype)

Behind a debug toggle (`dyestopia.combo(true)`, or `?combo` in the URL for
phones): when a merge dyes its pair, adjacent groups whose colour mixes with
the new colour convert too, flood-fill style, and conversions can chain.
The animation is half the prototype — each converted tile plays a lighter,
quicker cousin of the merge pulse, delayed by its flood distance (70 ms per
step), so the recolour visibly travels outward from the merge before the
burst fires. The numbers derive from the shape's merge block; a mechanic on
trial doesn't earn its own parameters until it survives playtesting.

## Clearing

Destruction — matched tiles leaving the board (M1). One shared skeleton:
telegraph (a short swell), burst, gone; the tile destroys itself afterwards.
The parameters live in `motion.clear`.

- **Splash (blob):** the pop. Swells to **1.35** over 110 ms while
  `timeScale` spikes to ~2.8 — the outline thrashes like agitated paint —
  then collapses to nothing in 180 ms with `Back.easeIn`, which winds
  slightly outward before sucking in: a bubble bursting in reverse.
- **Mosaic:** the crack. Barely any swell (1.06, 60 ms — ceramic doesn't
  inflate), the glint jumps at the burst start (the light catching the break),
  then a quick 120 ms vanish with an angular jolt of **14°** — the tessera
  twisting out of its grout.

## Falling and spawning

Gravity (M1). Every fall shares one constant acceleration: duration is
`fall.unit × √cells`, which is real physics — and means tiles dropping down
the same column keep their spacing instead of overtaking mid-flight. Columns
stagger by a few ms so a board-wide collapse sweeps rather than thuds.
Landing reuses the shape's drop settle (the splat, the click); new tiles
stack above the top edge and pour in on the same curve, with a short alpha
fade so they don't pop into existence over the HUD. Blob unit 200 ms, mosaic
170 ms.

## Refusal

The legality rule made visible (M1): a drop the rules reject returns home on
the normal drop skeleton, then **head-shakes** (the existing reject wiggle) —
and the spurned neighbour shakes too. Distinct from a missed drag, which goes
home without commentary; the difference is what teaches "every move must
clear".

## Reshuffling

A dead board rearranges itself (M1): every moving tile travels to its new
cell on the swap skeleton — arcs, lifts, staggered starts — so the scramble
reads as the board reshuffling itself rather than a teleport.

## Implementation notes

- **Shape-driven parameters.** Add a `motion` block to `Shape` (like `pad`,
  `gap`, `jitter` already are) with the numbers above: lift scale, travel
  durations, stretch clamps, `straighten` flag, `glintOnLand` frame, swell
  factors. `Tile` implements one `pickUp()/drag()/drop()/swapTo()/mergeInto()`
  set that reads them; neither shape gets bespoke code paths.
- **`restAngle` becomes cell-owned.** Swap and drop move tiles between cells,
  and the mosaic's jitter belongs to the *cell* (index-cycled), not the tile —
  so `restAngle` can no longer be `readonly`; the destination cell's angle is
  handed to the settle tween.
- **Interruption.** Every move starts with `tweens.killTweensOf(this)` (and
  the hover handlers ignore a tile mid-move) — moves must be interruptible or
  fast swaps will fight the hover lift.
- **Gloss stays in lock-step for free.** Frame tricks (glint jump, timeScale)
  only touch the base sprite; the existing `ANIMATION_UPDATE` relay keeps the
  gloss on the same frame.
- **Depth.** Dragged/active/consumed tiles get a raised depth for the duration
  and restore it on settle, so crossing tiles never z-fight.
