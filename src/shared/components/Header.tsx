import { useState } from "react";
import type { AppMeta } from "../../types/appMeta";
import { WhatsNewModal } from "./WhatsNewModal";

interface HeaderProps {
  appMeta: AppMeta;
}

export function Header({ appMeta }: HeaderProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="identity-block">
          <span className="app-kicker">PDF-First Workflow</span>
          <h1>{appMeta.name}</h1>
        </div>

        <div className="header-actions">
          <span className="version-badge" aria-label={`Version ${appMeta.version}`}>
            Version {appMeta.version}
          </span>
          <button className="action-button" type="button" onClick={() => setIsWhatsNewOpen(true)}>
            What&apos;s New
          </button>
        </div>
      </header>

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        appMeta={appMeta}
        onClose={() => setIsWhatsNewOpen(false)}
      />
    </>
  );
}
