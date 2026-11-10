# Copilot instructions

Read [AGENTS.md](../AGENTS.md) at the repository root: it holds the architecture, build commands and the rules that matter (committed `public/dist/`, generated files, how to add a URL setting).

Short version:

- Static, client-side SPA (TypeScript, webpack, Leaflet, three.js). No backend.
- Heavy work runs in a Web Worker (`src/processor.ts`, built to `public/dist/js/processor.js`) via Comlink.
- Settings live in `SETTINGS` (`src/url-state.ts`) and `PARAM_META` (`src/url-params-meta.ts`); run `npm run docs:agents` after changing them or any documentation page.
- Run `npm test` and `npm run author` before committing.
