import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "PDF Anonymization",
  version: "0.1.0",
  releaseNotes: [
    {
      version: "0.1.0",
      date: "2026-03-26",
      highlights: [
        "Repositioned the product to PDF Anonymization with a new v0.1.0 baseline and fresh release history.",
        "Removed legacy JSON/setup/text-editing and previous bbox editing systems to establish a clean PDF-focused architecture.",
        "Shipped a single workspace with PDF retrieval by ID plus local upload, page/zoom viewer controls, and an anonymization panel foundation for upcoming interactions."
      ]
    }
  ]
};
