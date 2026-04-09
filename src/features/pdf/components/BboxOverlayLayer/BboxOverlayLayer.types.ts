import type { RefObject } from "react";
import type { PdfBbox, PdfBboxRect, PdfPageSize } from "../../types/bbox";
import type { AppLanguageMode } from "../../../../types/language";

export interface BboxOverlayLayerProps {
  languageMode: AppLanguageMode;
  hasPdf: boolean;
  pageStageRef: RefObject<HTMLDivElement>;
  displayPageSize: PdfPageSize;
  displayPageBaseSize: PdfPageSize;
  pageSize: PdfPageSize;
  pageViewRotationQuarterTurns: number;
  bboxes: PdfBbox[];
  selectedBboxId: string | null;
  editingBboxId: string | null;
  entityOptions: readonly string[];
  onSelectBbox: (bboxId: string | null) => void;
  onStartEditingBbox: (bboxId: string | null) => void;
  onDeleteBbox: (bboxId: string) => void;
  onDuplicateBbox: (bboxId: string) => void;
  onCopyBbox: (bboxId: string) => void;
  onPasteBbox: () => void;
  canPasteBbox: boolean;
  onCreateBbox: (rect: PdfBboxRect) => void;
  onUpdateBboxRect: (bboxId: string, rect: PdfBboxRect) => void;
  onUpdateBboxEntityLabel: (bboxId: string, nextLabel: string) => void;
  onUpdateBboxInstanceNumber: (bboxId: string, nextNumber: number | null) => void;
  onUpdateBboxTextRotation: (bboxId: string, nextRotationQuarterTurns: number) => void;
  onRegisterCustomEntityLabel: (label: string) => void;
}
