import { useCallback, useMemo } from "react";
import { BBOX_MIN_SIZE } from "../../constants/bbox";
import type { BboxClipboardSnapshot, PdfBbox, PdfBboxRect, PdfPageSize } from "../../types/bbox";
import type { SessionPresentState } from "../../types/session";
import type { AppLanguageMode } from "../../../../types/language";
import { buildDuplicateRect, buildPastedRect, createBboxClipboardSnapshot } from "../../utils/bboxClipboard";
import { buildNewPdfBbox } from "../../utils/bboxCreation";
import { resolveBboxTextRotationQuarterTurns } from "../../utils/bboxState";
import { normalizePotentialMojibakeText } from "../../utils/textEncoding";
import { normalizeRectWithinBounds } from "../../utils/bboxGeometry";
import {
  applyBboxEntityLabelUpdate,
  applyBboxInstanceNumberUpdate,
  applyBboxRectUpdate,
  applyBboxTextRotationUpdate,
  applyCustomEntityLabelRegistration,
  buildEntityOptions
} from "./bboxMutationHelpers";

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
  languageMode: AppLanguageMode;
  currentPage: number;
  currentPageViewRotationQuarterTurns: number;
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
  updateBboxTextRotation: (bboxId: string, nextRotationQuarterTurns: number) => void;
  deleteBbox: (bboxId: string) => void;
  registerCustomEntityLabel: (label: string) => void;
}

export function useBboxMutationActions({
  hasActiveSession,
  languageMode,
  currentPage,
  currentPageViewRotationQuarterTurns,
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
  const entityOptions = useMemo(
    () => buildEntityOptions(customEntityLabels, languageMode),
    [customEntityLabels, languageMode]
  );

  const createBbox = useCallback(
    (rect: PdfBboxRect) => {
      if (!hasActiveSession) {
        return;
      }

      const nextRect = normalizeRectWithinBounds(rect, pageSize, BBOX_MIN_SIZE);
      const nextId = nextBboxId();
      const nextBbox = buildNewPdfBbox({
        id: nextId,
        pageNumber: currentPage,
        rect: nextRect,
        pageViewRotationQuarterTurns: currentPageViewRotationQuarterTurns
      });

      runMutation((present) => ({
        bboxes: [...present.bboxes, nextBbox],
        customEntityLabels: present.customEntityLabels
      }));
      setSelectedBboxId(nextId);
      setEditingBboxId(nextId);
    },
    [
      currentPage,
      currentPageViewRotationQuarterTurns,
      hasActiveSession,
      nextBboxId,
      pageSize,
      runMutation,
      setEditingBboxId,
      setSelectedBboxId
    ]
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
        textRotationQuarterTurns: resolveBboxTextRotationQuarterTurns(sourceBbox.textRotationQuarterTurns),
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
      entityLabel: normalizePotentialMojibakeText(clipboardSnapshot.entityLabel),
      instanceNumber: clipboardSnapshot.instanceNumber,
      textRotationQuarterTurns: resolveBboxTextRotationQuarterTurns(clipboardSnapshot.textRotationQuarterTurns)
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
      runMutation((present) => applyBboxRectUpdate(present, bboxId, boundedRect), {
        mutationKey: `rect:${bboxId}`,
        allowCoalesce: true
      });
    },
    [pageSize, runMutation]
  );

  const updateBboxEntityLabel = useCallback(
    (bboxId: string, nextLabel: string) => {
      runMutation((present) =>
        applyBboxEntityLabelUpdate(present, bboxId, normalizePotentialMojibakeText(nextLabel))
      );
    },
    [runMutation]
  );

  const updateBboxInstanceNumber = useCallback(
    (bboxId: string, nextNumber: number | null) => {
      const safeNumber =
        typeof nextNumber === "number" && Number.isFinite(nextNumber) && nextNumber > 0
          ? Math.trunc(nextNumber)
          : null;
      runMutation((present) => applyBboxInstanceNumberUpdate(present, bboxId, safeNumber));
    },
    [runMutation]
  );

  const updateBboxTextRotation = useCallback(
    (bboxId: string, nextRotationQuarterTurns: number) => {
      runMutation((present) => applyBboxTextRotationUpdate(present, bboxId, nextRotationQuarterTurns));
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
      runMutation((present) => applyCustomEntityLabelRegistration(present, label));
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
    updateBboxTextRotation,
    deleteBbox,
    registerCustomEntityLabel
  };
}
