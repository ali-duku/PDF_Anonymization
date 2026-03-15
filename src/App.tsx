import { useMemo, useState } from "react";
import { APP_META } from "./appMeta";
import { jsonService } from "./services/jsonService";
import { storageService } from "./services/indexedDbStorageService";
import { SetupTab } from "./setup/components/SetupTab";
import { Header } from "./shared/components/Header";
import { TabNav, type AppTab } from "./shared/components/TabNav";
import type { JsonService, StorageService } from "./types/services";
import { PdfViewerTab } from "./viewer/components/PdfViewerTab";

interface AppProps {
  services?: {
    storageService?: StorageService;
    jsonService?: JsonService;
  };
}

export default function App({ services }: AppProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("viewer");

  const resolvedStorageService = useMemo(
    () => services?.storageService ?? storageService,
    [services?.storageService]
  );
  const resolvedJsonService = useMemo(
    () => services?.jsonService ?? jsonService,
    [services?.jsonService]
  );

  return (
    <div className="app-shell">
      <Header appMeta={APP_META} />

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <main className="tab-panels">
        <section
          className="tab-panel"
          hidden={activeTab !== "viewer"}
          aria-hidden={activeTab !== "viewer"}
        >
          <PdfViewerTab storageService={resolvedStorageService} />
        </section>
        <section
          className="tab-panel"
          hidden={activeTab !== "setup"}
          aria-hidden={activeTab !== "setup"}
        >
          <SetupTab jsonService={resolvedJsonService} />
        </section>
      </main>
    </div>
  );
}
