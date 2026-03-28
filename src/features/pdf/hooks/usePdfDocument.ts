import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import type { PdfLoadStatus } from "../../../types/pdf";
import type { RetrievedPdfDocument, RetrievedPdfMeta } from "../../../types/pdfRetrieval";
import { configurePdfJsWorker } from "../utils/pdfWorker";

configurePdfJsWorker();

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const DEFAULT_DOCUMENT_ZOOM = 1.5;

interface UsePdfDocumentOptions {
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
  handleFitToWidth: () => Promise<void>;
  setZoom: Dispatch<SetStateAction<number>>;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function usePdfDocument({
  retrievedPdfDocument
}: UsePdfDocumentOptions): PdfDocumentState & PdfDocumentActions {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pageStageRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [documentMeta, setDocumentMeta] = useState<RetrievedPdfMeta | null>(null);
  const [loadStatus, setLoadStatus] = useState<PdfLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_DOCUMENT_ZOOM);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [pageBaseWidth, setPageBaseWidth] = useState(0);
  const [pageBaseHeight, setPageBaseHeight] = useState(0);
  const loadSequenceRef = useRef(0);

  const clearCanvasSurface = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
    setPageWidth(0);
    setPageHeight(0);
    setPageBaseWidth(0);
    setPageBaseHeight(0);
  }, []);

  useEffect(() => {
    const nextSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = nextSequence;

    if (!retrievedPdfDocument) {
      clearCanvasSurface();
      setPdfDoc((previousDoc) => {
        if (previousDoc) {
          previousDoc.destroy().catch(() => {
            // Ignore cleanup failures while resetting.
          });
        }
        return null;
      });
      setDocumentMeta(null);
      setTotalPages(0);
      setCurrentPage(1);
      setZoom(DEFAULT_DOCUMENT_ZOOM);
      setErrorMessage(undefined);
      setLoadStatus("idle");
      return;
    }

    let cancelled = false;
    setLoadStatus("loading");
    setErrorMessage(undefined);

    const initialize = async () => {
      const data = await retrievedPdfDocument.blob.arrayBuffer();
      const loadingTask = getDocument({ data: new Uint8Array(data) });
      const nextDoc = await loadingTask.promise;

      if (cancelled || loadSequenceRef.current !== nextSequence) {
        await nextDoc.destroy().catch(() => {
          // Ignore cleanup failures for stale responses.
        });
        return;
      }

      setPdfDoc((previousDoc) => {
        if (previousDoc) {
          previousDoc.destroy().catch(() => {
            // Ignore cleanup failures while replacing the document.
          });
        }
        return nextDoc;
      });
      setDocumentMeta(retrievedPdfDocument.meta);
      setTotalPages(nextDoc.numPages);
      setCurrentPage(1);
      setZoom(DEFAULT_DOCUMENT_ZOOM);
      setLoadStatus("ready");
    };

    initialize().catch(() => {
      if (!cancelled && loadSequenceRef.current === nextSequence) {
        setLoadStatus("error");
        setErrorMessage("PDF loading failed.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clearCanvasSurface, retrievedPdfDocument]);

  useEffect(() => {
    if (!pdfDoc) {
      return;
    }

    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      if (cancelled) {
        return;
      }

      const viewport = page.getViewport({ scale: zoom });
      const viewportAtOne = page.getViewport({ scale: 1 });
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      setPageWidth(width);
      setPageHeight(height);
      setPageBaseWidth(viewportAtOne.width);
      setPageBaseHeight(viewportAtOne.height);

      renderTask = page.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
    };

    renderPage().catch((error: unknown) => {
      const errorName = typeof error === "object" && error !== null ? (error as { name?: string }).name : "";
      if (errorName !== "RenderingCancelledException") {
        setLoadStatus("error");
        setErrorMessage("PDF rendering failed.");
        clearCanvasSurface();
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [clearCanvasSurface, currentPage, pdfDoc, zoom]);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {
          // Ignore cleanup failures during unmount.
        });
      }
    };
  }, [pdfDoc]);

  const movePage = useCallback(
    (direction: -1 | 1) => {
      setCurrentPage((page) => {
        const next = page + direction;
        return Math.min(Math.max(next, 1), totalPages || 1);
      });
    },
    [totalPages]
  );

  const handlePageInput = useCallback(
    (nextPage: number) => {
      if (!Number.isFinite(nextPage)) {
        return;
      }
      setCurrentPage(Math.min(Math.max(Math.trunc(nextPage), 1), totalPages || 1));
    },
    [totalPages]
  );

  const handleFitToWidth = useCallback(async () => {
    if (!pdfDoc || !canvasContainerRef.current) {
      return;
    }

    const container = canvasContainerRef.current;
    const containerStyles = window.getComputedStyle(container);
    const horizontalPadding =
      Number.parseFloat(containerStyles.paddingLeft || "0") +
      Number.parseFloat(containerStyles.paddingRight || "0");

    const page = await pdfDoc.getPage(currentPage);
    const viewportAtOne = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(container.clientWidth - horizontalPadding, 1);
    const fittedZoom = clampZoom(availableWidth / viewportAtOne.width);
    setZoom(fittedZoom);
  }, [currentPage, pdfDoc]);

  const handleZoomIn = useCallback(() => {
    setZoom((previous) => clampZoom(previous + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((previous) => clampZoom(previous - ZOOM_STEP));
  }, []);

  return useMemo(
    () => ({
      canvasRef,
      canvasContainerRef,
      pageStageRef,
      pdfDoc,
      documentMeta,
      loadStatus,
      errorMessage,
      currentPage,
      totalPages,
      zoom,
      pageWidth,
      pageHeight,
      pageBaseWidth,
      pageBaseHeight,
      hasPdf: Boolean(pdfDoc),
      movePage,
      handlePageInput,
      handleZoomIn,
      handleZoomOut,
      handleFitToWidth,
      setZoom
    }),
    [
      currentPage,
      documentMeta,
      errorMessage,
      handleFitToWidth,
      handlePageInput,
      handleZoomIn,
      handleZoomOut,
      loadStatus,
      movePage,
      pageHeight,
      pageBaseHeight,
      pageBaseWidth,
      pageWidth,
      pdfDoc,
      totalPages,
      zoom
    ]
  );
}
