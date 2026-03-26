# Architecture

## Overview

PDF Anonymization v0.3.3 uses a single-page workspace with a PDF-first flow, interactive bbox editing, and high-fidelity anonymized PDF export.

## Source Layout

- `src/pages/AppPage`
  - App shell orchestration.
  - Owns product metadata rendering and What&apos;s New modal visibility.
- `src/components/general`
  - `AppHeader`: product title, version, release entry point.
  - `ToolbarIconButton`: reusable square icon control for vertically centered toolbar icons.
  - `WhatsNewModal`: release notes dialog.
- `src/features/pdf`
  - `components/PdfWorkspace`: composes the viewer shell and source/status orchestration.
  - `components/PdfSourceControls`: compact inline ID retrieval + upload control group.
  - `components/PdfViewerShell`: stage boundary that localizes viewer rerenders.
  - `components/PdfDocumentStage`: single-row viewer toolbar plus page stage rendering.
  - `components/BboxOverlayLayer`: page overlay for direct drag-to-create, drag/resize interactions, and keyboard handling.
  - `components/BboxItem`: focused bbox rendering with resize handles, outside-corner delete affordance, centered one-line adaptive labels, and right-side Arabic-Indic numbering.
  - `components/BboxLabelEditor`: app-themed inline editor with unified label combobox, compact number input, and focus-safe interaction handling.
  - `hooks/usePdfRetrieval.ts`: retrieval lifecycle state machine.
  - `hooks/useManualPdfUpload.ts`: local upload lifecycle.
  - `hooks/usePdfDocument.ts`: PDF.js load/render/page/zoom management with base page dimensions.
  - `hooks/usePdfBboxes.ts`: feature-scoped bbox domain state and actions.
  - `hooks/usePdfExport.ts`: export execution state and header-facing export controller.
  - `constants/bbox.ts`: bbox geometry/visual tokens and Arabic entity defaults shared by preview and export.
  - `constants/export.ts`: export quality/file-output constants.
  - `types/bbox.ts`: bbox domain contracts.
  - `services/*`: retrieval adapters and high-fidelity export pipeline with secure redaction flattening plus selectable-text preservation outside redactions.
  - `utils/*`: identifier validation, geometry helpers, worker setup, and export utilities.
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
4. `usePdfBboxes` owns per-document bbox domain state in page coordinate space.
5. `PdfDocumentStage` renders canvas + `BboxOverlayLayer` for create/move/resize/delete/edit flows.
6. `usePdfExport` in `PdfDocumentStage` publishes export state upward to `AppHeader`.
7. `AppHeader` triggers flattened export download when enabled.

## Styling Tokens

- Reusable control and toolbar sizing values are centralized as CSS variables in `src/styles.css` (control height/radius, group padding/radius, toolbar gaps, transition timing).
- Bbox visual tokens (border, handle size, editor z-index, delete size) are also centralized in `src/styles.css`.
- Viewer toolbar controls consume these tokens for consistent vertical sizing and alignment.

## Scope Boundaries in v0.3.3

- Supported: PDF loading, viewing, interactive bbox editing, and full-document anonymized PDF export that keeps secure baked redactions while preserving selectable text outside anonymized regions.
- Removed entirely: legacy secondary-tab workflows, JSON pipelines, text editing/copy flows, and previous bbox tooling.

