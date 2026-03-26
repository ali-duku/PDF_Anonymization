# Changelog

## [0.3.3] - 2026-03-26

- Refactored export to preserve selectable text for non-anonymized content by rebuilding a hidden text layer from source PDF text runs.
- Kept anonymized regions secure by continuing to bake redaction visuals into flattened page imagery while excluding overlapping text runs.
- Preserved export/preview parity for bbox label ordering, border thickness, and styling tokens.
- Added export text-layer filtering utilities and shared redaction-rect intersection logic.

## [0.3.2] - 2026-03-26

- Fixed export label composition parity so entity/number ordering now matches the in-app preview behavior.
- Unified preview/export bbox visual tokens for border width and color, removing export-only border drift.
- Increased flattened export fidelity with higher render density and print-intent rendering to keep output sharper.
- Preserved secure flattening: anonymization remains baked into page images across all pages.

## [0.3.1] - 2026-03-26

- Refined flattened export to a high-fidelity pipeline using higher render density (300 DPI equivalent baseline) to preserve source clarity.
- Kept anonymization flattening security intact while improving text/line sharpness and avoiding unnecessary quality loss.
- Added export quality guardrail for excessively large pages instead of silently downscaling.
- Optimized runtime bundle behavior by loading the heavy export service dynamically only when export is triggered.
- Updated docs and What&apos;s New content for quality-preserving flattened export behavior.

## [0.3.0] - 2026-03-26

- Implemented real Export PDF flow that generates a downloadable anonymized PDF file.
- Added safe flattened export pipeline using full-page rasterization plus baked bbox fill/border/label drawing.
- Export now processes all pages and applies each page's own bboxes in page coordinate space.
- Added export state hook and header wiring for enabled/disabled/loading/error export UX.
- Added shared export service/constants/utils for file naming, browser download, and PDF worker setup reuse.
- Updated docs and What&apos;s New content to reflect full export support.

## [0.2.0] - 2026-03-26

- Switched bbox creation to direct drag on empty PDF page space and removed the `Add BBox` toolbar button.
- Fixed bbox creation jump/shift by stabilizing drag-session coordinate projection and removing scroll-triggering creation focus behavior.
- Added bounded bbox move, resize handles, and deletion (including keyboard delete on selection).
- Refined bbox delete control with a polished red style and outside top-right placement that avoids resize-corner overlap.
- Centered bbox labels and added adaptive font sizing to better fill bbox space while keeping labels fully visible.
- Reduced bbox minimum dimensions to one-eighth of the previous baseline while preserving bounded/non-flipping geometry rules.
- Redesigned inline double-click entity editor to match app styling with a unified combobox label field.
- Added Arabic-Indic numeral formatting for displayed bbox instance numbering with Arabic/Latin input normalization.
- Fixed bbox editor focus/input reliability so both Entity and Number fields remain directly focusable and editable.
- Switched bbox label rendering to one-line adaptive fitting with zoom-stable sizing and right-side Arabic-Indic instance number placement.
- Added Arabic default entity catalog plus typed filtering and session-only custom entity additions.
- Added page-space bbox geometry utilities and overlay synchronization with zoom/page navigation.
- Updated docs and What&apos;s New content for the new bbox workflow.

## [0.1.0] - 2026-03-26

- Repositioned product to **PDF Anonymization** with a fresh baseline release.
- Removed legacy Setup/JSON/text-editing/bbox-editing systems from the repository.
- Introduced a single PDF workspace with retrieval-by-ID and local upload flows.
- Added focused viewer controls (page navigation, zoom, fit).
- Added an anonymization panel placeholder with disabled `Add Region` and `Export Anonymized PDF` actions.
