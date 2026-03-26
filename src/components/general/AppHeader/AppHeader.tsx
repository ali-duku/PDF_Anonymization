import { memo } from "react";
import styles from "./AppHeader.module.css";
import type { AppHeaderProps } from "./AppHeader.types";

function AppHeaderComponent({ appMeta, onOpenWhatsNew }: AppHeaderProps) {
  return (
    <header className={styles.appHeader}>
      <h1 className={styles.productName}>{appMeta.name}</h1>

      <div className={styles.actions}>
        <span className={styles.versionBadge} aria-label={`Version ${appMeta.version}`}>
          v{appMeta.version}
        </span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
          disabled
          title="Export is coming soon."
        >
          Export PDF
        </button>
        <button type="button" className={styles.actionButton} onClick={onOpenWhatsNew}>
          What&apos;s New
        </button>
      </div>
    </header>
  );
}

export const AppHeader = memo(AppHeaderComponent);
