import type { PointerEvent as ReactPointerEvent } from "react";
import type { BboxDisplayRect, BboxResizeHandle, PdfBbox } from "../../types/bbox";
import type { BboxActionClusterOffset } from "../../utils/bboxActionClusterPlacement";

export interface BboxItemProps {
  bbox: PdfBbox;
  displayRect: BboxDisplayRect;
  actionClusterOffset: BboxActionClusterOffset;
  isSelected: boolean;
  isEditing: boolean;
  entityOptions: readonly string[];
  onSelect: (bboxId: string) => void;
  onStartMove: (bboxId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onStartResize: (
    bboxId: string,
    handle: BboxResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => void;
  onDelete: (bboxId: string) => void;
  onDuplicate: (bboxId: string) => void;
  onCopy: (bboxId: string) => void;
  onOpenEditor: (bboxId: string) => void;
  onCloseEditor: () => void;
  onLabelChange: (bboxId: string, nextLabel: string) => void;
  onInstanceNumberChange: (bboxId: string, nextNumber: number | null) => void;
  onRegisterCustomLabel: (label: string) => void;
}
