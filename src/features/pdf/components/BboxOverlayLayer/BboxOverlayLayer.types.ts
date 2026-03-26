import type { RefObject } from "react";
import type { PdfBbox, PdfBboxRect, PdfPageSize } from "../../types/bbox";

export interface BboxOverlayLayerProps {
  hasPdf: boolean;
  pageStageRef: RefObject<HTMLDivElement>;
  displayPageSize: PdfPageSize;
  pageSize: PdfPageSize;
  bboxes: PdfBbox[];
  selectedBboxId: string | null;
  editingBboxId: string | null;
  entityOptions: readonly string[];
  onSelectBbox: (bboxId: string | null) => void;
  onStartEditingBbox: (bboxId: string | null) => void;
  onDeleteBbox: (bboxId: string) => void;
  onCreateBbox: (rect: PdfBboxRect) => void;
  onUpdateBboxRect: (bboxId: string, rect: PdfBboxRect) => void;
  onUpdateBboxEntityLabel: (bboxId: string, nextLabel: string) => void;
  onUpdateBboxInstanceNumber: (bboxId: string, nextNumber: number | null) => void;
  onRegisterCustomEntityLabel: (label: string) => void;
}
