# Tutorial

## Structure and progression

- The stage-select screen has a separate **Tutorial** section above the regular
  stages.
- Six short tutorial stages unlock sequentially. Tutorial progression and
  regular-stage progression are independent; regular Stage 1 is always
  available.
- The game does not push first-time players into the tutorial. Players may
  explore regular stages first and return when they want more guidance.
- Every completed tutorial or regular stage receives a style-aware **Cleared**
  stamp and remains replayable.
- Only completed lessons persist. Leaving a tutorial midway discards its
  progress and replay starts from the prepared opening state.

## Unlock-all setting

- Add **Unlock all stages** with a switch directly below **Sound** in Settings.
  It has no helper text.
- The setting is off by default, persists across sessions, and makes every
  tutorial and regular stage playable when enabled.
- Enabling it does not clear a stage by itself. Any stage actually completed
  while it is enabled is permanently marked **Cleared**.
- Turning it off restores natural locking, while already-cleared stages remain
  unlocked and replayable.

## Lesson pattern

Each tutorial is a short, action-based lesson on a prepared board. It does not
use a score target or lose condition.

1. Introduce the concept in a blocking, stage-style dialog with a framed visual.
   Explanations are page-based so a lesson can use multiple switchable
   screenshot-and-copy pages when the concept needs them.
2. Demonstrate the intended tiles and destination with a looping gesture.
3. Let the player perform the action.
4. Show a short success message explaining what happened and why it matters;
   the player taps to continue.

The gesture plays once, repeats after a short period of inactivity, and can be
replayed by tapping the objective. It disappears while the player drags.
Incorrect legal moves reset the prepared board without penalty and repeat the
guidance. Illegal moves keep the normal refusal feedback.

Multi-step lessons show **Step N of N** instead of a move budget. HUD
information uses progressive disclosure: Match and Mix show only the board and
objective; chain lessons place the chain indicator directly beside its
explanation; breaker lessons add score feedback. Navigation remains visible
throughout.

After a cleared lesson, the success screen offers **Next tutorial** as the
primary action and **Back to stages** as the secondary action. The final lesson
instead congratulates the player for clearing all tutorials and offers **Back
to stages**.

## Curriculum

1. **Make a Match** — **Swap** a tile to complete a line; observe clearing,
   gravity, and refill.
2. **Mix a Colour** — drag the correct ingredient onto the target; teach that
   a **Mix** is directional and must complete a **Match**.
3. **Build a Chain** — make two different result colours and watch the
   **Chain** indicator fill to 2/3.
4. **Reach Rainbow** — make the final required colour to complete a 3/3
   **Rainbow Chain**.
5. **Break the Chain** — build a non-maximum Chain, then Swap to trigger a
   **Chain Breaker**; cash it in and reset.
6. **Rainbow Chain Breaker** — reach a Rainbow Chain, then Swap; show the
   full-Chain cash-in and reset.

Later lessons repeat only enough earlier interaction to establish context.

## Language

Copy is brief and direct, with a little pigment character but no lore or jokes
that obscure the mechanic. Canonical terms use consistent capitalization and
a distinct visual treatment in instructions and success messages:

- **Match** — line up and clear three or more tiles.
- **Swap** — exchange two neighbouring tiles to make a Match.
- **Mix** — pour one colour onto a neighbouring tile to create a new colour
  and complete a Match.
- **Chain** — consecutive Mixes producing different result colours.
- **Rainbow Chain** — a Chain that has reached the stage maximum.
- **Chain Breaker** — a Swap that cashes in a Chain.
- **Rainbow Chain Breaker** — a Swap that cashes in a Rainbow Chain.
