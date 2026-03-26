# PDF Anonymization

PDF Anonymization is a browser-based tool focused on one workflow:

- Input: PDF
- Output: PDF

## v0.3.3 (2026-03-26)

Current feature set:

- Single compact workspace for PDF retrieval/upload, viewing, and bbox editing.
- Direct click-and-drag bbox creation on empty viewer page space (no toolbar creation button).
- Bounded bbox move/resize/delete interactions with minimum-size enforcement.
- Refined outside-corner delete control and centered adaptive bbox label sizing.
- Inline double-click entity editing with a unified combobox field and immediate apply.
- Focus-safe bbox editor fields: Entity combobox and Number input remain directly editable.
- One-line zoom-stable bbox labels with right-side Arabic-Indic instance numbers.
- Arabic default entity list with combobox filtering and session-only custom labels.
- Optional numeric suffix support for repeated entities displayed with Arabic-Indic numerals.
- Export PDF now produces a real flattened anonymized PDF with baked boxes/labels.
- Export uses a higher-fidelity rendering baseline (600 DPI equivalent target) with print-intent page rendering for sharper output.
- Export label/number ordering and bbox border thickness now match the in-app preview from shared rendering rules.
- Export now preserves selectable text outside anonymized regions via a hidden rebuilt text layer.
- Redacted text runs are excluded from that selectable layer so anonymized content remains unrecoverable in export output.
- Export processes all pages and downloads one final anonymized PDF file.

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
- `src/features/pdf/services`: retrieval API + simulated backend.
- `src/features/pdf/utils`: retrieval validation plus bbox geometry helpers.
- `src/types`: shared contracts.
- `docs/ARCHITECTURE.md`: architecture and module boundaries.
- `docs/MAINTENANCE.md`: maintenance and release workflow.
- `CHANGELOG.md`: release history.

## Notes

- Export is enabled when a PDF is loaded and at least one bbox exists.

