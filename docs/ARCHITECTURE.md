# Architecture

## Overview

PDF Anonymization v0.1.0 uses a single-page workspace with a PDF-first flow. The codebase is intentionally trimmed to remove legacy setup/JSON/text-editing/bbox-editing systems.

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
  - `components/PdfDocumentStage`: single-row viewer toolbar plus canvas rendering.
  - `hooks/usePdfRetrieval.ts`: retrieval lifecycle state machine.
  - `hooks/useManualPdfUpload.ts`: local upload lifecycle.
  - `hooks/usePdfDocument.ts`: PDF.js load/render/page/zoom management.
  - `services/*`: retrieval API adapter and simulated backend.
  - `utils/*`: identifier validation and response guards.
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
3. `usePdfDocument` loads and renders the selected PDF using PDF.js.
4. `PdfDocumentStage` renders the current page canvas and a compact single-row toolbar for loading/navigation/zoom/add-bbox controls.
5. `AppHeader` exposes the disabled export placeholder action in the top bar.

## Styling Tokens

- Reusable control and toolbar sizing values are centralized as CSS variables in `src/styles.css` (control height/radius, group padding/radius, toolbar gaps, transition timing).
- Viewer toolbar controls consume these tokens for consistent vertical sizing and alignment.

## Scope Boundaries in v0.1.0

- Supported: PDF loading, viewing, and navigation.
- Not supported yet: interactive anonymization region creation/editing/export.
- Removed entirely: legacy secondary-tab workflows, JSON pipelines, text editing/copy flows, and previous bbox tooling.

