import { useEffect, useRef, useState, type ChangeEventHandler } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PersistedViewerState, PdfLoadStatus, StoredPdfRecord } from "../../types/pdf";
import type { StorageService } from "../../types/services";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerTabProps {
  storageService: StorageService;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function buildStatusText(loadStatus: PdfLoadStatus, message?: string): string {
  if (loadStatus === "loading") {
    return "Loading PDF...";
  }
  if (loadStatus === "error") {
    return message ?? "Unable to load PDF.";
  }
  return "";
}

export function PdfViewerTab({ storageService }: PdfViewerTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [recordMeta, setRecordMeta] = useState<StoredPdfRecord | null>(null);
  const [loadStatus, setLoadStatus] = useState<PdfLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setLoadStatus("loading");
      const record = await storageService.loadPdfRecord();

      if (cancelled) {
        return;
      }

      if (!record) {
        setLoadStatus("idle");
        return;
      }

      setRecordMeta(record);
      await loadPdfFromBlob(record.pdfBlob, record.viewerState, () => !cancelled);
    };

    initialize().catch(() => {
      if (!cancelled) {
        setLoadStatus("error");
        setErrorMessage("Failed to restore the last uploaded PDF.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storageService]);

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
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      renderTask = page.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
    };

    renderPage().catch((error: unknown) => {
      const errorName = typeof error === "object" && error !== null ? (error as { name?: string }).name : "";
      if (errorName !== "RenderingCancelledException") {
        setLoadStatus("error");
        setErrorMessage("PDF rendering failed.");
      }
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {
          // Ignore cleanup failures during unmount.
        });
      }
    };
  }, [pdfDoc]);

  useEffect(() => {
    if (!recordMeta || !pdfDoc || loadStatus !== "ready") {
      return;
    }

    const state: PersistedViewerState = { currentPage, zoom };
    storageService.saveViewerState(state).catch(() => {
      // Avoid blocking the viewer if persistence fails.
    });
  }, [currentPage, loadStatus, pdfDoc, recordMeta, storageService, zoom]);

  const loadPdfFromBlob = async (
    blob: Blob,
    preferredState?: PersistedViewerState,
    shouldContinue: () => boolean = () => true
  ) => {
    setLoadStatus("loading");
    setErrorMessage(undefined);

    const data = await blob.arrayBuffer();
    const loadingTask = getDocument({ data: new Uint8Array(data) });
    const nextDoc = await loadingTask.promise;
    if (!shouldContinue()) {
      nextDoc.destroy();
      return;
    }

    const stateFromStorage = preferredState ?? (await storageService.loadViewerState()) ?? {
      currentPage: 1,
      zoom: 1
    };

    const safePage = Math.min(nextDoc.numPages, Math.max(1, stateFromStorage.currentPage));
    const safeZoom = clampZoom(stateFromStorage.zoom);

    setPdfDoc(nextDoc);
    setTotalPages(nextDoc.numPages);
    setCurrentPage(safePage);
    setZoom(safeZoom);
    setLoadStatus("ready");
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setLoadStatus("error");
      setErrorMessage("Only PDF files are supported.");
      return;
    }

    try {
      const record = await storageService.replacePdf(file, { currentPage: 1, zoom: 1 });
      setRecordMeta(record);
      await loadPdfFromBlob(record.pdfBlob, record.viewerState);
    } catch {
      setLoadStatus("error");
      setErrorMessage("Could not store and open this PDF.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const movePage = (direction: -1 | 1) => {
    setCurrentPage((page) => {
      const next = page + direction;
      return Math.min(Math.max(next, 1), totalPages || 1);
    });
  };

  const handlePageInput: ChangeEventHandler<HTMLInputElement> = (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
      return;
    }
    setCurrentPage(Math.min(Math.max(Math.trunc(value), 1), totalPages || 1));
  };

  const handleFitToWidth = async () => {
    if (!pdfDoc || !canvasContainerRef.current) {
      return;
    }
    const page = await pdfDoc.getPage(currentPage);
    const viewportAtOne = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(canvasContainerRef.current.clientWidth - 24, 320);
    const fittedZoom = clampZoom(availableWidth / viewportAtOne.width);
    setZoom(fittedZoom);
  };

  const statusText = buildStatusText(loadStatus, errorMessage);
  const hasPdf = Boolean(pdfDoc);

  return (
    <section className="panel viewer-panel fade-in" aria-label="Viewer tab">
      <header className="panel-header">
        <h2>Viewer</h2>
        <p>Single PDF workflow. The latest uploaded file is restored automatically on next load.</p>
      </header>

      <div className="viewer-toolbar">
        <button type="button" className="action-button" onClick={handleFilePick}>
          {hasPdf ? "Replace PDF" : "Upload PDF"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden-input"
        />

        <div className="toolbar-group">
          <button type="button" className="icon-button" onClick={() => movePage(-1)} disabled={!hasPdf}>
            Prev
          </button>
          <label className="compact-field">
            Page
            <input
              type="number"
              min={1}
              max={Math.max(1, totalPages)}
              value={currentPage}
              onChange={handlePageInput}
              disabled={!hasPdf}
            />
          </label>
          <span className="total-pages">/ {totalPages || 0}</span>
          <button type="button" className="icon-button" onClick={() => movePage(1)} disabled={!hasPdf}>
            Next
          </button>
        </div>

        <div className="toolbar-group">
          <button type="button" className="icon-button" onClick={() => setZoom((prev) => clampZoom(prev - ZOOM_STEP))} disabled={!hasPdf}>
            -
          </button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="icon-button" onClick={() => setZoom((prev) => clampZoom(prev + ZOOM_STEP))} disabled={!hasPdf}>
            +
          </button>
          <button type="button" className="icon-button" onClick={handleFitToWidth} disabled={!hasPdf}>
            Fit Width
          </button>
        </div>
      </div>

      {recordMeta && (
        <div className="file-meta">
          <strong>{recordMeta.fileName}</strong> · {(recordMeta.fileSize / 1024 / 1024).toFixed(2)} MB ·
          Updated {new Date(recordMeta.updatedAt).toLocaleString()}
        </div>
      )}

      {!hasPdf && loadStatus !== "loading" && (
        <div className="empty-view">
          <h3>No PDF uploaded yet</h3>
          <p>Upload one PDF to start. This tool restores only your most recently uploaded file.</p>
          <button type="button" className="action-button" onClick={handleFilePick}>
            Upload PDF
          </button>
        </div>
      )}

      {statusText && (
        <p className={`status-line ${loadStatus === "error" ? "error" : ""}`} role="status">
          {statusText}
        </p>
      )}

      <div ref={canvasContainerRef} className={`canvas-shell ${hasPdf ? "active" : ""}`}>
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
