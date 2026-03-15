# Anonymizer

Anonymizer is a browser-based, PDF-first tool designed for GitHub Pages deployment.

## Core Features

- Dark-mode-only interface.
- Main `Viewer` tab for a single PDF workflow.
- Last uploaded PDF is saved in IndexedDB and auto-restored on future visits.
- Separate `Setup` tab for JSON:
  - Paste input JSON.
  - Validate and pretty-format (`2` spaces, lossless data).
  - View generated JSON output.
  - Copy generated output to clipboard.
- Header includes version and a `What's New` modal.

## Stack

- React 18
- TypeScript
- Vite
- PDF.js (`pdfjs-dist`)
- Vitest + Testing Library

## Local Development

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

4. Run tests:

```bash
npm run test:run
```

5. Build production files:

```bash
npm run build
```

## GitHub Pages Deployment

This project uses `base: "./"` in Vite config, so build output is portable.

1. Run:

```bash
npm run build
```

2. Publish the generated `dist/` folder to your GitHub Pages branch (or use a Pages deploy action).
3. GitHub Pages serves `dist/index.html` as the app entry.

## Project Structure

- `src/viewer`: PDF viewer UI and workflow.
- `src/setup`: JSON setup workflow.
- `src/services`: IndexedDB and JSON services.
- `src/shared`: reusable app shell components.
- `src/types`: shared interfaces and contracts.
- `docs/ARCHITECTURE.md`: module boundaries and data flow.
- `docs/MAINTENANCE.md`: release/version workflow and extension guidance.

## Testing Scope

- JSON service:
  - Valid JSON formatting.
  - Invalid JSON error details.
- Storage service:
  - Empty DB behavior.
  - Save/restore PDF.
  - Save/restore viewer state.
- Components:
  - Header + What's New modal.
  - Tab switching and setup-state preservation.
  - Setup tab generate/copy behavior.

