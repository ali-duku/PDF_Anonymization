# Architecture

## Goals

- Keep the app modular as functionality grows.
- Preserve a strong separation between UI, domain logic, and persistence.
- Keep everything client-side and GitHub Pages compatible.

## Subsystems

### App Shell

- `App.tsx` composes:
  - `Header` (name, version, What's New).
  - `TabNav` (`Viewer`, `Setup`).
  - `PdfViewerTab` and `SetupTab`.

Tabs stay mounted and are visually switched, so state survives tab changes.

### Viewer Domain

- `PdfViewerTab` is responsible for:
  - Uploading a single PDF.
  - Rendering pages using PDF.js canvas rendering.
  - Viewer controls (page, zoom, fit-to-width).
  - Auto-restore of last uploaded PDF.
  - Persisting page + zoom after changes.

### Setup Domain

- `SetupTab` handles:
  - Input JSON editor.
  - Generate JSON action.
  - Output viewer and copy action.
  - User feedback (success and errors).

### Services

- `IndexedDbStorageService`:
  - Persists latest PDF record and viewer state.
  - Supports replace/load/update/clear operations.
- `BrowserJsonService`:
  - Parses JSON input.
  - Returns pretty output or actionable parse error metadata.
  - Clipboard copy abstraction.

## Data Contracts

- `AppMeta`, `ReleaseNote`: version and release notes.
- `StoredPdfRecord`: latest uploaded PDF metadata + blob + persisted view.
- `PdfViewerState`: runtime UI state for rendering and controls.
- `JsonGenerationResult`: normalized result for setup workflow.
- `StorageService`, `JsonService`: stable interfaces for growth and testability.

## Persistence Model

- IndexedDB database: `anonymizer-db`.
- Object store: `app_state`.
- Keys:
  - `last-uploaded-pdf`
  - `viewer-state`

This enables startup restore without a server.

## Extension Points

- Add future JSON transformations by extending `JsonService` while keeping setup UI stable.
- Add new tabs by expanding `AppTab` in `TabNav` and composing new modules in `App`.
- Add additional PDF annotations in `viewer` without touching setup logic.

