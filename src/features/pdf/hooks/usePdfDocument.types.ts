import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfLoadStatus } from "../../../types/pdf";
import type { RetrievedPdfDocument, RetrievedPdfMeta } from "../../../types/pdfRetrieval";

export interface UsePdfDocumentOptions {
  retrievedPdfDocument: RetrievedPdfDocument | null;
}

export interface PdfDocumentState {
  pdfDoc: PDFDocumentProxy | null;
  documentMeta: RetrievedPdfMeta | null;
  loadStatus: PdfLoadStatus;
  errorMessage?: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  pageWidth: number;
  pageHeight: number;
  pageBaseWidth: number;
  pageBaseHeight: number;
  hasPdf: boolean;
}

export interface PdfDocumentActions {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  canvasContainerRef: MutableRefObject<HTMLDivElement | null>;
  pageStageRef: MutableRefObject<HTMLDivElement | null>;
  movePage: (direction: -1 | 1) => void;
  handlePageInput: (nextPage: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitToWidth: (pageViewRotationQuarterTurns?: number) => Promise<void>;
  setZoom: Dispatch<SetStateAction<number>>;
}
