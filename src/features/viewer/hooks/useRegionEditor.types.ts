import type { OverlayDocument } from "../../../types/overlay";

export type TextDirection = "rtl" | "ltr";

export interface SpanEditorDraft {
  index: number;
  entity: string;
  anchorX: number;
  anchorY: number;
}

export interface UseRegionEditorOptions {
  overlayDocument: OverlayDocument | null;
  currentPage: number;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}
