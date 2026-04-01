import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { APP_META } from "../../appMeta";
import { AppHeader } from "../../components/general/AppHeader/AppHeader";
import { pdfRetrievalService } from "../../features/pdf/services/pdfRetrievalService";
import type { PdfExportController } from "../../features/pdf/types/export";
import type { PdfSessionController } from "../../features/pdf/types/session";
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

const INITIAL_SESSION_CONTROLLER: PdfSessionController = {
  canSave: false,
  saveStatus: "idle",
  lastAutosaveAt: null,
  lastManualSaveAt: null,
  canUndo: false,
  canRedo: false,
  hasLossRisk: false,
  manualSave: async () => {
    // No-op until the viewer publishes a live session controller.
  }
};

export function AppPage({ services }: AppPageProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [exportController, setExportController] = useState<PdfExportController>({
    canExport: false,
    isExporting: false,
    statusMessage: undefined,
    statusTone: undefined,
    exportPdf: async () => {
      // No-op until the viewer publishes a live export controller.
    }
  });
  const [sessionController, setSessionController] = useState<PdfSessionController>(INITIAL_SESSION_CONTROLLER);

  const resolvedPdfRetrievalService = useMemo(
    () => services?.pdfRetrievalService ?? pdfRetrievalService,
    [services?.pdfRetrievalService]
  );

  const handleExportControllerChange = useCallback((nextController: PdfExportController) => {
    setExportController((previous) => {
      if (
        previous.canExport === nextController.canExport &&
        previous.isExporting === nextController.isExporting &&
        previous.statusMessage === nextController.statusMessage &&
        previous.statusTone === nextController.statusTone &&
        previous.exportPdf === nextController.exportPdf
      ) {
        return previous;
      }
      return nextController;
    });
  }, []);

  const handleSessionControllerChange = useCallback((nextController: PdfSessionController) => {
    setSessionController((previous) => {
      if (
        previous.canSave === nextController.canSave &&
        previous.saveStatus === nextController.saveStatus &&
        previous.lastAutosaveAt === nextController.lastAutosaveAt &&
        previous.lastManualSaveAt === nextController.lastManualSaveAt &&
        previous.canUndo === nextController.canUndo &&
        previous.canRedo === nextController.canRedo &&
        previous.hasLossRisk === nextController.hasLossRisk &&
        previous.manualSave === nextController.manualSave
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
        onSaveSession={sessionController.manualSave}
        canSaveSession={sessionController.canSave}
        saveStatus={sessionController.saveStatus}
        onExportPdf={exportController.exportPdf}
        canExportPdf={exportController.canExport}
        isExportingPdf={exportController.isExporting}
        exportStatusMessage={exportController.statusMessage}
        exportStatusTone={exportController.statusTone}
      />

      <main className={styles.mainContent}>
        <Suspense fallback={<p className={styles.loadingFallback}>Loading workspace...</p>}>
          <LazyPdfWorkspace
            pdfRetrievalService={resolvedPdfRetrievalService}
            onExportControllerChange={handleExportControllerChange}
            onSessionControllerChange={handleSessionControllerChange}
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
