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

### Auflösung und HiDPI

Szenen rechnen in `960 × 720` (`GAME_WIDTH`/`GAME_HEIGHT` in
[`src/config.ts`](src/config.ts)) und dürfen feste Koordinaten benutzen.
`Phaser.Scale.FIT` skaliert das Canvas auf jede Bildschirmgröße (mit
Letterboxing), `CENTER_BOTH` zentriert es.

Phaser bringt **keine** HiDPI-Unterstützung mit: `ScaleConfig` hat kein
`resolution`-Feld (in 3.16 entfernt, in v4 nicht zurückgekommen) und die Runtime
liest `devicePixelRatio` nur in ein ungenutztes Info-Feld. Das Canvas hätte also
exakt 960 × 720 physische Pixel und würde auf einem Retina-Display doppelt
hochskaliert.

Deshalb ist der Backing Store `GAME_WIDTH * DPR` groß, und
[`BaseScene`](src/scenes/BaseScene.ts) zoomt die Kamera um denselben Faktor und
zentriert sie auf den logischen Mittelpunkt. Beides hebt sich in Weltkoordinaten
auf — Szenen sehen weiterhin 960 × 720, gerendert wird nativ.

**Jede Szene muss von `BaseScene` erben**, sonst fehlt der Kamera-Zoom und die
Szene wird auf einem Viertel des Canvas dargestellt. Wer `init()` überschreibt,
muss `super.init()` aufrufen.

Texte laufen über [`addText`](src/text.ts) statt `scene.add.text` —
`Text.setResolution()` wirkt laut Phaser nur bei gezoomter Kamera, was durch
`BaseScene` gegeben ist.

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
