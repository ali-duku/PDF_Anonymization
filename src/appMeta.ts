import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "PDF Anonymization",
  version: "0.5.8",
  releaseNotes: [
    {
      version: "0.5.8",
      date: "2026-04-06",
      highlights: [
        "Fixed viewer/session keyboard shortcuts so Ctrl/Cmd-based commands remain reliable when the active keyboard input language is Arabic or any non-Latin layout.",
        "Switched canonical command matching from layout-sensitive character output to physical-key semantics (`KeyboardEvent.code`) for shortcut letters such as Copy, Paste, Undo, and Redo.",
        "Added Ctrl/Cmd+D to duplicate the currently selected bbox using the same canonical duplication path as the bbox Duplicate action.",
        "Handled the Ctrl/Cmd+D browser bookmark conflict by intentionally preventing default behavior in viewer shortcut context so duplication runs when appropriate.",
        "Centralized shortcut definitions and matching utilities so keyboard behavior stays maintainable and consistent across overlay and session shortcut handlers.",
        "Kept strict editable-target guards and interaction-state checks so native typing, caret movement, and input copy/paste behavior remain untouched inside editor fields.",
      ],
    },
    {
      version: "0.5.7",
      date: "2026-04-05",
      highlights: [
        "Fixed rotation-related mojibake regressions by normalizing potentially corrupted UTF-8 text on bbox/session entity labels and replacing toolbar glyph text with encoding-safe SVG iconography.",
        "Added per-bbox Text Angle rotation to the bbox action icon cluster with explicit 0/90/180/270 degree cycling.",
        "Stored bbox text rotation as stable bbox state so text angle stays fixed after creation unless explicitly changed by the user.",
        "Extended bbox text rotation through autosave/manual save/restore/undo/redo and copy/duplicate/paste behavior.",
        "Updated export text rendering to respect each bbox's stored text rotation while preserving original PDF page orientation and no-clipping label layout safety.",
      ],
    },
    {
      version: "0.5.6",
      date: "2026-04-05",
      highlights: [
        "Added a new viewer toolbar Rotate page view action that cycles the current page through 0/90/180/270 degrees as a viewer-only convenience mode.",
        "Implemented canonical rotated-view coordinate mapping so bbox create/move/resize/select/delete/duplicate/copy/paste/edit interactions stay correct and aligned after rotation.",
        "Added per-page viewer rotation state with session persistence and restore behavior without treating rotation as a PDF content edit.",
        "Kept export orientation unchanged from the input PDF so viewer rotation is never baked into exported page orientation.",
      ],
    },
    {
      version: "0.5.5",
      date: "2026-04-02",
      highlights: [
        "Added viewer keyboard shortcuts so Ctrl/Cmd+C copies the selected bbox and Ctrl/Cmd+V pastes it onto the current page using the same safe paste behavior as the toolbar action.",
        "Made viewer bbox shortcuts reliable by registering them through a centralized keyboard hook with strict input-focus guards.",
        "New drag-created bboxes now open the inline editor immediately so labeling starts without an extra click.",
        "Removed default entity prefill for new bboxes so new entries start empty until the user explicitly types or selects an entity.",
        "Improved bbox action icon placement near top/page/viewer bounds so controls remain fully visible and cleanly attached to the bbox edge.",
        "Updated entity combobox suggestions so the exact typed value always appears as its own selectable option when it differs from existing labels.",
      ],
    },
    {
      version: "0.5.4",
      date: "2026-04-01",
      highlights: [
        "Upgraded exported bbox labels to embedded vector text for sharper print/PDF fidelity instead of rasterized label glyph images.",
        "Added export-time Arabic/Latin font embedding with script-aware run rendering so Arabic labels, Arabic-Indic numerals, and mixed-script text remain high-quality and readable.",
      ],
    },
    {
      version: "0.5.3",
      date: "2026-04-01",
      highlights: [
        "Fixed secure export corruption on affected PDFs by applying only export-created redaction annotations instead of applying all page redactions.",
        "Stabilized secure export mutation by processing all redactions in a single PDFium document session and saving once per export.",
        "Added rotation-aware export bounds and coordinate mapping so redaction and overlay placement stay valid on rotated pages.",
        "Added export visual-integrity checks after secure redaction and a high-fidelity raster fallback path for PDFs where PDFium mutation output is visually corrupted.",
      ],
    },
    {
      version: "0.5.2",
      date: "2026-04-01",
      highlights: [
        "Updated export resilience so invalid/out-of-bounds bboxes are skipped per-item instead of aborting the whole PDF export.",
        "Export failures now surface immediately in an on-screen status banner while successful exports with skipped invalid bboxes remain non-blocking warnings.",
        "Added non-blocking export warning feedback when one or more invalid bboxes are skipped.",
      ],
    },
    {
      version: "0.5.1",
      date: "2026-03-30",
      highlights: [
        "Refined export label fitting with shared PDF-space layout rules so bbox text keeps a safe inset and avoids clipping against borders.",
        "Improved export parity so bbox border weight and label text sizing more closely match the in-app preview while preserving no-clipping safety.",
        "Added glyph-metric-aware export label fitting and baseline centering so exported text uses available safe space better without clipping.",
        "Made export label fitting resolution-independent by computing font size from bbox/page units first and using canvas scale only for raster fidelity.",
        "Added explicit PDF stroke visual-weight compensation to align exported bbox border appearance with preview.",
      ],
    },
    {
      version: "0.5.0",
      date: "2026-03-28",
      highlights: [
        "Added a compact top-bar Save action with idle/saving/saved status, persisting only PDF session state and never PDF bytes.",
        "Added autosave for bbox mutations with subtle bottom-right viewer feedback and last autosave time.",
        "Implemented deterministic bounded undo/redo for create, move, resize, delete, duplicate, paste, and label/number edits.",
        "Added restore prompt for matching PDF sessions after close/refresh plus close-protection warnings for dirty or unexported work.",
        "Added guarded source-switch prompts to reduce accidental loss when replacing/resetting a PDF session.",
        "Added stable PDF session identity handling (retrieval metadata + upload fingerprint) while never persisting PDF blobs/bytes.",
        "Added modular session persistence/history infrastructure (constants, types, services, hooks, prompt components).",
      ],
    },
    {
      version: "0.4.3",
      date: "2026-03-28",
      highlights: [
        "Pressing Enter now opens the inline editor when a bbox is selected and not already in an active edit/drag interaction.",
        "Refined bbox action hover stability so controls remain visible while moving from bbox content to the action icon cluster.",
        "Reordered viewer toolbar groups to source, page, zoom, then Paste and normalized Paste-group spacing to match other groups.",
      ],
    },
    {
      version: "0.4.2",
      date: "2026-03-28",
      highlights: [
        "Moved the viewer Paste action into its own toolbar group for cleaner one-line control grouping.",
        "Upgraded bbox action icons to a larger, modern translucent style with clearer semantic visuals for Delete, Duplicate, and Copy.",
        "Added concise hover/focus tooltips on bbox action icons to improve clarity without interfering with interactions.",
      ],
    },
    {
      version: "0.4.1",
      date: "2026-03-28",
      highlights: [
        "Replaced bbox delete with a polished trash action and added distinct Duplicate and Copy controls in a compact action cluster.",
        "Added viewer-toolbar Paste so copied bboxes can be inserted on the current page with exact geometry preserved and safe bounds clamping.",
        "Duplicate now creates a same-content bbox with a deterministic down-right offset and clean in-bounds placement near page edges.",
        "Updated bbox action visibility to appear on hover and selection, and added Escape-based deselection when no draft/edit session is active.",
        "Extended bbox editor keyboard commit so Enter now applies edits from both Entity and Number fields.",
      ],
    },
    {
      version: "0.4.0",
      date: "2026-03-26",
      highlights: [
        "Exported PDFs now preserve original PDF structure more faithfully outside anonymized regions.",
        "Selectable and searchable text is preserved outside anonymized areas without rebuilding hidden text layers.",
        "Anonymized regions are now securely redacted through irreversible PDF mutation before final overlay drawing.",
        "Export visual fidelity now matches in-app bbox preview more closely for geometry, borders, and label composition.",
      ],
    },
    {
      version: "0.3.3",
      date: "2026-03-26",
      highlights: [
        "Exported PDFs now preserve selectable text for non-anonymized regions.",
        "Anonymized regions remain securely flattened while redacted text runs are excluded from the exported selectable text layer.",
        "Preview/export bbox label ordering and border parity remain aligned in the export output.",
      ],
    },
    {
      version: "0.3.2",
      date: "2026-03-26",
      highlights: [
        "Improved export fidelity so bbox label/number ordering now matches the in-app preview.",
        "Unified preview/export bbox border styling from shared constants for thickness parity.",
        "Refined flattened export rendering with higher fidelity print-intent rasterization while keeping anonymization baked and secure.",
      ],
    },
    {
      version: "0.3.1",
      date: "2026-03-26",
      highlights: [
        "Flattened export now uses a high-fidelity rendering baseline to preserve source PDF clarity as closely as possible.",
        "Anonymization boxes remain fully baked into output while maintaining stronger text and line sharpness.",
        "Export still includes all pages and downloads one real anonymized PDF file.",
      ],
    },
    {
      version: "0.3.0",
      date: "2026-03-26",
      highlights: [
        "Export PDF now generates a real flattened anonymized PDF file instead of a placeholder action.",
        "Anonymization boxes and labels are baked directly into the exported document content.",
        "Export processes all pages and preserves page-specific bbox geometry and labeling.",
        "Downloaded output preserves Arabic labels and Arabic-Indic numbering as shown in preview.",
      ],
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
        "Integrated bbox overlays in page coordinate space so boxes stay aligned across page navigation and zoom changes.",
      ],
    },
    {
      version: "0.1.0",
      date: "2026-03-26",
      highlights: [
        "Repositioned the product to PDF Anonymization with a new v0.1.0 baseline and fresh release history.",
        "Removed legacy JSON/setup/text-editing and previous bbox editing systems to establish a clean PDF-focused architecture.",
        "Shipped a single workspace with PDF retrieval by ID plus local upload, page/zoom viewer controls, and an anonymization panel foundation for upcoming interactions.",
      ],
    },
  ],
};
