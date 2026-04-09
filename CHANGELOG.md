# Changelog

## [Unreleased] - 2026-04-09

- No unreleased entries yet.

## [0.5.10] - 2026-04-09

- Fixed a critical export corruption path where a small bbox could trigger broad unrelated content loss on affected PDFs.
- Strengthened redaction visual-integrity verification to full-resolution sampling with strict ratio and absolute outside-mask change limits.
- Added text-run structural integrity validation outside redaction regions so sparse but severe mutation corruption is detected deterministically.
- Switched integrity handling to fail closed: unsafe mutation output now automatically falls back to secure rasterized base export.
- Centralized additional export integrity guardrail constants for strict matching and maintainable safety tuning.

## [0.5.9] - 2026-04-08

- Hardened export bbox label rendering with a deterministic measure-render-verify fit loop so label text remains fully visible across browser/OS/DPI/font-rendering differences.
- Added centralized export-label safety constants for fit-attempt limits, shrink behavior, raster-bounds tolerance, and verification insets.
- Normalized export label input to canonical single-line text before fitting/drawing to avoid newline/tab-driven layout instability.
- Removed upward font-size drift in shared bbox label fitting and extended measured-fit width checks to use conservative glyph-ink envelopes (not advance width alone).
- Added tiny-bbox fail-safe behavior that always shrinks text instead of risking clipping, truncation, or cut ascenders/descenders.

## [0.5.8] - 2026-04-06

- Fixed viewer/session keyboard shortcuts so `Ctrl/Cmd` actions keep working when the active keyboard layout is Arabic (or any non-Latin layout).
- Replaced layout-sensitive letter matching (`event.key`) with canonical physical-key matching (`event.code`) for `Copy`, `Paste`, `Undo`, and `Redo`.
- Added `Ctrl/Cmd+D` to duplicate the currently selected bbox through the same canonical duplicate mutation path as the bbox action button.
- Prevented the browser default bookmark/favorite behavior for `Ctrl/Cmd+D` inside viewer shortcut context so bbox duplication wins when intended.
- Centralized shortcut definitions and matching helpers into shared modules to keep keyboard behavior consistent and maintainable across overlay/session handlers.
- Preserved strict editable-target guards and interaction-state gating so native text entry/editing behavior (including input copy/paste and caret operations) remains unchanged.

## [0.5.7] - 2026-04-05

- Fixed rotation-related mojibake regressions by normalizing potentially corrupted UTF-8 text in bbox/session label state and by replacing toolbar glyph text with encoding-safe SVG icons.
- Added per-bbox `Rotate text` action icon with explicit `0 / 90 / 180 / 270 deg` rotation cycling in the bbox action cluster.
- Added stable bbox text rotation state (`textRotationQuarterTurns`) so text orientation stays fixed after creation unless explicitly changed.
- Extended bbox text rotation through autosave/manual save/restore, undo/redo, and copy/duplicate/paste flows.
- Updated export label rendering to respect each bbox's stored text angle while preserving original input page orientation and no-clipping label layout safety.
- Split remaining oversized modules into focused units (`usePdfDocument.types`, `useBboxOverlayInteractions.types`, `redactionIntegrityMetrics`) to keep source files under the 300-line threshold.

## [0.5.6] - 2026-04-05

- Added a new viewer toolbar `Rotate page view` action that cycles the current page through `0 / 90 / 180 / 270 deg` as a viewer-only convenience mode.
- Implemented canonical rotated-view coordinate mapping so bbox create/move/resize/select/delete/duplicate/copy/paste/edit interactions stay aligned and correct after page rotation.
- Added per-page viewer rotation state with session persistence/restore so rotated page views return after reload without being treated as PDF content edits.
- Kept export behavior unchanged: output page order/orientation stays aligned with the input PDF and viewer rotation is never baked into exported PDF orientation.
- Refactored viewer/session modules into focused units (`PdfViewerToolbar`, `useSessionPersistence`, `useBboxOverlayInteractions`, shared page-view transform utilities) to keep oversized files below the 300-line threshold.

## [0.5.5] - 2026-04-02

- Added viewer keyboard shortcuts so `Ctrl/Cmd+C` copies the selected bbox and `Ctrl/Cmd+V` pastes it onto the current page using the same safe paste behavior as the toolbar action.
- Fixed viewer shortcut reliability by moving bbox keyboard handling to a centralized window-level hook with strict input-focus guards.
- New drag-created bboxes now open the inline editor immediately so labeling starts without an extra click.
- Removed default entity prefill for new bboxes so new entries start empty until the user explicitly types or selects an entity.
- Improved bbox action icon placement near top/page/viewer bounds so controls remain fully visible and cleanly attached to the bbox edge.
- Updated entity combobox suggestions so the exact typed value always appears as its own selectable option when it differs from existing labels.

## [0.5.4] - 2026-04-01

- Upgraded exported bbox labels to embedded vector text for sharper print/PDF fidelity instead of rasterized label glyph images.
- Added export-time Arabic/Latin font embedding with script-aware run rendering so Arabic labels, Arabic-Indic numerals, and mixed-script text remain high-quality and readable.

## [0.5.3] - 2026-04-01

- Fixed secure export corruption on affected PDFs by applying only export-created redaction annotations instead of applying all page redactions.
- Stabilized secure export mutation by processing all redactions in a single PDFium document session and saving once per export.
- Added rotation-aware export bounds and coordinate mapping so redaction and overlay placement stay valid on rotated pages.
- Added export visual-integrity checks after secure redaction and a high-fidelity raster fallback path for PDFs where PDFium mutation output is visually corrupted.

## [0.5.2] - 2026-04-01

- Updated export resilience so invalid/out-of-bounds bboxes are skipped per-item instead of aborting the whole PDF export.
- Export failures now surface immediately in an on-screen status banner while successful exports with skipped invalid bboxes remain non-blocking warnings.
- Added non-blocking export warning feedback when one or more invalid bboxes are skipped.

## [0.5.1] - 2026-03-30

- Refined export label fitting with shared PDF-space layout rules so bbox text keeps a safe inset and avoids clipping against borders.
- Improved export parity so bbox border weight and label text sizing more closely match the in-app preview while preserving no-clipping safety.
- Added glyph-metric-aware export label fitting and baseline centering so exported text uses available safe space better without clipping.
- Made export label fitting resolution-independent by computing font size from bbox/page units first and using canvas scale only for raster fidelity.
- Added explicit PDF stroke visual-weight compensation to align exported bbox border appearance with preview.

## [0.5.0] - 2026-03-28

- Added a top-bar `Save` action with compact `idle` / `saving` / `saved` status feedback.
- Added bbox-session autosave with persisted timestamps and subtle viewer bottom-right save status.
- Added deterministic, bounded undo/redo for bbox create/move/resize/delete/duplicate/paste/entity/number mutations.
- Added restore-session prompting for matching PDF identities after refresh/close, with `Restore` and `Skip` behavior.
- Added close-protection and source-switch risk prompts when work is dirty or current bbox state is not yet exported.
- Added stable PDF session identity handling (retrieval metadata + upload fingerprint) while never persisting PDF blobs/bytes.
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

- Replaced bbox delete icon text with a polished trash/bin action and added a compact per-bbox action cluster.
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
- Introduced a single PDF workspace with retrieval-by-ID and local upload flows.
- Added focused viewer controls (page navigation, zoom, fit).
- Added an anonymization panel placeholder with disabled `Add Region` and `Export Anonymized PDF` actions.




