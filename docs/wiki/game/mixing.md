# Mixing

Dragging a tile onto a neighbour **pours** that colour into it. If the two
colours have a recipe, and the recipe's result is active in this stage, and
dyeing the target would complete a line of three — both tiles become the result
colour and the line clears.

All three conditions must hold. Miss any one and the game falls back to trying a
swap, and failing that, returns the tile home for free.

## Why "the mix must complete a line"

This is the rule that shapes every stage. You cannot mix speculatively to stock
up on a colour; the new colour has to land as the third tile of a row or column.

Which is why stage boards author their starting secondaries as **in-line pairs**:
two oranges sitting next to each other are an invitation, waiting for you to
walk a red next to a yellow beside them. Any loose secondary you see beyond
those pairs is a merge survivor — the dragged tile keeps its new colour even
when the cleared line did not include it.

## Recipes

<!-- generated:recipes -->
| Recipe | Result | Tile value |
| --- | --- | --- |
| red + yellow | orange | 20 |
| yellow + blue | green | 20 |
| red + blue | purple | 20 |
| red + orange | vermilion | 30 |
| yellow + orange | amber | 30 |
| yellow + green | chartreuse | 30 |
| blue + green | teal | 30 |
| blue + purple | violet | 30 |
| red + purple | magenta | 30 |
<!-- /generated:recipes -->

Recipes are order-independent as *recipes* — red + yellow and yellow + red both
name orange. Direction still matters as a *move*, because the dragged tile
decides which tile gets dyed, and therefore which line can complete.

## What each stage allows

A recipe only applies where both ingredients and the result are active. This
table is the practical answer to "what can I build here", and the max multiplier
column is a direct consequence: it is ×1 plus one step per available recipe.

<!-- generated:stage-mixes -->
| Stage | Recipes in play | Max multiplier |
| --- | --- | --- |
| Mix a Colour | red+yellow→orange | ×2 |
| Build a Chain | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| Reach Rainbow | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| Break the Chain | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| Rainbow Chain Breaker | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| Mixing Lesson | red+yellow→orange | ×2 |
| Cascade Lesson | red+yellow→orange, yellow+blue→green | ×3 |
| Royal Purple | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| The Diamond | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| Twin Wells | red+yellow→orange, yellow+blue→green, red+blue→purple | ×4 |
| Deep Teal | red+yellow→orange, yellow+blue→green, blue+green→teal | ×4 |
| Amber Glow | red+yellow→orange, yellow+blue→green, yellow+orange→amber | ×4 |
| The Hourglass | red+yellow→orange, yellow+blue→green, red+blue→purple, red+purple→magenta | ×5 |
| Full Spectrum | red+yellow→orange, yellow+blue→green, red+blue→purple, blue+green→teal, yellow+orange→amber | ×6 |
| Free Move | red+yellow→orange, yellow+blue→green | ×3 |
<!-- /generated:stage-mixes -->

Stages absent from this table have no mixable recipes at all — they are pure
match-3, and every move there is a swap.
