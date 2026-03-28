import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "PDF Anonymization",
  version: "0.5.0",
  releaseNotes: [
    {
      version: "0.5.0",
      date: "2026-03-28",
      highlights: [
        "Added a compact top-bar Save action with idle/saving/saved status, persisting only PDF session state and never PDF bytes.",
        "Added autosave for bbox mutations with subtle bottom-right viewer feedback and last autosave time.",
        "Implemented deterministic bounded undo/redo for create, move, resize, delete, duplicate, paste, and label/number edits.",
        "Added restore prompt for matching PDF sessions after close/refresh plus close-protection warnings for dirty or unexported work.",
        "Added guarded source-switch prompts to reduce accidental loss when replacing/resetting a PDF session."
      ]
    },
    {
      version: "0.4.3",
      date: "2026-03-28",
      highlights: [
        "Pressing Enter now opens the inline editor when a bbox is selected and not already in an active edit/drag interaction.",
        "Refined bbox action hover stability so controls remain visible while moving from bbox content to the action icon cluster.",
        "Reordered viewer toolbar groups to source, page, zoom, then Paste and normalized Paste-group spacing to match other groups."
      ]
    },
    {
      version: "0.4.2",
      date: "2026-03-28",
      highlights: [
        "Moved the viewer Paste action into its own toolbar group for cleaner one-line control grouping.",
        "Upgraded bbox action icons to a larger, modern translucent style with clearer semantic visuals for Delete, Duplicate, and Copy.",
        "Added concise hover/focus tooltips on bbox action icons to improve clarity without interfering with interactions."
      ]
    },
    {
      version: "0.4.1",
      date: "2026-03-28",
      highlights: [
        "Replaced bbox delete with a polished trash action and added distinct Duplicate and Copy controls in a compact action cluster.",
        "Added viewer-toolbar Paste so copied bboxes can be inserted on the current page with exact geometry preserved and safe bounds clamping.",
        "Duplicate now creates a same-content bbox with a deterministic down-right offset and clean in-bounds placement near page edges.",
        "Updated bbox action visibility to appear on hover and selection, and added Escape-based deselection when no draft/edit session is active.",
        "Extended bbox editor keyboard commit so Enter now applies edits from both Entity and Number fields."
      ]
    },
    {
      version: "0.4.0",
      date: "2026-03-26",
      highlights: [
        "Exported PDFs now preserve original PDF structure more faithfully outside anonymized regions.",
        "Selectable and searchable text is preserved outside anonymized areas without rebuilding hidden text layers.",
        "Anonymized regions are now securely redacted through irreversible PDF mutation before final overlay drawing.",
        "Export visual fidelity now matches in-app bbox preview more closely for geometry, borders, and label composition."
      ]
    },
    {
      version: "0.3.3",
      date: "2026-03-26",
      highlights: [
        "Exported PDFs now preserve selectable text for non-anonymized regions.",
        "Anonymized regions remain securely flattened while redacted text runs are excluded from the exported selectable text layer.",
        "Preview/export bbox label ordering and border parity remain aligned in the export output."
      ]
    },
    {
      version: "0.3.2",
      date: "2026-03-26",
      highlights: [
        "Improved export fidelity so bbox label/number ordering now matches the in-app preview.",
        "Unified preview/export bbox border styling from shared constants for thickness parity.",
        "Refined flattened export rendering with higher fidelity print-intent rasterization while keeping anonymization baked and secure."
      ]
    },
    {
      version: "0.3.1",
      date: "2026-03-26",
      highlights: [
        "Flattened export now uses a high-fidelity rendering baseline to preserve source PDF clarity as closely as possible.",
        "Anonymization boxes remain fully baked into output while maintaining stronger text and line sharpness.",
        "Export still includes all pages and downloads one real anonymized PDF file."
      ]
    },
    {
      version: "0.3.0",
      date: "2026-03-26",
      highlights: [
        "Export PDF now generates a real flattened anonymized PDF file instead of a placeholder action.",
        "Anonymization boxes and labels are baked directly into the exported document content.",
        "Export processes all pages and preserves page-specific bbox geometry and labeling.",
        "Downloaded output preserves Arabic labels and Arabic-Indic numbering as shown in preview."
      ]
    },
    {
      version: "0.2.0",
      date: "2026-03-26",
      highlights: [
        "Switched to direct drag-to-create bbox authoring on empty PDF page space and removed the Add BBox toolbar button.",
        "Fixed bbox creation jump/shift with stable drag-session coordinate projection and no scroll-triggering creation focus.",
        "Refined bbox controls with a polished red delete affordance placed outside the top-right corner to avoid resize-handle overlap.",
        "Centered bbox labels and added adaptive label sizing so entity text better fills each bbox while staying fully visible.",
        "Fixed inline editor focus behavior so both the entity combobox and number input remain reliably focusable and editable.",
        "Made bbox labels one-line and zoom-stable, with Arabic-Indic instance numbers rendered on the right side of the label.",
        "Redesigned inline bbox editor with a unified combobox field and Arabic-Indic numeral display for instance numbering.",
        "Added inline double-click entity editing with Arabic defaults, filterable typing, immediate apply, and session-only custom labels.",
        "Integrated bbox overlays in page coordinate space so boxes stay aligned across page navigation and zoom changes."
      ]
    },
    {
      version: "0.1.0",
      date: "2026-03-26",
      highlights: [
        "Repositioned the product to PDF Anonymization with a new v0.1.0 baseline and fresh release history.",
        "Removed legacy JSON/setup/text-editing and previous bbox editing systems to establish a clean PDF-focused architecture.",
        "Shipped a single workspace with PDF retrieval by ID, page/zoom viewer controls, and an anonymization panel foundation for upcoming interactions."
      ]
    }
  ]
};
