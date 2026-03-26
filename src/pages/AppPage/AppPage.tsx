import { Suspense, lazy, useMemo, useState } from "react";
import { APP_META } from "../../appMeta";
import { AppHeader } from "../../components/general/AppHeader/AppHeader";
import { pdfRetrievalService } from "../../features/pdf/services/pdfRetrievalService";
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

  const resolvedPdfRetrievalService = useMemo(
    () => services?.pdfRetrievalService ?? pdfRetrievalService,
    [services?.pdfRetrievalService]
  );

  return (
    <div className={styles.appShell}>
      <AppHeader appMeta={APP_META} onOpenWhatsNew={() => setIsWhatsNewOpen(true)} />

      <main className={styles.mainContent}>
        <Suspense fallback={<p className={styles.loadingFallback}>Loading workspace...</p>}>
          <LazyPdfWorkspace pdfRetrievalService={resolvedPdfRetrievalService} />
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
