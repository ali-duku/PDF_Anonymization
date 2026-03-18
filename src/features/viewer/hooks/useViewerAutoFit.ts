import { useEffect, useRef } from "react";
import type { RetrievedPdfMeta } from "../../../types/pdfRetrieval";

interface UseViewerAutoFitOptions {
  hasPdf: boolean;
  documentMeta: RetrievedPdfMeta | null;
  onFitToWidth: () => Promise<void>;
}

export function useViewerAutoFit({ hasPdf, documentMeta, onFitToWidth }: UseViewerAutoFitOptions): void {
  const lastAutoFitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasPdf || !documentMeta) {
      lastAutoFitKeyRef.current = null;
      return;
    }

    const nextAutoFitKey = `${documentMeta.id}:${documentMeta.updatedAt}`;
    if (lastAutoFitKeyRef.current === nextAutoFitKey) {
      return;
    }

    lastAutoFitKeyRef.current = nextAutoFitKey;
    const frame = window.requestAnimationFrame(() => {
      void onFitToWidth();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [documentMeta, hasPdf, onFitToWidth]);
}
