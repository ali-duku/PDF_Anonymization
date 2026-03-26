import type { PointerEvent as ReactPointerEvent } from "react";
import type { BboxDisplayRect, BboxResizeHandle, PdfBbox } from "../../types/bbox";

export interface BboxItemProps {
  bbox: PdfBbox;
  displayRect: BboxDisplayRect;
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
  onOpenEditor: (bboxId: string) => void;
  onCloseEditor: () => void;
  onLabelChange: (bboxId: string, nextLabel: string) => void;
  onInstanceNumberChange: (bboxId: string, nextNumber: number | null) => void;
  onRegisterCustomLabel: (label: string) => void;
}
