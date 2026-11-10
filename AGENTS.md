# AGENTS.md

Guidance for AI coding agents (and humans) working on this repository. For the product itself, read [README.md](README.md). For an AI that only needs to *use* the tool, read [llms.txt](llms.txt).

## What this is

A static, client-side single-page app that turns real-world elevation data into heightmaps (16-bit PNG, 16/32-bit EXR, GeoTIFF), texture maps, 3D models (STL, OBJ, GLB, 3MF), contours and posters. TypeScript, webpack, Leaflet (map), three.js (3D preview), Comlink (web worker), Bulma and Sass.

There is **no backend, no accounts, no paid tier and no API**. Everything runs in the user's browser; GitHub Pages serves the repository root.

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies (Node 18+) |
| `npm test` | Jest unit tests (`tests/`) |
| `npm run build` | One-off development build into `public/dist/` |
| `npm run watch` | Development build, rebuilding on change |
| `npm run author` | **Production build. Run before committing source changes** |
| `npm run docs:agents` | Regenerate `url-params.json`, `*.md` page mirrors and `llms-full.txt` |

Serve the repository root with any static server (for example `npx http-server .`) and open `index.html`.

## Rules that are easy to get wrong

- **`public/dist/` is committed**, because GitHub Pages serves it. After changing anything under `src/`, run `npm run author` and commit the output with the source.
- **Do not edit generated files by hand**: `url-params.json`, `llms-full.txt`, and the Markdown mirrors (`instructions.md`, `guides.md`, `guide-*.md`, `examples.md`, `rights.md`). Change the source and run `npm run docs:agents`.
- **After editing any documentation HTML page** (`instructions.html`, `guide-*.html`, `guides.html`, `examples.html`, `rights.html`), run `npm run docs:agents`.
- **Adding or changing a URL setting** means editing `SETTINGS` in `src/url-state.ts` *and* `PARAM_META` in `src/url-params-meta.ts`, then running `npm run docs:agents`. `tests/agent-docs.test.ts` fails if the metadata is missing or `url-params.json` is stale.
- The worker is loaded from `public/dist/js/processor.js` (see `src/app.ts`); keep that output path stable.
- Do not introduce another PNG library: PNG and EXR encoding is in-house (`src/png.ts`, `src/UPNG.js`, `src/exr*.ts`).
- Report errors through the UI's message stack, not `alert`.

## Layout

```
src/main.ts             Entry point: injects header/footer, creates App
src/app.ts              UI, map, settings, export orchestration (large; extend methods here, no new globals)
src/processor.ts        Web worker: stitching, normalisation, maps, meshes
src/elevation.ts        Elevation sources (aws, mapterhorn, etopo, landsea, upload, planetary)
src/url-state.ts        Shareable URL settings (SETTINGS table, buildHash, parseHash)
src/url-params-meta.ts  Descriptions of every URL setting, source for url-params.json
src/derived-maps.ts     Normal, slope, curvature, height bands, water
src/mesh.ts, print3d.ts STL / OBJ / GLB / 3MF writers and print helpers
src/preview3d.ts        three.js preview (lazy loaded)
src/poster.ts           Shaded-relief poster themes and rendering
src/osm-layers.ts       OpenStreetMap masks via Overpass
src/sass/, templates/   Styles and header/footer HTML
tests/                  Jest tests (ts-jest, node environment)
scripts/                Build helpers (build-agent-docs.js)
*.html                  Static pages: index (the app), instructions, guides, examples, rights
```

## Settings and the URL hash

Every form input is a *setting* registered in `SETTINGS` (`src/url-state.ts`). Settings are saved to `localStorage` and mirrored into the URL hash, for example `#lat=36.18&lng=-112.02&oz=14&w=8129&h=8129&norm=smart`. Values equal to their default are left out. Unknown parameters are ignored. A new input needs: a `SETTINGS` entry, a control registered in `getSettingControl` in `src/app.ts`, and a `PARAM_META` entry.

## Agent-facing files

| File | Purpose |
| --- | --- |
| `llms.txt` | Index for LLMs (hand-written) |
| `llms-full.txt` | All documentation as one Markdown file (generated) |
| `url-params.json` | Machine-readable URL settings spec (generated) |
| `*.md` page mirrors | Markdown copies of the HTML pages (generated) |
| `robots.txt`, `sitemap.xml` | Crawler hints; add new pages to the sitemap and to `PAGES` in `scripts/build-agent-docs.js` |

Pages carry JSON-LD structured data in their `<head>`; keep it in step with the page content.

## Testing notes

`npm test` runs everything in Jest (node environment, no browser). Pure logic (`url-state`, meshes, encoders, derived maps) is tested; UI wiring in `app.ts` is not, so exercise UI changes in a browser.
