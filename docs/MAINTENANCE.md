# Maintenance Guide

## Versioning

Use semantic versioning and keep versions aligned in:

- `package.json`
- `package-lock.json`
- `src/appMeta.ts`
- `CHANGELOG.md`

Current baseline: `0.1.0` (2026-03-26).

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

UI baseline in v0.1.0:

- Top header remains a compact single row and contains the disabled export placeholder action.
- Viewer toolbar remains a compact single row and contains loading, page, zoom, and disabled `Add BBox` actions.
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

