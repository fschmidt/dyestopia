# Colours

Dyestopia uses the **RYB pigment wheel**, not light: red and green make a muddy
tertiary here, the way paint does, not yellow the way screens do.

A colour is an identity, not a pixel value. What red *looks* like belongs to the
active theme; which colours are *in play* belongs to the stage.

## The wheel

Tier is mixing depth: primaries cannot be made, secondaries mix from two
primaries, tertiaries mix from a primary and a secondary. Deeper colours are
harder to build, so they are worth more per tile.

<!-- generated:colours -->
| Colour | Tier | Mixes from | Tile value |
| --- | --- | --- | --- |
| red | primary | — | 15 |
| yellow | primary | — | 15 |
| blue | primary | — | 15 |
| orange | secondary | red + yellow | 20 |
| green | secondary | yellow + blue | 20 |
| purple | secondary | red + blue | 20 |
| vermilion | tertiary | red + orange | 30 |
| amber | tertiary | yellow + orange | 30 |
| chartreuse | tertiary | yellow + green | 30 |
| teal | tertiary | blue + green | 30 |
| violet | tertiary | blue + purple | 30 |
| magenta | tertiary | red + purple | 30 |
<!-- /generated:colours -->

## Active versus seed

Every stage carries two colour lists, and confusing them is the usual source of
"why can't I make that":

- **Active** — the colours the stage permits *at all*. A mix whose result is not
  active simply will not happen.
- **Seed** — the colours a refill may drop. Almost always the three primaries.

So a stage that lists `teal` as active but not as seed is telling you: teal
exists here, and the only teal on this board is the teal you make.

Stages place their starting secondaries and tertiaries directly in the opening
deal, as authored letters in the board layout — see [Stages](stages.md).

## Naming

The twelve ids are `red`, `yellow`, `blue`, `orange`, `green`, `purple`,
`vermilion`, `amber`, `chartreuse`, `teal`, `violet`, `magenta`. These are the
names used in code, in stage definitions and in this wiki. Board-layout letters
differ in one place: `v` is vermilion, so violet is authored as `i`.
