import type { ChangeEvent, RefObject } from "react";
import type { PdfRetrievalStatus } from "../../hooks/usePdfRetrieval";

export interface PdfViewerToolbarProps {
  hasPdf: boolean;
  retrievalInputValue: string;
  retrievalStatus: PdfRetrievalStatus;
  canRetryRetrieval: boolean;
  manualFileInputRef: RefObject<HTMLInputElement>;
  currentPage: number;
  totalPages: number;
  zoom: number;
  currentPageRotationQuarterTurns: number;
  currentPageRotationDegrees: number;
  canUndo: boolean;
  canRedo: boolean;
  canPaste: boolean;
  onRetrievalInputChange: (value: string) => void;
  onRetrieveDocument: () => void;
  onResetWorkspace: () => void;
  onRetryRetrieval: () => void;
  onManualFilePick: () => void;
  onManualFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMovePage: (direction: -1 | 1) => void;
  onPageInput: (nextPage: number) => void;
  onRotatePageView: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToWidth: (pageViewRotationQuarterTurns?: number) => Promise<void>;
  onUndo: () => void;
  onRedo: () => void;
  onPaste: () => void;
}
