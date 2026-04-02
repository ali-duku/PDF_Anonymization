import type { ComponentType, CSSProperties } from "react";

export type BboxActionId = "delete" | "duplicate" | "copy";

export type BboxActionVariant = BboxActionId;

export interface BboxActionDefinition {
  id: BboxActionId;
  label: string;
  title: string;
  variant: BboxActionVariant;
  Icon: ComponentType;
}

export interface BboxActionClusterProps {
  isVisible: boolean;
  placementStyle?: CSSProperties;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}
