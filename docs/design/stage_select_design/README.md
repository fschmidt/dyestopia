# Handoff: Stage Select System (Option 3a)

## Overview
A consistent two-screen flow for entering gameplay: **Mode Select → Stage Select → Game**. Covers two modes (Tutorial, Core), per-stage cleared/locked states, and progressive disclosure of stage descriptions via a persistent detail strip. Stages unlock sequentially — a stage is playable only when the previous one is cleared.

## About the Design Files
`design_reference_3a.html` is a **design reference created in HTML** — a static mock showing intended look and states, not production code. Recreate it in your codebase's existing environment (game engine UI, React, native, etc.) using your established patterns. If no UI framework exists yet, pick what fits your stack.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy structure are final intent — recreate pixel-close. Stage names and descriptions in the mock are placeholders; swap in real content.

## Screens

### 1. Mode Select (`3a Mode select`)
- Portrait phone canvas 390×800, padding 36px 24px 28px, column flex.
- **Title banner**: centered, cream `#ECE8DD` bg, padding 12px 36px, hard drop shadow `0 3px 0 rgba(0,0,0,0.4)`. Text "SELECT MODE", 900 weight, 26px, letter-spacing 6px, ink `#1C1712`.
- **Mode cards** (stacked, 18px gap, 48px below banner). Each card: bg `#161411`, padding 22px, column flex, 10px gap.
  - Row: mode name (900, 24px, ls 2px, `#F0EAD8`, flex:1) + right-side status.
  - Completed mode (Tutorial): border `1px solid #3A342C`; status = CLEARED stamp (see Tokens).
  - Active mode (Core): border `1px solid #EDC22E`, shadow `0 4px 0 rgba(0,0,0,0.4)`; status = "3 / 10" (700, 13px, `#8A8478`).
  - **Segment progress bar**: one flex row, 6px gap, one 10px-tall segment per stage; filled `#EDC22E`, unfilled `#33302A`.
- **Back button** pinned to bottom center: bg `#1D1B17`, border `1px solid #4A4335`, text "‹  Title" (700, 16px, `#D8D2C4`), padding 12px 44px.
- Tap a mode card → Stage Select for that mode.

### 2. Stage Select (`3a Stage select` / `3a Cleared selected`)
- Same canvas, banner shows mode name ("CORE").
- **Stage grid panel**: bg `#161411`, border `1px solid #3A342C`, padding 14px; CSS grid, 2 columns, 10px gap; 28px below banner.
- **Stage tile** (padding 10px 12px, relative): stage number (900, 20px) above stage name (700, 12px, ls 1px). Four states:
  - **Cleared**: bg `#25211A`, border `1px solid #7D6A2E`; number `#EDC22E`, name `#C9C2B2`; CLEARED stamp top-right (top 7, right 7).
  - **Next up / unlocked**: bg `#EDC22E`, border `1px solid #F5D75C`, shadow `0 3px 0 rgba(0,0,0,0.4)`; number + name `#1C1712`. This is the default selection on entry.
  - **Locked**: bg `#1B1815`, border `1px solid #33302A`; number + name `#57534A` (name stays visible); **tilted lock icon** top-right (top 8, right 9, rotate −8°) — see Assets. Not selectable.
  - **Selected (cleared)**: bg `#ECE8DD`, border `1px solid #FFF`, same hard shadow; number + name `#1C1712`; stamp inverts (bg `#1C1712`, text `#EDC22E`).
- **Detail strip** (persistent, 14px below grid): bg `#1D1B17`, border `1px solid #4A4335`, top border 2px in the accent of the selected tile (`#EDC22E` for next-up, `#ECE8DD` for cleared), padding 18px 20px, column flex 10px gap.
  - Header row (baseline-aligned, 12px gap): number (900, 30px, accent color) · name (900, 19px, ls 2px, `#F0EAD8`, flex:1) · right tag: "NEXT UP" label (700, 12px, ls 2px, `#8A8478`) or CLEARED stamp.
  - Description (500, 14px, lh 1.5, `#B5AFA3`) — this is the progressive-disclosure home for stage descriptions; they appear nowhere else.
  - CTA: **PLAY** (bg `#EDC22E`, ink text, 900, 17px, ls 3px, centered, padding 14px 0, shadow `0 4px 0 rgba(0,0,0,0.5)`) or **REPLAY** for cleared stages (transparent bg, border `1px solid #EDC22E`, text `#EDC22E`, no shadow).
- Back button "‹  Modes" bottom center (same style as screen 1).

## Interactions & Behavior
- Mode Select: tap card → push Stage Select. Locked-mode concept doesn't exist at mode level (both always enterable).
- Stage Select: tapping any unlocked tile selects it and updates the detail strip (name, description, CTA, accent). Locked tiles are inert (optionally a small shake/denied feedback). Default selection on entry = first uncleared stage.
- PLAY/REPLAY → launch game with selected stage.
- Clearing a stage: mark it CLEARED, unlock the next, and update the mode card's segment bar and "n / N" count.
- Suggested transitions: screen push ~250ms ease-out; detail strip content swap ~120ms fade; no other animation required.

## State Management
- `modes[]`: id, name, stages[].
- `stage`: id, number, name, description, cleared:boolean.
- Derived: `unlocked(stage) = index === 0 || stages[index-1].cleared`; `nextUp = first !cleared`.
- UI state: `selectedStageId` (per stage-select screen), current mode.
- Persistence: cleared flags in player save.

## Design Tokens
Colors
- Ink (darkest): `#1C1712` · panel bg: `#161411` · card bg: `#1D1B17` · locked tile bg: `#1B1815`
- Cleared tile bg: `#25211A`; cleared tile border: `#7D6A2E`
- Borders: default `#3A342C`, elevated `#4A4335`, locked `#33302A`
- Accent yellow: `#EDC22E` (hover/bright: `#F5D75C`) — means "interactive / next"
- Paper cream: `#ECE8DD` (banners, selected-cleared) · text bright: `#F0EAD8` · text body: `#B5AFA3` · text muted: `#8A8478` · text disabled: `#57534A`
- Screen bg: radial gradient `120% 90% at 20% 10%`: `#3A2A1E → #241A16 45% → #1C1216 75% → #150F12`, plus a diagonal scanline overlay `repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px)`.

Typography — single family **Archivo** (variable; weights 500–900). Scale: banner 26/900 ls6 · mode name 24/900 ls2 · strip number 30/900 · strip name 19/900 ls2 · tile number 20/900 · CTA 17/900 ls3 · back 16/700 · body 14/500 · name-on-tile 12/700 ls1 · stamp 9–11/900 ls1.5–2. All labels uppercase except back buttons.

Shadows — hard offset, no blur: `0 2px|3px|4px 0 rgba(0,0,0,0.35–0.5)`. No border radius anywhere (sharp corners are intentional).

**CLEARED stamp** (shared component): bg `#EDC22E`, ink text, 900 weight, ls 1.5–2px, padding ~3px 6px (9px font on tiles, 11px on mode cards), `transform: rotate(-4deg)`, optional hard shadow on larger sizes. Inverted variant on cream tiles.

## Assets
- **Lock icon** (inline SVG, drawn for this design — no external dependency): 16×18 viewBox; shackle = stroked path `M4 8V5.5C4 3.3 5.8 1.5 8 1.5C10.2 1.5 12 3.3 12 5.5V8` (stroke `#57534A`, width 2.5); body = rect 2,8 12×9 fill `#57534A`; keyhole = rect 7,11 2×3.5 in tile bg color. Rendered at 15×17, `rotate(-8deg)`, positioned top-right of locked tiles.
- Font: Archivo via Google Fonts (`wght 500–900`).
- No raster assets.

## Files
- `design_reference_3a.html` — open in any browser; shows all three screens side by side (Mode select · Stage select with next-up selected · Stage select with a cleared stage selected).
