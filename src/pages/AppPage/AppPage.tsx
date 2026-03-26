import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { APP_META } from "../../appMeta";
import { AppHeader } from "../../components/general/AppHeader/AppHeader";
import { pdfRetrievalService } from "../../features/pdf/services/pdfRetrievalService";
import type { PdfExportController } from "../../features/pdf/types/export";
import styles from "./AppPage.module.css";
import type { AppPageProps } from "./AppPage.types";

const LazyPdfWorkspace = lazy(async () => {
  const module = await import("../../features/pdf/components/PdfWorkspace/PdfWorkspace");
  return { default: module.PdfWorkspace };
});

const LazyWhatsNewModal = lazy(async () => {
  const module = await import("../../components/general/WhatsNewModal/WhatsNewModal");
  return { default: module.WhatsNewModal };
});

export function AppPage({ services }: AppPageProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [exportController, setExportController] = useState<PdfExportController>({
    canExport: false,
    isExporting: false,
    errorMessage: undefined,
    exportPdf: async () => {
      // No-op until the viewer publishes a live export controller.
    }
  });

  const resolvedPdfRetrievalService = useMemo(
    () => services?.pdfRetrievalService ?? pdfRetrievalService,
    [services?.pdfRetrievalService]
  );

  const handleExportControllerChange = useCallback((nextController: PdfExportController) => {
    setExportController((previous) => {
      if (
        previous.canExport === nextController.canExport &&
        previous.isExporting === nextController.isExporting &&
        previous.errorMessage === nextController.errorMessage &&
        previous.exportPdf === nextController.exportPdf
      ) {
        return previous;
      }
      return nextController;
    });
  }, []);

  return (
    <div className={styles.appShell}>
      <AppHeader
        appMeta={APP_META}
        onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
        onExportPdf={exportController.exportPdf}
        canExportPdf={exportController.canExport}
        isExportingPdf={exportController.isExporting}
        exportStatusMessage={exportController.errorMessage}
      />

      <main className={styles.mainContent}>
        <Suspense fallback={<p className={styles.loadingFallback}>Loading workspace...</p>}>
          <LazyPdfWorkspace
            pdfRetrievalService={resolvedPdfRetrievalService}
            onExportControllerChange={handleExportControllerChange}
          />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <LazyWhatsNewModal
          isOpen={isWhatsNewOpen}
          appMeta={APP_META}
          onClose={() => setIsWhatsNewOpen(false)}
        />
      </Suspense>
    </div>
  );
}
