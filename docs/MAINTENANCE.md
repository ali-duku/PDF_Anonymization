# Maintenance Guide

## Versioning

Use semantic versioning and keep versions aligned in:

- `package.json`
- `package-lock.json`
- `src/appMeta.ts`
- `CHANGELOG.md`

Current baseline: `0.5.8` (2026-04-06).

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

UI baseline in v0.5.0:

- Top header remains a compact single row and contains Save, Export PDF, and What&apos;s New actions.
- Viewer toolbar remains a compact single row and contains loading/source controls, page controls, zoom actions, undo/redo actions, and a dedicated Paste group (bbox creation is direct drag on the page).
- Viewer toolbar includes a compact `Rotate page view` action that rotates only the current page view (0/90/180/270) for interaction convenience.
- Keyboard shortcuts that represent commands (`Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+D`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Ctrl/Cmd+Shift+Z`) must remain layout-independent and match canonical physical keys, not Latin-only typed characters.
- `Ctrl/Cmd+D` is reserved for bbox duplication in viewer shortcut context and should intentionally prevent browser bookmark/favorite default behavior while preserving editable-input safety guards.
- Bbox action icons include explicit per-bbox `Rotate text` control (0/90/180/270); this state belongs to bbox data and must not be auto-derived from page-view rotation.
- Bboxes are managed inside page-coordinate bounds with resize/move/delete/duplicate/copy/edit interactions in the viewer stage.
- Rotated viewer interaction must keep bbox hit testing, creation, move, resize, and overlay alignment correct via shared coordinate transforms.
- Viewer rotation state is view/session metadata only and must never mutate source PDF bytes or exported output orientation.
- Export must preserve original page orientation while honoring each bbox's stored text angle.
- Copied bboxes can be pasted from the viewer toolbar onto the current page; duplicate and paste must preserve geometry semantics with deterministic in-bounds clamping.
- Bbox action icons should remain modern/translucent with concise non-blocking tooltips and clear semantic iconography for Delete, Duplicate, and Copy.
- Pressing Enter while a bbox is selected should open the inline editor when no draft/drag edit interaction is active.
- Bbox action visibility must remain stable while the pointer moves from bbox content to action controls.
- Session persistence must store only bbox/session metadata and never raw PDF file bytes/blobs.
- Autosave must run after bbox/session mutations and present subtle in-viewer feedback.
- Restore prompts must appear for matching persisted sessions before replacing live state.
- Close warnings should use browser-supported `beforeunload` behavior when work is dirty or not yet exported.
- Export generates one anonymized PDF across all pages when a PDF is loaded and bboxes exist, preserving original document structure/selectable text outside anonymized regions.
- Anonymized regions are irreversibly redacted through secure PDF mutation (no removable overlay-only masking).
- Preview/export label ordering and border thickness should stay aligned through shared bbox formatting/visual constants.
- Export label fitting must remain PDF-space deterministic (safe all-sides inset + one-line fit) so label glyphs never clip or touch bbox borders across browser/zoom/device conditions.
- Export drawing must convert preview CSS-pixel visual tokens (for example border width and label spacing) into canonical PDF units to avoid preview/export weight drift.
- Export label sizing should prefer actual glyph metrics (when available) for safe-box fitting and baseline centering so parity improves without relaxing no-clipping guarantees.
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

