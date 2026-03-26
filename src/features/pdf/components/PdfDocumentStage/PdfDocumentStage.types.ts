import type { ChangeEvent, RefObject } from "react";
import type { PdfLoadStatus } from "../../../../types/pdf";
import type { PdfRetrievalStatus } from "../../hooks/usePdfRetrieval";

export interface PdfDocumentStageProps {
  hasPdf: boolean;
  loadStatus: PdfLoadStatus;
  statusText: string;
  statusTone: "neutral" | "error" | "success";
  retrievalInputValue: string;
  retrievalStatus: PdfRetrievalStatus;
  canRetryRetrieval: boolean;
  manualFileInputRef: RefObject<HTMLInputElement>;
  currentPage: number;
  totalPages: number;
  zoom: number;
  pageWidth: number;
  pageHeight: number;
  pageStageRef: RefObject<HTMLDivElement>;
  canvasContainerRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onRetrievalInputChange: (value: string) => void;
  onRetrieveDocument: () => void;
  onResetWorkspace: () => void;
  onRetryRetrieval: () => void;
  onManualFilePick: () => void;
  onManualFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMovePage: (direction: -1 | 1) => void;
  onPageInput: (nextPage: number) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToWidth: () => Promise<void>;
}
