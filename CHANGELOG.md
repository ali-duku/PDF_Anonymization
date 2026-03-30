# Changelog

## [Unreleased] - 2026-03-30

- Refactored bbox label fitting around a canonical PDF-space content-box layout shared by preview sizing and export rendering.
- Fixed exported bbox labels so text stays inside a deterministic all-sides safe inset and no longer relies on clip-path masking.
- Made export label fitting resolution-independent by computing font size from bbox/page units first and using canvas scale only for raster fidelity.

## [0.5.0] - 2026-03-28

- Added a top-bar `Save` action with compact `idle` / `saving` / `saved` status feedback.
- Added bbox-session autosave with persisted timestamps and subtle viewer bottom-right save status.
- Added deterministic, bounded undo/redo for bbox create/move/resize/delete/duplicate/paste/entity/number mutations.
- Added restore-session prompting for matching PDF identities after refresh/close, with `Restore` and `Skip` behavior.
- Added close-protection and source-switch risk prompts when work is dirty or current bbox state is not yet exported.
- Added stable PDF session identity handling from retrieval metadata while never persisting PDF blobs/bytes.
- Added modular session persistence/history infrastructure (`constants`, `types`, `services`, `hooks`, prompt components).

## [0.4.3] - 2026-03-28

- Added keyboard shortcut behavior so pressing `Enter` opens the bbox editor for the currently selected bbox when no edit/drag interaction is active.
- Improved bbox action hover stability with delayed hide logic so icons do not disappear while moving from bbox content to the action cluster.
- Reordered viewer toolbar groups to source, page, zoom, then `Paste`.
- Normalized `Paste` group spacing to match other toolbar groups and removed the special min-width sizing override.

## [0.4.2] - 2026-03-28

- Moved the viewer Paste action into a dedicated toolbar group so page/zoom controls remain cleanly separated.
- Redesigned bbox action controls with larger modern translucent icon buttons and improved contrast over PDF content.
- Replaced Duplicate/Copy iconography with clearer semantics (shifted clone and clipboard/store for paste) while keeping Delete as a bin action.
- Added concise custom hover/focus tooltips for Delete, Duplicate, and Copy with non-interfering pointer behavior.
- Added reusable ActionTooltip primitive and centralized bbox action tooltip/glass/size tokens for consistent maintenance.

## [0.4.1] - 2026-03-28

- Replaced bbox delete `×` with a polished trash/bin action and added a compact per-bbox action cluster.
- Added new bbox `Duplicate` and `Copy` actions with distinct icons and color treatments.
- Added viewer-toolbar `Paste` to insert copied bboxes on the current page using exact-geometry paste with safe bounds clamping.
- Implemented deterministic duplicate offset (`+12px, +12px`) with page-bound clamping for predictable in-bounds placement.
- Updated bbox action visibility so actions appear on hover and selection while preserving drag/resize stability.
- Extended inline bbox editor keyboard handling so Enter now commits edits from the Number field (matching Entity behavior).
- Added Escape-key deselection fallback when a bbox is selected and no draft/edit interaction is active.

## [0.4.0] - 2026-03-26

- Replaced the previous flattened export architecture with a true PDF-preserving redaction pipeline.
- Added browser-local PDFium WASM mutation for irreversible bbox redaction while preserving non-redacted PDF structure and selectable text.
- Added localized secure fallback: failing page-level batch redaction retries per bbox and hard-fails when irreversible redaction cannot be guaranteed.
- Added deterministic overlay composition pass so exported fill/border/label rendering stays aligned with in-app preview rules.
- Removed full-page raster export and hidden selectable-text layer reconstruction code paths.
- Updated README, architecture docs, maintenance docs, and in-app What&apos;s New to reflect the new export model.

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
- Introduced a single PDF workspace with retrieval-by-ID flow.
- Added focused viewer controls (page navigation, zoom, fit).
- Added an anonymization panel placeholder with disabled `Add Region` and `Export Anonymized PDF` actions.


