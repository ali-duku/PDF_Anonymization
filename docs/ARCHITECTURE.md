# Architecture

## Overview

PDF Anonymization v0.5.0 uses a single-page workspace with a PDF-first flow, interactive bbox editing (including copy/duplicate/paste actions), session save/autosave/restore protection, bounded undo/redo history, and secure PDF-preserving anonymized export.

## Source Layout

- `src/pages/AppPage`
  - App shell orchestration.
  - Owns product metadata rendering and What&apos;s New modal visibility.
- `src/components/general`
  - `AppHeader`: product title, version, Save/Export actions, release entry point.
  - `ActionTooltip`: reusable compact tooltip primitive for icon-only action affordances.
  - `ToolbarIconButton`: reusable square icon control for vertically centered toolbar icons.
  - `WhatsNewModal`: release notes dialog.
- `src/features/pdf`
  - `components/PdfWorkspace`: composes viewer shell, source/status orchestration, unload protection, and source-switch risk prompt.
  - `components/PdfSourceControls`: compact inline ID retrieval + upload control group.
  - `components/PdfViewerShell`: stage boundary that localizes viewer rerenders.
  - `components/PdfDocumentStage`: single-row viewer toolbar with separated source/page/zoom/undo-redo/paste groups plus page stage rendering.
  - `components/RestoreSessionPrompt`: app-consistent restore prompt for matching persisted sessions.
  - `components/SessionRiskPrompt`: internal guard dialog for risky source-switch/reset actions.
  - `components/ViewerSaveStatus`: subtle in-viewer autosave status/readout.
  - `components/BboxOverlayLayer`: page overlay for direct drag-to-create, drag/resize interactions, and keyboard handling (delete + escape + enter-to-edit behavior).
  - `components/BboxItem`: focused bbox rendering with resize handles, hover/selected action visibility with delayed hide for action-cluster handoff, centered one-line adaptive labels, and right-side Arabic-Indic numbering.
  - `components/BboxActionCluster`: compact per-bbox action controls (trash delete, duplicate, copy) with shared icon/button tokens and non-blocking tooltips.
  - `components/BboxLabelEditor`: app-themed inline editor with unified label combobox, compact number input, and focus-safe interaction handling.
  - `hooks/usePdfRetrieval.ts`: retrieval lifecycle state machine.
  - `hooks/useManualPdfUpload.ts`: local upload lifecycle.
  - `hooks/usePdfDocument.ts`: PDF.js load/render/page/zoom management with base page dimensions.
  - `hooks/usePdfBboxes.ts`: bbox domain state/actions plus autosave, manual save, restore, export-state tracking, and undo/redo integration.
  - `hooks/useBeforeUnloadProtection.ts`: browser `beforeunload` guard when session-loss risk exists.
  - `hooks/pdfSession/*`: focused history and persistence snapshot helpers used by `usePdfBboxes`.
  - `hooks/usePdfExport.ts`: export execution state and header-facing export controller.
  - `constants/bbox.ts`: bbox geometry/visual tokens and Arabic entity defaults shared by preview and export.
  - `constants/export.ts`: export file-output and WASM export constants.
  - `constants/session.ts`: persistence/save/history/restore constants.
  - `types/bbox.ts`: bbox domain contracts.
  - `types/session.ts`: save lifecycle, history, controller, and persisted session contracts.
  - `services/export/*`: export orchestration, redaction planning, PDFium mutation adapter, and overlay rendering adapter.
  - `services/sessionStorageService.ts`: localStorage persistence with schema validation/pruning.
  - `services/*`: retrieval adapters plus export service entrypoint.
  - `utils/*`: identifier validation, geometry helpers, clipboard/duplicate helpers, worker setup, upload fingerprinting, and session identity utilities.
- `src/types`
  - Shared contracts for app metadata, retrieval payloads, service boundaries, and PDF load status.

## Component Folder Contract

Each component folder follows:

1. `ComponentName.tsx`
2. `ComponentName.types.ts`
3. `ComponentName.module.css`

## Runtime Data Flow

1. `PdfSourceControls` accepts file ID or local upload within the viewer toolbar.
2. `usePdfRetrieval` and `useManualPdfUpload` provide the active source document.
3. `usePdfDocument` loads and renders the selected PDF using PDF.js and exposes display/base page dimensions.
4. `usePdfBboxes` owns per-document bbox state in page coordinates and orchestrates undo/redo, autosave/manual save, restore prompts, and export-revision tracking.
5. `PdfDocumentStage` renders canvas + `BboxOverlayLayer` for create/move/resize/delete/duplicate/copy/paste/edit flows, viewer autosave status, and restore prompt.
6. `PdfWorkspace` applies close protection (`beforeunload`) and internal source-switch risk prompts from session controller state.
7. `usePdfExport` in `PdfDocumentStage` publishes export state upward to `AppHeader` and marks exported revision on successful export.
8. `AppHeader` triggers manual session save and secure redaction export download when enabled.

## Styling Tokens

- Reusable control and toolbar sizing values are centralized as CSS variables in `src/styles.css` (control height/radius, group padding/radius, toolbar gaps, transition timing).
- Bbox visual tokens (border, handle size, editor z-index, action button sizing/offsets) are centralized in `src/styles.css`.
- Viewer toolbar controls consume these tokens for consistent vertical sizing and alignment.

## Scope Boundaries in v0.5.0

- Supported: PDF loading, viewing, interactive bbox editing, deterministic undo/redo, local session persistence (without PDF bytes), restore after accidental close/refresh, and full-document anonymized PDF export that irreversibly redacts only targeted areas while preserving original structure/selectable text outside those areas.
- Removed entirely: legacy secondary-tab workflows, JSON pipelines, text editing/copy flows, and previous bbox tooling.

