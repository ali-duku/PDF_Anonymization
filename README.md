# PDF Anonymization

PDF Anonymization is a browser-based tool focused on one workflow:

- Input: PDF
- Output: PDF

## v0.1.0 Baseline (2026-03-26)

This release resets the product from the previous app and establishes a clean foundation:

- Single workspace for all PDF anonymization actions.
- PDF retrieval by ID and local PDF upload.
- Single-row viewer toolbar with file loading, page controls, zoom, and disabled `Add BBox`.
- Legacy JSON, text-editing, and old bbox-editing systems removed.
- Top-bar export action kept disabled as a placeholder for upcoming anonymization output.

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
- `src/features/pdf/hooks`: retrieval/upload/document rendering hooks.
- `src/features/pdf/services`: retrieval API + simulated backend.
- `src/features/pdf/utils`: retrieval validation/response guards.
- `src/types`: shared contracts.
- `docs/ARCHITECTURE.md`: architecture and module boundaries.
- `docs/MAINTENANCE.md`: maintenance and release workflow.
- `CHANGELOG.md`: release history (fresh from v0.1.0).

## Notes

- The export action is intentionally disabled in v0.1.0.
- Region drawing and anonymization interactions will be added in a future release on this cleaned codebase.

