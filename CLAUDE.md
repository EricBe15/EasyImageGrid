# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Electron + Vite with HMR (main/preload/renderer)
npm run build            # Production build via electron-vite
npm run build:sidecar    # C# sidecar binary (cd sidecar-cs && bash build_sidecar.sh)
npm run package:mac      # DMG via electron-builder (arm64)
npm run package:win      # NSIS installer
npm run package:linux    # AppImage
```

Dev mode requires a built C# sidecar binary at `sidecar-cs/dist/easyimagegrid-sidecar`. Build it with `npm run build:sidecar` (requires .NET SDK 9+). The sidecar is AOT-compiled and self-contained — no .NET runtime needed at runtime.

## Architecture

Three-process Electron app with a C# sidecar for heavy PDF work:

```
Renderer (React/Tailwind)  ──contextBridge──>  Main Process  ──spawn──>  C# Sidecar
     window.electronAPI         IPC invoke        ipc-handlers.ts         easyimagegrid-sidecar
                                                  sidecar.ts              (JSON lines on stdout)
```

**Main process** (`src/main/`): Window lifecycle with single-instance lock, macOS hidden title bar with traffic light positioning. `ipc-handlers.ts` registers all IPC channels. `sidecar.ts` spawns/kills the sidecar process and passes CLI args.

**Preload** (`src/preload/`): `contextBridge` exposes `window.electronAPI` with typed methods. `index.ts` has the runtime implementation; `index.d.ts` provides types to the renderer via `declare global { interface Window { electronAPI } }`.

**Renderer** (`src/renderer/`): Single-page React app. Internationalized with DE/EN toggle via `i18n.ts` (React context + `useT()` hook, persisted to `localStorage`, defaults to English). Uses the app's glassmorphism design system defined in `App.css` via CSS custom properties (`--glass-bg`, `--glass-border`, `--glass-shadow`). Tailwind v4 with `@tailwindcss/vite` plugin — configured in `electron.vite.config.ts`, not PostCSS.

**Sidecar** (`sidecar-cs/`): Standalone native AOT C# CLI. Uses SkiaSharp for PDF rendering, image decode, and resize, plus optional libtiff P/Invoke for CMYK TIFF support. `LayoutConfig` class holds all computed layout values plus configurable spacing parameters. Communicates via JSON lines: `{"type":"progress",...}` per image, `{"type":"done",...}` on completion, `{"type":"error",...}` on stderr.

## Image Processing Pipeline

Two decode paths in order of preference:

1. **SkiaSharp SKCodec** — JPEG/PNG/WebP with libjpeg-turbo scaled decode (1/2, 1/4, 1/8)
2. **libtiff P/Invoke** (`LibTiff.cs`) — TIFF including CMYK, dynamically loaded from system paths (optional, gracefully degrades)

Both paths use a unified two-step resize (`ImageProcessor.TwoStepResize`):
- **Ratio > 4:1**: Bilinear+mipmap to 2x target, then Mitchell-Netravali to final size
- **Ratio ≤ 4:1**: Single-step Mitchell-Netravali

PDF images are embedded as JPEG via `SKDocumentPdfMetadata.EncodingQuality`, controlled by the `--jpeg-compression` flag (default 92). The `--quality` flag controls `ResolutionScale = (quality / 100.0) * 1.5`, giving ~108 DPI at default (100), ~216 DPI at 200, and up to ~432 DPI at 400. Both values are configurable per quality preset in the UI.

## IPC Channels

| Channel | Direction | Purpose |
|---|---|---|
| `dialog:openFolder` | invoke | Native folder picker |
| `dialog:confirmOverwrite` | invoke | Overwrite/keep-both/cancel dialog for output path |
| `folder:readFiles` | invoke | Scan folder → `{name, path, size}[]` (accepts recursive flag) |
| `sidecar:generate` | invoke | Start sidecar, returns Promise with result |
| `sidecar:progress` | main→renderer | Streamed progress from sidecar stdout |
| `sidecar:cancel` | invoke | SIGTERM the sidecar process |
| `shell:openFile` | invoke | Open file with default app |
| `shell:showInFolder` | invoke | Reveal in Finder/Explorer |

## Sidecar CLI Args

```
--input-dir DIR          (required) Directory containing images
--output PATH            Output PDF path (default: auto-generated)
--cols N                 Grid columns 1-6 (default: 2)
--rows N                 Grid rows 1-6 (default: 3)
--landscape              Use landscape orientation
--quality N              Resolution quality 50-400 (default: 100)
--title TEXT             Custom PDF header title
--no-title               Hide the title
--no-page-numbers        Disable page numbers
--recursive              Scan subfolders
--sections-from-stdin    Read folder sections JSON from stdin
--files-from-stdin       Read explicit file list JSON from stdin
--per-folder             One PDF per folder section (with --sections-from-stdin)
--border N               Page margin in mm, 5-30 (default: 15)
--header-space N         Header area height in mm, 20-60 (default: 40, UI sends 25)
--filename-font-size N   Filename text size in pt, 6-14 (default: 8)
--title-font-size N      Title text size in pt, 8-24 (default: 14)
--jpeg-compression N     JPEG encoding quality 1-100 (default: 92)
```

## Sidecar Path Resolution

Dev: `sidecar-cs/dist/easyimagegrid-sidecar` (from `process.cwd()`).
Packaged: `process.resourcesPath/sidecar/easyimagegrid-sidecar` binary plus native libraries (`*.dylib`/`*.so`/`*.dll`). Configured via `extraResources` in `electron-builder.yml`.

## Type Locations for GenerateParams

The `GenerateParams` interface is defined in four places that must stay in sync:

1. `src/preload/index.ts` — runtime preload implementation
2. `src/preload/index.d.ts` — type declarations for the renderer
3. `src/renderer/src/types.ts` — renderer-side types
4. `src/main/sidecar.ts` — main process sidecar launcher

## Internationalization

`src/renderer/src/i18n.ts` contains all UI strings for both languages. The `de` object is the primary shape; `en` is typed as `typeof de` for compile-time key enforcement. `LanguageProvider` wraps the app and persists the choice to `localStorage` (key `"lang"`, default `"en"`). Components access translations via the `useT()` hook which returns `{ t, lang, setLang }`. Adding a new language requires only a new translation object and an entry in the `languages` map.

## Quality Presets

The UI provides customizable quality presets (gear icon → settings modal). Each preset has a name, resolution quality (50–400), and JPEG compression (1–100). Two factory presets ship by default ("Default" at 100/92, "High Res" at 200/92). Users can add up to 4 total presets, rename them, and adjust values. Factory presets have a reset button; custom presets have a delete button. Presets and the active selection are persisted to `localStorage`. The `QualityPreset` type and `FACTORY_PRESETS` constant live in `src/renderer/src/types.ts`. The settings modal is `src/renderer/src/components/SettingsModal.tsx`.

## UI Design System

All UI uses glassmorphism via CSS custom properties that switch between light/dark. The `.card`, `.btn-primary`, `.btn-secondary`, `.input-field` classes in `App.css` are the core building blocks. Toast notifications also use the glass variables. The header is a small centered pill ("Dynamic Island" style) that overlaps the main card.

## Supported Image Formats

**Standard:** `.tif`, `.tiff`, `.jpg`, `.jpeg`, `.png`, `.webp`
**RAW:** `.raw`, `.cr2`, `.cr3`, `.nef`, `.arw`, `.dng`, `.orf`, `.rw2`, `.raf`, `.pef`, `.srw`

Defined in both `ipc-handlers.ts` (for scanning) and the C# sidecar `ImageScanner.cs` (for processing).
