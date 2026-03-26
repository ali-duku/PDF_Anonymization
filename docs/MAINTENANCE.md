# Maintenance Guide

## Versioning

Use semantic versioning and keep versions aligned in:

- `package.json`
- `package-lock.json`
- `src/appMeta.ts`
- `CHANGELOG.md`

Current baseline: `0.4.0` (2026-03-26).

## Definition of Done

1. Update release metadata (`package.json`, lockfile, `src/appMeta.ts`, `CHANGELOG.md`).
2. Update docs when architecture or workflow changes (`README.md`, `docs/ARCHITECTURE.md`, `docs/MAINTENANCE.md`).
3. Run and pass build:

```bash
npm run build
```

## Product Scope Guardrails

Keep the product focused on PDF anonymization.

Do not reintroduce removed legacy domains without an explicit scoped feature request:

- Legacy secondary-tab workflow
- JSON parsing/generation pipelines
- Text editing/copy workflows
- Previous bbox editing system

UI baseline in v0.4.0:

- Top header remains a compact single row and contains the Export PDF action.
- Viewer toolbar remains a compact single row and contains loading, page, and zoom actions (bbox creation is direct drag on the page).
- Bboxes are managed inside page-coordinate bounds with resize/move/delete/edit interactions in the viewer stage.
- Export generates one anonymized PDF across all pages when a PDF is loaded and bboxes exist, preserving original document structure/selectable text outside anonymized regions.
- Anonymized regions are irreversibly redacted through secure PDF mutation (no removable overlay-only masking).
- Preview/export label ordering and border thickness should stay aligned through shared bbox formatting/visual constants.
- Viewer/control sizing should use shared CSS tokens from `src/styles.css` instead of repeating hardcoded pixel values.

## Component Structure Rule

Every component folder must include:

- `ComponentName.tsx`
- `ComponentName.types.ts`
- `ComponentName.module.css`

## Retrieval Fixture Notes

The simulated backend currently maps file ID `123456` to `data/input.pdf`.

Error test IDs remain available:

- `401`, `403`, `500`, `422`, `502`

## Release Checklist

1. Update version metadata in all required files.
2. Add a new top entry to `src/appMeta.ts` release notes.
3. Add a matching entry in `CHANGELOG.md`.
4. Update docs for behavioral/architectural changes.
5. Run `npm run build`.

