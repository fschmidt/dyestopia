# Tools

A tool is a limited, per-run ability. A stage that grants tools shows a tray;
stages that grant none show nothing. Uses do not carry between runs, and
restarting a stage restores the full allowance.

<!-- generated:tools -->
| Tool | Uses | Stage | Section |
| --- | --- | --- | --- |
| freeMove | 3 | Free Move | Tools |
<!-- /generated:tools -->

## Free Move

Relaxes **one** constraint: adjacency. With Free Move active you may drag a tile
onto any other tile on the board, however distant.

Everything else is unchanged. The move must still be legal — the mix must still
complete a line, or the swap must still create a match — and it still costs a
move. A Free Move that resolves nothing is still illegal and still free.

A use is consumed when the move resolves, not when the tool is activated.

## The pattern for later tools

Each tool gets its own stage in the Tools section, and that stage does double
duty: it teaches the tool, and it is the focused proving ground where the tool's
interactions with scoring, chains, cascades, legal-move detection, reshuffles
and stage reset get tested.

Candidate tools not yet built live as idea cards: [recolour](../../planning/tasks/I-001-recolour-tool.md),
[reposition](../../planning/tasks/I-002-reposition-tool.md),
[destroy](../../planning/tasks/I-003-destroy-tile-tool.md),
[palette swap](../../planning/tasks/I-004-palette-swap.md),
[colour bomb](../../planning/tasks/I-006-colour-bomb.md) and
[defy gravity](../../planning/tasks/I-009-defy-gravity.md).
