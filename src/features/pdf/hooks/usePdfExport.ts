import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppLanguageMode } from "../../../types/language";
import type { PdfBbox } from "../types/bbox";
import type { PdfExportController, PdfExportStatusTone } from "../types/export";
import { downloadBlobFile } from "../utils/fileDownload";
import { PdfExportError } from "../services/export/exportErrors";
import { buildSkippedBboxesWarningMessage } from "../services/export/exportStatusMessage";

interface UsePdfExportOptions {
  sourcePdfBlob: Blob | null;
  sourceFileName: string | null;
  bboxes: readonly PdfBbox[];
  revision: number;
  languageMode: AppLanguageMode;
  onExportStart?: (revision: number) => void;
  onExportSuccess?: (revision: number) => void;
}

interface ExportPayloadRef {
  sourcePdfBlob: Blob | null;
  sourceFileName: string | null;
  bboxes: readonly PdfBbox[];
  revision: number;
  languageMode: AppLanguageMode;
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
  revision,
  languageMode,
  onExportStart,
  onExportSuccess
}: UsePdfExportOptions): PdfExportController {
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [statusTone, setStatusTone] = useState<PdfExportStatusTone>();

  const payloadRef = useRef<ExportPayloadRef>({
    sourcePdfBlob,
    sourceFileName,
    bboxes,
    revision,
    languageMode
  });
  const isExportingRef = useRef(false);

  useEffect(() => {
    payloadRef.current = {
      sourcePdfBlob,
      sourceFileName,
      bboxes,
      revision,
      languageMode
    };
  }, [bboxes, languageMode, revision, sourceFileName, sourcePdfBlob]);

  useEffect(() => {
    isExportingRef.current = isExporting;
  }, [isExporting]);

  const canExport = Boolean(sourcePdfBlob) && bboxes.length > 0 && !isExporting;

  const exportPdf = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload.sourcePdfBlob || payload.bboxes.length === 0 || isExportingRef.current) {
      return;
    }
    const exportCheckpointRevision = payload.revision;
    onExportStart?.(exportCheckpointRevision);

    setStatusMessage(undefined);
    setStatusTone(undefined);
    setIsExporting(true);

    try {
      const { exportRedactedPdfWithBboxes } = await import("../services/pdfExportService");
      const result = await exportRedactedPdfWithBboxes({
        sourcePdfBlob: payload.sourcePdfBlob,
        bboxes: payload.bboxes,
        sourceFileName: payload.sourceFileName,
        languageMode: payload.languageMode
      });
      downloadBlobFile(result.blob, result.fileName);

      const warningMessage = buildSkippedBboxesWarningMessage(result.skippedBboxes);
      if (warningMessage) {
        setStatusMessage(warningMessage);
        setStatusTone("warning");
      }

      onExportSuccess?.(exportCheckpointRevision);
    } catch (error) {
      setStatusMessage(normalizeExportError(error));
      setStatusTone("error");
    } finally {
      setIsExporting(false);
    }
  }, [onExportStart, onExportSuccess]);

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
