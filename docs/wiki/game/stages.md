# Stages

Stages are numbered globally across three sections — Tutorial, Core, Tools — and
unlock linearly within each. The Tools section is gated behind the last core
stage.

<!-- generated:stages -->
| # | Section | Name | Target | Moves | Board (cells) | Max × | Active colours |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Tutorial | Make a Match | 1350 | 8 | 5×5 (25) | ×1 | red, yellow, blue |
| 2 | Tutorial | Mix a Colour | 2400 | 8 | 6×6 (36) | ×2 | red, yellow, blue, orange |
| 3 | Tutorial | Build a Chain | 5500 | 12 | 8×8 (64) | ×4 | red, yellow, blue, orange, green, purple |
| 4 | Tutorial | Reach Rainbow | 5500 | 12 | 8×8 (64) | ×4 | red, yellow, blue, orange, green, purple |
| 5 | Tutorial | Break the Chain | 5500 | 12 | 8×8 (64) | ×4 | red, yellow, blue, orange, green, purple |
| 6 | Tutorial | Rainbow Chain Breaker | 5500 | 12 | 8×8 (64) | ×4 | red, yellow, blue, orange, green, purple |
| 7 | Core | First Splash | 1350 | 8 | 5×5 (25) | ×1 | red, yellow, blue |
| 8 | Core | Mixing Lesson | 2400 | 8 | 6×6 (36) | ×2 | red, yellow, blue, orange |
| 9 | Core | Cascade Lesson | 1800 | 5 | 7×7 (49) | ×3 | red, yellow, blue, orange, green |
| 10 | Core | Royal Purple | 5500 | 12 | 8×8 (64) | ×4 | red, yellow, blue, orange, green, purple |
| 11 | Core | The Diamond | 1700 | 7 | 9×9 (41) | ×4 | red, yellow, blue, orange, green, purple |
| 12 | Core | Twin Wells | 2000 | 10 | 10×7 (60) | ×4 | red, yellow, blue, orange, green, purple |
| 13 | Core | Deep Teal | 2500 | 8 | 8×8 (64) | ×4 | red, yellow, blue, orange, green, teal |
| 14 | Core | Amber Glow | 3650 | 10 | 9×9 (77) | ×4 | red, yellow, blue, orange, green, amber |
| 15 | Core | The Hourglass | 2500 | 18 | 9×7 (45) | ×5 | red, yellow, blue, orange, green, purple, magenta |
| 16 | Core | Full Spectrum | 5700 | 11 | 10×10 (100) | ×6 | red, yellow, blue, orange, green, purple, teal, amber |
| 17 | Tools | Free Move | 1800 | 10 | 7×7 (49) | ×3 | red, yellow, blue, orange, green |
<!-- /generated:stages -->

"Board" is the authored area and, in brackets, the number of real cells: boards
are **masks, not rectangles**, so a 9×9 diamond has far fewer than 81 cells.

## Board notation

A stage's board is authored as rows of characters inside a 10×10 area:

```
....#....
...###...
..#####..
.##oo###.
###pp####
```

- `#` — a playable cell
- `.` — a gap; tiles never occupy it, and falls route around it
- a letter — a playable cell whose *opening* tile is fixed

Letters follow the colour ids, with one collision resolved: `v` is vermilion, so
violet is `i`. The rest are `r y b o g p a c t m`.

Those fixed letters are how a stage seeds colours its refills will never drop.
They are authored as **in-line pairs** — two of a colour side by side — because
a mix is only legal when it completes a line, so a pair is a standing
opportunity waiting for the right primary to arrive next door.

## Shapes and what they do

The core run walks deliberately through board geometry:

- **Solid rectangles** (First Splash, Mixing Lesson, Royal Purple) — falls behave
  predictably; the lesson is the colour rule, not the terrain.
- **The Diamond** — single-cell tips and inward funnelling, so gravity
  concentrates tiles toward the middle.
- **Twin Wells** — two separated columns over one shared floor; matches only
  cross underneath.
- **The Hourglass** — everything routes through a one-cell waist.
- **Full Spectrum** — the entire 10×10 area and the widest palette of the run.

## Dev board

There is an eleventh, unlisted stage: a plain 8×8 board with an effectively
bottomless budget, reachable only through the debug bridge. It exists so engine
tests never trip over the win/lose flow.
