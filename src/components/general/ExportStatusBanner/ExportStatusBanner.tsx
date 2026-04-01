import { memo } from "react";
import styles from "./ExportStatusBanner.module.css";
import type { ExportStatusBannerProps } from "./ExportStatusBanner.types";

function ExportStatusBannerComponent({ message, tone }: ExportStatusBannerProps) {
  if (!message) {
    return null;
  }

  const isError = tone === "error";

  return (
    <div
      className={`${styles.banner} ${isError ? styles.bannerError : styles.bannerWarning}`}
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export const ExportStatusBanner = memo(ExportStatusBannerComponent);
