import { memo } from "react";
import styles from "./ToolbarIconButton.module.css";
import type { ToolbarIconButtonProps } from "./ToolbarIconButton.types";

function ToolbarIconButtonComponent({
  label,
  icon,
  className,
  title,
  type = "button",
  ...buttonProps
}: ToolbarIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={[styles.iconButton, className].filter(Boolean).join(" ")}
      {...buttonProps}
    >
      <span className={styles.iconGlyph} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

export const ToolbarIconButton = memo(ToolbarIconButtonComponent);
