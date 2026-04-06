# Architecture

## Overview

PDF Anonymization v0.5.8 uses a single-page workspace with a PDF-first flow, interactive bbox editing (including copy/duplicate/paste actions and per-bbox text rotation), viewer-only per-page rotation, layout-independent keyboard shortcuts, session save/autosave/restore protection, bounded undo/redo history, and secure PDF-preserving anonymized export.

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
  - `components/PdfViewerToolbar`: single-row viewer toolbar with source/page/rotation/zoom/undo-redo/paste groups.
  - `components/PageViewRotationButton`: compact icon action for viewer-only current-page rotation.
  - `components/PdfDocumentStage`: page stage rendering, viewer status/footer, and bbox/export/session hook wiring.
  - `components/RestoreSessionPrompt`: app-consistent restore prompt for matching persisted sessions.
  - `components/SessionRiskPrompt`: internal guard dialog for risky source-switch/reset actions.
  - `components/ViewerSaveStatus`: subtle in-viewer autosave status/readout.
  - `components/BboxOverlayLayer`: page overlay for direct drag-to-create, drag/resize interactions, and keyboard handling (copy/paste/duplicate, delete, escape, and enter-to-edit behavior).
  - `components/BboxItem`: focused bbox rendering with resize handles, hover/selected action visibility with delayed hide for action-cluster handoff, centered one-line adaptive labels, and right-side Arabic-Indic numbering.
  - `components/BboxActionCluster`: compact per-bbox action controls (trash delete, duplicate, copy, rotate text) with shared icon/button tokens and non-blocking tooltips.
  - `components/BboxLabelEditor`: app-themed inline editor with unified label combobox, compact number input, and focus-safe interaction handling.
  - `hooks/usePdfRetrieval.ts`: retrieval lifecycle state machine.
  - `hooks/useManualPdfUpload.ts`: local upload lifecycle.
  - `hooks/usePdfDocument.ts`: PDF.js load/render/page/zoom management with base page dimensions.
  - `hooks/usePdfBboxes.ts`: bbox domain state/actions (including per-bbox text rotation) plus autosave, manual save, restore, export-state tracking, and undo/redo integration.
  - `hooks/useBboxOverlayKeyboardShortcuts.ts` + `hooks/usePdfSessionKeyboardShortcuts.ts`: centralized viewer/session keyboard handling with shared canonical shortcut matching.
  - `hooks/pdfSession/useSessionPersistence.ts`: focused session autosave/manual-save/restore lifecycle plus per-page viewer-rotation persistence.
  - `hooks/bboxOverlay/useBboxOverlayInteractions.ts`: rotated-view-aware pointer interaction mapping for create/move/resize behavior.
  - `hooks/useBeforeUnloadProtection.ts`: browser `beforeunload` guard when session-loss risk exists.
  - `hooks/pdfSession/*`: focused history and persistence snapshot helpers used by `usePdfBboxes`.
  - `hooks/usePdfExport.ts`: export execution state and header-facing export controller.
  - `constants/bbox.ts`: bbox geometry/visual tokens and Arabic entity defaults shared by preview and export.
  - `constants/export.ts`: export file-output and WASM export constants.
  - `constants/session.ts`: persistence/save/history/restore constants.
  - `constants/keyboardShortcuts.ts`: canonical shortcut definitions shared by viewer/session keyboard hooks.
  - `types/bbox.ts`: bbox domain contracts.
  - `types/session.ts`: save lifecycle, history, controller, and persisted session contracts.
  - `services/export/*`: export orchestration, redaction planning, PDFium mutation adapter, overlay rendering adapter, and integrity metrics helpers (including preview-token to PDF-unit parity mapping, glyph-metric label fitting, stable per-bbox text-angle rendering, and PDF stroke-weight calibration for border/text fidelity).
  - `services/sessionStorageService.ts`: localStorage persistence with schema validation/pruning.
  - `services/*`: retrieval adapters plus export service entrypoint.
  - `utils/*`: identifier validation, geometry helpers, clipboard/duplicate helpers, worker setup, upload fingerprinting, session identity utilities, page-view rotation/coordinate transforms, bbox text-angle helpers, encoding normalization utilities, canonical keyboard shortcut matching utilities, and shared bbox label layout/fitting helpers for preview/export parity.
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
4. `usePdfBboxes` owns per-document bbox state in canonical page coordinates and orchestrates undo/redo plus session lifecycle integration.
5. `useSessionPersistence` persists bbox history and per-page viewer rotation state for autosave/manual save/restore without mutating PDF bytes.
6. `BboxActionCluster` rotates text per bbox through bbox-state mutations; viewer page rotation never mutates this bbox-owned value.
7. `PdfDocumentStage` renders canvas + `BboxOverlayLayer` with shared rotated-view coordinate transforms so bbox interactions remain accurate after viewer rotation.
8. `usePdfExport` in `PdfDocumentStage` publishes export state upward to `AppHeader` and marks exported revision on successful export.
9. `AppHeader` triggers manual session save and secure redaction export download when enabled.
10. `PdfWorkspace` applies close protection (`beforeunload`) and internal source-switch risk prompts from session controller state.

## Styling Tokens

- Reusable control and toolbar sizing values are centralized as CSS variables in `src/styles.css` (control height/radius, group padding/radius, toolbar gaps, transition timing).
- Bbox visual tokens (border, handle size, editor z-index, action button sizing/offsets) are centralized in `src/styles.css`.
- Viewer toolbar controls consume these tokens for consistent vertical sizing and alignment.

## Scope Boundaries in v0.5.8

- Supported: PDF loading, viewing, interactive bbox editing with stable per-bbox text rotation, layout-independent viewer/session keyboard shortcuts (including `Ctrl/Cmd+D` duplication of the selected bbox with browser-bookmark override inside viewer context), deterministic undo/redo, local session persistence (without PDF bytes), restore after accidental close/refresh, and full-document anonymized PDF export that irreversibly redacts only targeted areas while preserving original structure/selectable text outside those areas.
- Removed entirely: legacy secondary-tab workflows, JSON pipelines, text editing/copy flows, and previous bbox tooling.

