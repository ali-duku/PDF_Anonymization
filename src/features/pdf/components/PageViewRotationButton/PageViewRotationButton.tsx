import { memo } from "react";
import { ToolbarIconButton } from "../../../../components/general/ToolbarIconButton/ToolbarIconButton";
import { pageViewQuarterTurnsToDegrees } from "../../utils/pageViewTransform";
import styles from "./PageViewRotationButton.module.css";
import type { PageViewRotationButtonProps } from "./PageViewRotationButton.types";

function RotatePageViewIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.8 12a6.2 6.2 0 1 0 2-4.6M5.8 3.9v3.5h3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function PageViewRotationButtonComponent({
  disabled,
  rotationQuarterTurns,
  onRotate
}: PageViewRotationButtonProps) {
  const rotationDegrees = pageViewQuarterTurnsToDegrees(rotationQuarterTurns);

  return (
    <ToolbarIconButton
      label="Rotate page view"
      icon={<RotatePageViewIcon />}
      onClick={onRotate}
      disabled={disabled}
      title={`Rotate page view only (export stays unchanged). Current: ${rotationDegrees} deg`}
    />
  );
}

export const PageViewRotationButton = memo(PageViewRotationButtonComponent);
