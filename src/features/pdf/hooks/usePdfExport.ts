import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PdfBbox } from "../types/bbox";
import type { PdfExportController, PdfExportStatusTone } from "../types/export";
import { downloadBlobFile } from "../utils/fileDownload";
import { PdfExportError } from "../services/export/exportErrors";
import { buildSkippedBboxesWarningMessage } from "../services/export/exportStatusMessage";

interface UsePdfExportOptions {
  sourcePdfBlob: Blob | null;
  sourceFileName: string | null;
  bboxes: readonly PdfBbox[];
  onExportSuccess?: () => void;
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
  bboxes,
  onExportSuccess
}: UsePdfExportOptions): PdfExportController {
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [statusTone, setStatusTone] = useState<PdfExportStatusTone>();

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

    setStatusMessage(undefined);
    setStatusTone(undefined);
    setIsExporting(true);

    try {
      const { exportRedactedPdfWithBboxes } = await import("../services/pdfExportService");
      const result = await exportRedactedPdfWithBboxes({
        sourcePdfBlob: payload.sourcePdfBlob,
        bboxes: payload.bboxes,
        sourceFileName: payload.sourceFileName
      });
      downloadBlobFile(result.blob, result.fileName);

      const warningMessage = buildSkippedBboxesWarningMessage(result.skippedBboxes);
      if (warningMessage) {
        setStatusMessage(warningMessage);
        setStatusTone("warning");
      }

      onExportSuccess?.();
    } catch (error) {
      setStatusMessage(normalizeExportError(error));
      setStatusTone("error");
    } finally {
      setIsExporting(false);
    }
  }, [onExportSuccess]);

  return useMemo(
    () => ({
      canExport,
      isExporting,
      statusMessage,
      statusTone,
      exportPdf
    }),
    [canExport, exportPdf, isExporting, statusMessage, statusTone]
  );
}
