# 🎨 Dyestopia

Ein Farbspiel, gebaut mit [Phaser 4](https://phaser.io) und Vite.

**Live:** https://dyestopia.fschmidts.net

## Schnellstart

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | Was |
|--------|-----|
| `npm run dev` | Dev-Server mit HMR |
| `npm run build` | Typecheck + Production-Build nach `dist/` |
| `npm run preview` | Production-Build lokal servieren |
| `npm run typecheck` | Nur TypeScript prüfen |

## Projektstruktur

```
index.html            # Mount-Point (#game) + Entry-Script
public/
  CNAME               # Custom Domain für GitHub Pages — nicht löschen
  favicon.svg
src/
  main.ts             # new Phaser.Game(gameConfig)
  config.ts           # GameConfig: Auflösung, Scaling, Scene-Reihenfolge
  palette.ts          # Farbvokabular (PALETTE + DYES) — single source of truth
  style.css           # Seiten-Chrome ums Canvas herum
  scenes/
    BootScene.ts      # Preload + Ladebalken → Menu
    MenuScene.ts      # Titel, Swatch-Animation, Start
    GameScene.ts      # Platzhalter-Runde (Zielfarbe finden)
```

### Design-Auflösung

`960 × 720` in [`src/config.ts`](src/config.ts). `Phaser.Scale.FIT` skaliert das
Canvas auf jede Bildschirmgröße (mit Letterboxing), `CENTER_BOTH` zentriert es —
Szenen können also mit festen Koordinaten arbeiten.

### Farben

Alle Farben kommen aus [`src/palette.ts`](src/palette.ts). Phaser will Zahlen
(`0xrrggbb`), CSS/Text-Styles wollen Strings — dafür gibt es `toCss()`.

## Deployment

Push auf `main` → GitHub Actions
([`.github/workflows/deploy.yaml`](.github/workflows/deploy.yaml)) baut und
deployed nach GitHub Pages.

Die Custom Domain hängt an zwei Dingen:

1. **`public/CNAME`** mit `dyestopia.fschmidts.net` — landet beim Build in
   `dist/` und teilt GitHub Pages die Domain mit. Ohne die Datei fällt die Seite
   bei jedem Deploy auf `fschmidt.github.io/dyestopia/` zurück (und würde dann
   wegen `base: '/'` kaputte Asset-Pfade haben).
2. **Cloudflare-DNS**: `CNAME dyestopia → fschmidt.github.io`, **DNS only**
   (graue Wolke), damit GitHub sein eigenes Let's-Encrypt-Zertifikat ausstellen
   kann.

Anders als `uhrzeit-app` (das unter `fschmidt.github.io/uhrzeit-app/` läuft und
deshalb `base: '/uhrzeit-app/'` braucht) liegt Dyestopia auf einer eigenen
Domain im Root — daher `base: '/'`.
