# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server (http://localhost:5173)
npm run build     # type-check + production build (outputs to dist/)
npm run preview   # serve the built dist/ at http://localhost:4173
```

**Playwright E2E tests** run against the preview server (`http://localhost:4173`), so build first:

```bash
npm run build && npx playwright test                        # run all tests
npx playwright test tests/build-product.spec.ts            # run a single file
npx playwright test tests/upload-zip.spec.ts               # requires test-output-new.zip at repo root
```

**Verification** — always run before considering work done:

```bash
npm run build   # catches TS type errors and build failures
```

## Key conventions

- **Vue JSX, not React JSX.** `jsxImportSource: "vue"` in tsconfig. Components use `defineComponent` + Composition API returning JSX render functions — no `<template>` or Options API. Use Vue JSX semantics (`v-model`, `v-show`, `v-slots`) not React patterns.
- **Strict TS** (`tsconfig.app.json`): `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`. Unused imports/vars or non-erasable syntax (e.g. `enum`) will break the build.
- **Tailwind CSS 4** via `@tailwindcss/vite` (not v3 PostCSS). No `tailwind.config.*`. Entry is `src/style.css` with `@import "tailwindcss"`.
- **`@` path alias** → `src/` (vite.config.ts + tsconfig paths).
- **`base: './'` in Vite config** — relative paths in dist; app is meant to be embedded, not served from a root domain.

## Architecture

This is a **Vue 3 + JSX + TypeScript** single-page app built with Vite. The `@` alias resolves to `src/`.

### Step switching via query param

The router (`src/router/index.ts`) uses **`createWebHashHistory`** with a **single route `'/'`** handled by `WorkspaceLayout` (so real URLs look like `#/?step=2&ro=...`). All three step pages are always mounted and toggled with `v-show`; the active step is read from `?step=1|2|3` on the query string (defaults to `1` when absent/out of range). Switching steps is done via `router.replace({ path: '/', query: { step: '2', ro: ... } })`. Pinia stores persist across step switches.

| Query | Step | Page | Purpose |
|---|---|---|---|
| `?step=1` | 1 | `MarkdownPage` | Vditor IR-mode markdown editor; "Confirm" button posts `MD_CONTENT_CONFIRMED` |
| `?step=2` | 2 | `EditorPage` | Render DSL wireframes, click nodes to edit metadata |
| `?step=3&ro=URL` | 3 | `PreviewPage` | iframe wrapper for loading URLs or ZIP packages |

`WorkspaceLayout` reads `ro` directly from `window.location.hash` and calls `previewStore.load(ro)` whenever it changes. The host sets it by posting `INIT_PREVIEW_URL { url }`, which `useWindowBridge` turns into a `router.replace` that writes `ro` to the query string (preserving the current step).

### Data flow

**Markdown (step 1)**
- `useMdStore` (Pinia, ID `'md'`) holds a `Vditor` instance, `isStreaming`, `isEmpty`, `isConfirmed`.
- Supports streaming input via `startStream / appendChunk / endStream` or one-shot `setFullText(text, lock?)`.
- Button disabled when `isEmpty || isStreaming || isConfirmed`. Confirming calls `confirmMd()` → posts `MD_CONTENT_CONFIRMED { text }` to parent.

**DSL editor (step 2)**
- `useDslStore` (Pinia, ID `'dsl'`) holds `nodes: DslNode[]` — the raw nested node tree.
- `WireframeRenderer` flattens the tree, culls nodes outside the viewport, and scales X coordinates to fill the container width while preserving Y coordinates as absolute pixels.
- Clicking a `NodeBlock` opens `NodeInfoPopover` (Element Plus popover) to edit `layerType`, `layerName`, `layerDescription` in-place via `updateNodeMeta`.
- Confirming calls `confirmDsl()` → posts `DSL_RENDER_CONFIRMED { dsl }` to parent.

**Preview (step 3)**
- `usePreviewStore` (Pinia, ID `'preview'`) holds the iframe `src`, `hexData` (extracted from `.txt` files in the ZIP), and `svgMap` (keyed by bare SVG filename without extension).
- `IframePanel` loads a URL in an iframe. When a ZIP is uploaded, it extracts resources to blob URLs, passes `hexData`/`svgMap` to the store, and auto-invokes `window.runPlugin()` once `_FicAppObj` is detected on the iframe's `contentWindow` (Pixso editor integration).
- `NODE_DSL_PIPELINE` message / `uploadDslToPipeline()` calls the dsl-to-hex API (`PIPELINE_URL` in `useWindowBridge`, currently `https://octo-beta.hdesign.huawei.com/dslThread/pipeline`; the backend itself listens on port 3204, see `API.md`) → receives base64 ZIP → loads into preview. Success posts `PIPELINE_LOADED { success: true, zipData: ArrayBuffer }`.
- The iframe console is intercepted via injected script relaying `postMessage` events to the panel's Console log.

### Window bridge (`useWindowBridge`)

Initialized once in `App.tsx`. Full type definitions in `src/types/window.d.ts`.

**DSL methods:** `uploadDsl()`, `downloadDsl()`, `clearDsl()`, `confirmDsl()`, `uploadDslToPipeline()`, `renderDslToPipeline(json)` (submits a DSL JSON object directly to the pipeline without a file picker)  
**Markdown methods:** `startMdStream()`, `appendMdChunk(text)`, `endMdStream()`, `setMdFullText(text, lock?)`, `getMdContent()`, `clearMd()`, `confirmMd()`  
**Preview:** `uploadZip()`, `runPlugin()` (exposed by `IframePanel`)

The bridge also handles inbound `postMessage` from the host. Inbound message types are typed as `PreviewPostMessageEvent` and outbound (iframe → host) as `PostMessageEvent` in `src/types/window.d.ts`. See `INTEGRATION.md` for the full message protocol (`NODE_DSL_JSON`, `NODE_DSL_PIPELINE`, `PIPELINE_ZIP_DATA`, `MD_STREAM_START`, etc.).

The Navbar emits `STEP_CHANGED { step: 1|2|3 }` to the parent when the user clicks a step button.

### DSL node schema

Defined in `src/types/dsl.ts`. Key fields on `DslNode`:
- `nid` — unique numeric ID (used as Vue `:key` and for `findNode` recursion)
- `rect: { x, y, w, h }` — absolute coordinates in the original design canvas
- `layerType` — one of `frame | component | text | image | icon`; drives colors in `WireframeRenderer/colors.ts`
- `passthrough: true` — node is skipped by the renderer (zero-size nodes are also skipped)
- `children` — nested child nodes

### Styling

Tailwind CSS 4 (via `@tailwindcss/vite` plugin). Element Plus is used only in `NodeInfoPopover` for its form components and popover. Wireframe block colors are hardcoded in `src/components/WireframeRenderer/colors.ts`.
