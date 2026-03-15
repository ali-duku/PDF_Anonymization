# Maintenance Guide

## Versioning

- Use semantic versioning (`MAJOR.MINOR.PATCH`).
- Update version in:
  - `package.json`
  - `src/appMeta.ts` (`APP_META.version`)

## What's New Updates

Release notes are managed in `src/appMeta.ts`:

1. Add a new entry at the top of `releaseNotes`.
2. Keep highlights concise and user-facing.
3. Ensure `APP_META.version` matches the latest release entry.

## Adding Features Safely

1. Add or update types in `src/types` first.
2. Extend service contracts (`StorageService` / `JsonService`) when behavior changes.
3. Implement domain logic in `src/services`.
4. Keep UI modules (`src/viewer`, `src/setup`, `src/shared`) focused on presentation and user interaction.
5. Add tests for:
   - Service behavior.
   - UI behavior impacted by the change.

## Testing Workflow

Run:

```bash
npm run test:run
```

For local TDD:

```bash
npm run test
```

## Build + Deploy Checklist

1. Run tests.
2. Run production build:

```bash
npm run build
```

3. Verify `dist/index.html` exists.
4. Publish `dist/` to GitHub Pages target branch.

## Notes on PDF Persistence

- App stores only the latest uploaded PDF in IndexedDB.
- If user clears browser storage, startup will return to empty-state upload mode.
- No packaged default PDF is used in v1.

