# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/noniairox/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/noniairox/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into GTA 6-style cover art — the multi-panel poster look with
bold caption lettering and a Vice City neon-sunset grade — exported as a PNG
to share. It runs offline in a desktop browser from its own static files:
your photos never leave your machine.

## How to use

1. Serve `app/` with any static server (`python3 -m http.server` inside `app/`) and open `index.html`.
2. Click a sample photo (or add your own) into a panel.
3. Pick one of 4 layouts (Hero, Grid 2×2, Strip, Full-bleed) and one of 5 grades (Sunset, Neon, Vice, Noir, Golden Hour).
4. Edit the title, subtitle and tag. Click a panel to select it, drag the preview to move its photo, use the zoom slider.
5. Pick an export size (1080×1080, 1080×1350, 1920×1080) and hit **Export PNG**.

## What is inside

- `app/index.html` + `app/style.css` — the editor page.
- `app/src/cover.js` — the cover render engine: layouts, gradient-map grades, seeded film grain, vignette, poster lettering.
- `app/src/main.js` — editor wiring: photo tray, layout/grade picking, per-panel pan + zoom, PNG export.
- `app/src/shots.js` — screenshot scenes (`?shot=editor`, `?shot=cover`, `?shot=portrait`, `?shot=grid`).
- `app/fonts/` — Anton, Bebas Neue and Pacifico under the SIL Open Font License (OFL texts beside them).
- `app/samples/` — three original scenes drawn for this app (beach boulevard, rooftop dusk, neon street).
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output` and writes `dossier.json` with the kit's `vendor/makefun-app.ts`.

## Design notes

Each grade is a two-stop vertical gradient-map applied in `overlay` mode over
the photo, plus a soft colour wash: Sunset pushes warm oranges into the
shadows and magenta into the highlights, Neon does the same with cyan and
hot pink, Vice leans purple, Noir desaturates toward silver, Golden Hour
warms everything toward late-afternoon amber. A seeded grain pass (mulberry32,
seed 20261121) keeps the texture identical on every render, and a radial
vignette darkens the corners so the white poster gutters read as a frame.
The title is set in Anton with a dark keyline, the subtitle in Pacifico, the
tag in letterspaced Bebas Neue — the three typefaces a GTA-style poster
needs: a heavy grotesque, a script, and a condensed caps face.

## Licenses

The code is MIT licensed. The three fonts are under the SIL Open Font License
1.1 (see `app/fonts/OFL-*.txt`). No Rockstar Games logo, artwork or font is
used anywhere.
