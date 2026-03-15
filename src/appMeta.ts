import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "Anonymizer",
  version: "1.0.0",
  releaseNotes: [
    {
      version: "1.0.0",
      date: "2026-03-15",
      highlights: [
        "Initial production-ready release with dark-only UI.",
        "PDF-first workflow with persistent last-uploaded file.",
        "Setup tab for JSON validation, formatting, and one-click copy."
      ]
    },
    {
      version: "0.9.0",
      date: "2026-03-14",
      highlights: [
        "App shell, tab structure, and metadata foundation.",
        "Early IndexedDB storage model and service contracts."
      ]
    }
  ]
};
