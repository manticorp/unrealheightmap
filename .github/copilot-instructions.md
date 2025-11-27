# Unreal Heightmap Copilot Instructions

The overall purpose of this application is to generate high-resolution heightmaps and albedo textures from NextZen Terrarium tiles, suitable for use in Unreal Engine landscapes. The app is a single-page application (SPA) built with TypeScript, Leaflet for map rendering, and Bulma for UI styling. Heavy processing tasks are offloaded to a Web Worker to keep the UI responsive.

## Architecture & Entry Points
- `src/main.ts` bootstraps Bulma/Leaflet styles, injects `templates/header.html` + `footer.html`, then instantiates `App` once `#app` exists; treat this as the only SPA entry point.
- `App` (in `src/app.ts`) owns all DOM state, Leaflet map wiring, UI events, and download flows; extend functionality by adding methods here instead of writing new globals.
- External imagery comes from NextZen Terrarium tiles (`src/nextzen.ts`); zoom > 15 is forbidden because the service only serves up to z15—respect that check before triggering downloads.
- PNG decoding/encoding is fully in-house (`src/png.ts`, `src/UPNG.js`); avoid introducing other PNG libs unless you replace every usage of the current helpers.

## Worker & Data Pipeline
- Heavy work runs in `public/dist/js/processor.js`, a Web Worker compiled from `src/processor.ts` and accessed via Comlink; keep the output path stable because `new Worker("public/dist/js/processor.js")` is hard-coded.
- Tile fetches are throttled through `promiseAllInBatches` (batch=200) and tracked in `currentRequests`; cancel ongoing `XMLHttpRequest`s if you introduce new error paths to prevent runaway connections.
- `PNG.terrariumToGrayscale()` converts the Terrarium RGB encoding into meters, returning a `Float32Array` that `processor.combineImages` stitches into the final raster.
- Normalisation strategies live in the worker (`NormaliseMode` enum in `helpers.ts`); UI dropdown values map directly to those numeric constants, so keep them in sync whenever you add options.
- `processor.encodeToPng` ultimately feeds `UPNG.encodeLL` to emit 16-bit grayscale heightmaps; downstream code expects unsigned big-endian samples, so reuse `PNG.Float32ArrayToPng16Bit` when crafting new exports.

## State & UI Conventions
- Form inputs are registered through `createInputOptions`/`createOutputOptions` and saved via `storeValue` to both `localStorage` and the URL hash; follow that pattern so deep links keep working and `listenHashChange` stays consistent.
- Leaflet layers are declared in `createMapLayers`; each entry needs a `layer` instance and label, and everything that is not the active layer is removed from the map (no multiple base layers).
- Physical dimension readouts (`updatePhysicalDimensions`) depend on `state.bounds` and `state.phys`; if you change how tiles are selected, update the bounding-box math or the UI will drift from reality.
- Albedo exports reuse whatever Leaflet layer is visible (`generateAlbedo`); any new preview layer must expose a working `getTileUrl` or that feature will break.
- Error surfacing relies on the Bulma message stack created in `resetOutput`; push structured errors there instead of `alert`, so they auto-dismiss correctly.

## Build & Workflow
- Install deps with `npm install`, then use `npm run watch` for incremental dev (emits `public/dist/js/{main,processor}.js` and `public/dist/css/main.css`).
- `npm run build` runs the same webpack config once; `npm run author` produces the minified production bundle via `webpack.production.config.js`.
- Static pages (`index.html`, `examples.html`, `instructions.html`) expect the compiled assets in `public/dist`; do not change that folder without updating the HTML and the worker URL in code.
- SCSS is authored under `src/sass`; Bulma variables live in `_variables.scss` and overrides in `_overrides.scss`. Always import new styles through `main.scss` so webpack can extract them.
- There are no automated tests; validate changes by loading `index.html` through a static server (e.g., `npx http-server public`) and exercising both heightmap and albedo exports.
