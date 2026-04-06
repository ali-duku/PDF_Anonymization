# PDF Anonymization

PDF Anonymization is a browser-based tool focused on one workflow:

- Input: PDF
- Output: PDF

## v0.5.8 (2026-04-06)

Current feature set:

- Single compact workspace for PDF retrieval/upload, viewing, and bbox editing.
- Viewer-only per-page rotation (`0 / 90 / 180 / 270 deg`) for easier anonymization on difficult page orientations.
- Per-bbox `Rotate text` action icon (`0 / 90 / 180 / 270 deg`) in the bbox action cluster that keeps label orientation stable unless explicitly changed.
- Direct click-and-drag bbox creation on empty viewer page space (no toolbar creation button).
- Bounded bbox move/resize/delete interactions with minimum-size enforcement.
- Refined outside-corner delete control and centered adaptive bbox label sizing.
- Inline double-click entity editing with a unified combobox field and immediate apply.
- Focus-safe bbox editor fields: Entity combobox and Number input remain directly editable.
- One-line zoom-stable bbox labels with right-side Arabic-Indic instance numbers.
- Arabic default entity list with combobox filtering and session-only custom labels.
- Optional numeric suffix support for repeated entities displayed with Arabic-Indic numerals.
- Top-bar `Save` action with compact `idle` / `saving` / `saved` status.
- Autosave on bbox/session mutations with subtle viewer feedback and last autosave time.
- Bounded undo/redo history for bbox create/move/resize/delete/duplicate/paste/entity/number/text-angle mutations.
- Viewer/session shortcuts (`Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+D`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Ctrl/Cmd+Shift+Z`) are layout-independent and work with Arabic or English keyboard input.
- `Ctrl/Cmd+D` duplicates the selected bbox through the same canonical duplicate behavior as the bbox Duplicate action and suppresses browser bookmarking in viewer shortcut context.
- Restore prompt for matching PDF sessions after accidental close/refresh.
- Browser `beforeunload` close-protection when bbox work is dirty or not yet exported.
- Copy/duplicate/paste preserve bbox text angle consistently.
- Rotation-related mojibake regressions are normalized in bbox/session label paths and toolbar iconography uses encoding-safe SVG.
- Export now uses a true PDF-preserving redaction pipeline instead of full-page rasterization.
- Redacted regions are irreversibly anonymized through secure PDF mutation before final overlay drawing.
- Selectable and searchable text remains preserved for non-anonymized content without rebuilt hidden text layers.
- Export gracefully skips invalid bboxes (including out-of-bounds/page-invalid entries) and continues exporting all valid bboxes.
- Export uses rotation-aware bounds/coordinate mapping for redaction and overlay placement on rotated source PDF pages.
- Viewer page rotation never mutates PDF bytes and never changes exported page orientation from the input PDF.
- Export applies each bbox label using its stored text angle while preserving no-clipping label layout safety.
- Export now performs a redaction-output integrity check and automatically switches to a high-fidelity rasterized secure fallback when mutation output is visually corrupted.
- Real export failures are shown immediately in an on-screen status banner (not tooltip-only).
- Export label/number ordering, Arabic-Indic numbering, and bbox border styling stay aligned with in-app preview rules.
- Export processes all pages and downloads one final anonymized PDF file.
- Persisted session data stores only app/session metadata and bbox state; raw PDF file bytes are never persisted.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Build production files:

```bash
npm run build
```

## Current Project Structure

- `src/components/general/AppHeader`: top-level product header.
- `src/components/general/WhatsNewModal`: release notes modal.
- `src/pages/AppPage`: app shell composition.
- `src/features/pdf/components`: PDF workspace and focused UI sections.
- `src/features/pdf/hooks`: retrieval/upload/document rendering hooks plus bbox state.
- `src/features/pdf/constants/bbox.ts`: bbox tokens and Arabic entity defaults.
- `src/features/pdf/types/bbox.ts`: bbox domain model contracts.
- `src/features/pdf/services`: retrieval adapters plus modular redaction/export orchestration.
- `src/features/pdf/services/sessionStorageService.ts`: local persisted session snapshot storage and pruning.
- `src/features/pdf/utils`: retrieval validation plus shared bbox geometry/label/session helpers.
- `src/types`: shared contracts.
- `docs/ARCHITECTURE.md`: architecture and module boundaries.
- `docs/MAINTENANCE.md`: maintenance and release workflow.
- `CHANGELOG.md`: release history.

## Notes

- Export is enabled when a PDF is loaded and at least one bbox exists.
- Save/autosave/restore persists only session state (bbox/history/metadata), never the PDF content itself.
