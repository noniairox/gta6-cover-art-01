# Vice Cover Studio

[![make.fun](https://make.fun/badge/ico-iero)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/ico-iero)](https://make.fun/u/ico-iero)
[![make.fun](https://make.fun/badge/ico-iero)](https://make.fun/)

Turn any photo into GTA-style cover art, in your browser, offline. Pick a
layout, pick a sunset or neon grade, write your caption, and export a PNG to
share — in the common post sizes 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## What it does

- **4 layouts** — Hero (one big panel + two small), Grid 2×2, Strip (three
  vertical panels), Full-bleed single panel.
- **5 gradient-map grades** — Sunset, Neon, Vice, Noir, Golden Hour — plus
  seeded film grain and a vignette, so the same cover renders identically
  every time.
- **Any photo** — upload your own, or use the three sample scenes shipped in
  the app (a sunset boulevard, a neon street, a rooftop at dusk, all drawn
  for this app). Click a panel to select it, drag to pan its photo, scroll to
  zoom, and place any photo in any panel.
- **Caption** — title + subtitle in Anton, Bebas Neue or Pacifico, four
  colours, adjustable size, top or bottom, outlined lettering on a dark band.
- **Export** — one click writes a PNG at 1080 × 1080, 1080 × 1350 or
  1920 × 1080.

## Try it

Serve `app/` with any static file server and open `index.html` in desktop
Chrome with the network off. No build step, no network request at runtime:
every script, font and image is a file under `app/`.

```sh
cd app && python3 -m http.server 8080
```

## Layout of this repository

- `app/index.html` — the editor page
- `app/style.css` — editor styles
- `app/src/cover.js` — the cover engine (layouts, grades, grain, caption)
- `app/src/main.js` — the editor UI (controls, pan/zoom, upload, export)
- `app/fonts/` — Anton, Bebas Neue, Pacifico (SIL Open Font License)
- `app/samples/` — three sample scenes drawn for this app
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's library
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged
- `screenshots/` — the app running in a browser, and a cover it exported

## Originality

Everything here is the maker's own: no Rockstar Games logo, artwork or
fonts. The fonts are open-licensed (SIL OFL), the sample scenes are drawn
for this app, and the cover engine is written for this entry.

## Sources

- Fonts: Anton, Bebas Neue and Pacifico from the google/fonts repository
  (github.com/google/fonts), each under the SIL Open Font License, Version
  1.1 — the license texts sit beside the font files in `app/fonts/`.
- Dossier library: `vendor/makefun-app.ts` is the kit's copy, unchanged; the
  gate rebuilds the dossier with the same library and compares the two byte
  for byte.
- The sample scenes in `app/samples/` are procedural drawings made for this
  entry (sunset boulevard, neon street, rooftop at dusk) — no photographs,
  no real people, no game artwork.
