import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PdfBbox } from "../types/bbox";
import type { PdfExportController } from "../types/export";
import { downloadBlobFile } from "../utils/fileDownload";
import { PdfExportError } from "../services/export/exportErrors";

interface UsePdfExportOptions {
  sourcePdfBlob: Blob | null;
  sourceFileName: string | null;
  bboxes: readonly PdfBbox[];
}

interface ExportPayloadRef {
  sourcePdfBlob: Blob | null;
  sourceFileName: string | null;
  bboxes: readonly PdfBbox[];
}

function normalizeExportError(error: unknown): string {
  if (error instanceof PdfExportError && error.message) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Export failed.";
}

export function usePdfExport({
  sourcePdfBlob,
  sourceFileName,
  bboxes
}: UsePdfExportOptions): PdfExportController {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const payloadRef = useRef<ExportPayloadRef>({
    sourcePdfBlob,
    sourceFileName,
    bboxes
  });
  const isExportingRef = useRef(false);

  useEffect(() => {
    payloadRef.current = {
      sourcePdfBlob,
      sourceFileName,
      bboxes
    };
  }, [bboxes, sourceFileName, sourcePdfBlob]);

  useEffect(() => {
    isExportingRef.current = isExporting;
  }, [isExporting]);

  const canExport = Boolean(sourcePdfBlob) && bboxes.length > 0 && !isExporting;

  const exportPdf = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload.sourcePdfBlob || payload.bboxes.length === 0 || isExportingRef.current) {
      return;
    }

    setErrorMessage(undefined);
    setIsExporting(true);

    try {
      const { exportRedactedPdfWithBboxes } = await import("../services/pdfExportService");
      const result = await exportRedactedPdfWithBboxes({
        sourcePdfBlob: payload.sourcePdfBlob,
        bboxes: payload.bboxes,
        sourceFileName: payload.sourceFileName
      });
      downloadBlobFile(result.blob, result.fileName);
    } catch (error) {
      setErrorMessage(normalizeExportError(error));
    } finally {
      setIsExporting(false);
    }
  }, []);

  return useMemo(
    () => ({
      canExport,
      isExporting,
      errorMessage,
      exportPdf
    }),
    [canExport, errorMessage, exportPdf, isExporting]
  );
}
