import { useCallback, useMemo } from "react";
import { BBOX_MIN_SIZE, DEFAULT_ARABIC_ENTITY_LABELS } from "../../constants/bbox";
import type {
  BboxClipboardSnapshot,
  PdfBbox,
  PdfBboxRect,
  PdfPageSize
} from "../../types/bbox";
import type { SessionPresentState } from "../../types/session";
import { buildDuplicateRect, buildPastedRect, createBboxClipboardSnapshot } from "../../utils/bboxClipboard";
import { normalizeRectWithinBounds } from "../../utils/bboxGeometry";

interface MutationOptions {
  mutationKey?: string;
  allowCoalesce?: boolean;
}

type RunMutation = (
  mutator: (present: SessionPresentState) => Omit<SessionPresentState, "revision"> | null,
  options?: MutationOptions
) => void;

export interface UseBboxMutationActionsOptions {
  hasActiveSession: boolean;
  currentPage: number;
  pageSize: PdfPageSize;
  bboxes: PdfBbox[];
  customEntityLabels: string[];
  clipboardSnapshot: BboxClipboardSnapshot | null;
  setClipboardSnapshot: (snapshot: BboxClipboardSnapshot | null) => void;
  setSelectedBboxId: (bboxId: string | null | ((previous: string | null) => string | null)) => void;
  setEditingBboxId: (bboxId: string | null | ((previous: string | null) => string | null)) => void;
  nextBboxId: () => string;
  runMutation: RunMutation;
}

export interface BboxMutationActionsResult {
  canPaste: boolean;
  entityOptions: readonly string[];
  createBbox: (rect: PdfBboxRect) => void;
  copyBbox: (bboxId: string) => void;
  duplicateBbox: (bboxId: string) => void;
  pasteClipboardToCurrentPage: () => void;
  updateBboxRect: (bboxId: string, rect: PdfBboxRect) => void;
  updateBboxEntityLabel: (bboxId: string, nextLabel: string) => void;
  updateBboxInstanceNumber: (bboxId: string, nextNumber: number | null) => void;
  deleteBbox: (bboxId: string) => void;
  registerCustomEntityLabel: (label: string) => void;
}

function areRectsEqual(left: PdfBboxRect, right: PdfBboxRect): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

export function useBboxMutationActions({
  hasActiveSession,
  currentPage,
  pageSize,
  bboxes,
  customEntityLabels,
  clipboardSnapshot,
  setClipboardSnapshot,
  setSelectedBboxId,
  setEditingBboxId,
  nextBboxId,
  runMutation
}: UseBboxMutationActionsOptions): BboxMutationActionsResult {
  const entityOptions = useMemo(() => {
    const options: string[] = [...DEFAULT_ARABIC_ENTITY_LABELS];
    for (const customLabel of customEntityLabels) {
      if (!options.includes(customLabel)) {
        options.push(customLabel);
      }
    }
    return options;
  }, [customEntityLabels]);

  const createBbox = useCallback(
    (rect: PdfBboxRect) => {
      if (!hasActiveSession) {
        return;
      }

      const nextRect = normalizeRectWithinBounds(rect, pageSize, BBOX_MIN_SIZE);
      const nextId = nextBboxId();
      const nextBbox: PdfBbox = {
        id: nextId,
        pageNumber: currentPage,
        x: nextRect.x,
        y: nextRect.y,
        width: nextRect.width,
        height: nextRect.height,
        entityLabel: "",
        instanceNumber: null
      };

      runMutation((present) => ({
        bboxes: [...present.bboxes, nextBbox],
        customEntityLabels: present.customEntityLabels
      }));
      setSelectedBboxId(nextId);
      setEditingBboxId(nextId);
    },
    [currentPage, hasActiveSession, nextBboxId, pageSize, runMutation, setEditingBboxId, setSelectedBboxId]
  );

  const copyBbox = useCallback(
    (bboxId: string) => {
      const sourceBbox = bboxes.find((bbox) => bbox.id === bboxId);
      if (!sourceBbox) {
        return;
      }

      setClipboardSnapshot(createBboxClipboardSnapshot(sourceBbox));
    },
    [bboxes, setClipboardSnapshot]
  );

  const duplicateBbox = useCallback(
    (bboxId: string) => {
      const sourceBbox = bboxes.find((bbox) => bbox.id === bboxId);
      if (!sourceBbox || !hasActiveSession) {
        return;
      }

      const duplicatedBbox: PdfBbox = {
        ...sourceBbox,
        id: nextBboxId(),
        ...buildDuplicateRect(sourceBbox, pageSize)
      };

      runMutation((present) => ({
        bboxes: [...present.bboxes, duplicatedBbox],
        customEntityLabels: present.customEntityLabels
      }));
      setSelectedBboxId(duplicatedBbox.id);
      setEditingBboxId(null);
    },
    [bboxes, hasActiveSession, nextBboxId, pageSize, runMutation, setEditingBboxId, setSelectedBboxId]
  );

  const pasteClipboardToCurrentPage = useCallback(() => {
    if (!clipboardSnapshot || !hasActiveSession) {
      return;
    }

    const nextId = nextBboxId();
    const nextRect = buildPastedRect(clipboardSnapshot, pageSize);
    const nextBbox: PdfBbox = {
      id: nextId,
      pageNumber: currentPage,
      x: nextRect.x,
      y: nextRect.y,
      width: nextRect.width,
      height: nextRect.height,
      entityLabel: clipboardSnapshot.entityLabel,
      instanceNumber: clipboardSnapshot.instanceNumber
    };

    runMutation((present) => ({
      bboxes: [...present.bboxes, nextBbox],
      customEntityLabels: present.customEntityLabels
    }));
    setSelectedBboxId(nextId);
    setEditingBboxId(null);
  }, [
    clipboardSnapshot,
    currentPage,
    hasActiveSession,
    nextBboxId,
    pageSize,
    runMutation,
    setEditingBboxId,
    setSelectedBboxId
  ]);

  const updateBboxRect = useCallback(
    (bboxId: string, rect: PdfBboxRect) => {
      const boundedRect = normalizeRectWithinBounds(rect, pageSize, BBOX_MIN_SIZE);
      runMutation(
        (present) => {
          let didChange = false;
          const nextBboxes = present.bboxes.map((bbox) => {
            if (bbox.id !== bboxId) {
              return bbox;
            }

            if (areRectsEqual(bbox, boundedRect)) {
              return bbox;
            }

            didChange = true;
            return {
              ...bbox,
              ...boundedRect
            };
          });

          if (!didChange) {
            return null;
          }

          return {
            bboxes: nextBboxes,
            customEntityLabels: present.customEntityLabels
          };
        },
        {
          mutationKey: `rect:${bboxId}`,
          allowCoalesce: true
        }
      );
    },
    [pageSize, runMutation]
  );

  const updateBboxEntityLabel = useCallback(
    (bboxId: string, nextLabel: string) => {
      runMutation((present) => {
        let didChange = false;
        const nextBboxes = present.bboxes.map((bbox) => {
          if (bbox.id !== bboxId) {
            return bbox;
          }

          if (bbox.entityLabel === nextLabel) {
            return bbox;
          }

          didChange = true;
          return {
            ...bbox,
            entityLabel: nextLabel
          };
        });

        if (!didChange) {
          return null;
        }

        return {
          bboxes: nextBboxes,
          customEntityLabels: present.customEntityLabels
        };
      });
    },
    [runMutation]
  );

  const updateBboxInstanceNumber = useCallback(
    (bboxId: string, nextNumber: number | null) => {
      const safeNumber =
        typeof nextNumber === "number" && Number.isFinite(nextNumber) && nextNumber > 0
          ? Math.trunc(nextNumber)
          : null;

      runMutation((present) => {
        let didChange = false;
        const nextBboxes = present.bboxes.map((bbox) => {
          if (bbox.id !== bboxId) {
            return bbox;
          }

          if (bbox.instanceNumber === safeNumber) {
            return bbox;
          }

          didChange = true;
          return {
            ...bbox,
            instanceNumber: safeNumber
          };
        });

        if (!didChange) {
          return null;
        }

        return {
          bboxes: nextBboxes,
          customEntityLabels: present.customEntityLabels
        };
      });
    },
    [runMutation]
  );

  const deleteBbox = useCallback(
    (bboxId: string) => {
      runMutation((present) => {
        const nextBboxes = present.bboxes.filter((bbox) => bbox.id !== bboxId);
        if (nextBboxes.length === present.bboxes.length) {
          return null;
        }

        return {
          bboxes: nextBboxes,
          customEntityLabels: present.customEntityLabels
        };
      });

      setSelectedBboxId((previous) => (previous === bboxId ? null : previous));
      setEditingBboxId((previous) => (previous === bboxId ? null : previous));
    },
    [runMutation, setEditingBboxId, setSelectedBboxId]
  );

  const registerCustomEntityLabel = useCallback(
    (label: string) => {
      if (label.trim().length === 0) {
        return;
      }

      runMutation((present) => {
        if (
          present.customEntityLabels.includes(label) ||
          (DEFAULT_ARABIC_ENTITY_LABELS as readonly string[]).includes(label)
        ) {
          return null;
        }

        return {
          bboxes: present.bboxes,
          customEntityLabels: [...present.customEntityLabels, label]
        };
      });
    },
    [runMutation]
  );

  return {
    canPaste: clipboardSnapshot !== null,
    entityOptions,
    createBbox,
    copyBbox,
    duplicateBbox,
    pasteClipboardToCurrentPage,
    updateBboxRect,
    updateBboxEntityLabel,
    updateBboxInstanceNumber,
    deleteBbox,
    registerCustomEntityLabel
  };
}
