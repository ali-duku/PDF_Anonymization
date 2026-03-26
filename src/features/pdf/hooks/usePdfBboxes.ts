import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BBOX_MIN_SIZE, DEFAULT_ARABIC_ENTITY_LABELS, DEFAULT_BBOX_ENTITY_LABEL } from "../constants/bbox";
import type { PdfBbox, PdfBboxRect, PdfPageSize } from "../types/bbox";
import { normalizeRectWithinBounds } from "../utils/bboxGeometry";

interface UsePdfBboxesOptions {
  documentKey: string | null;
  currentPage: number;
  pageSize: PdfPageSize;
}

type BboxesByDocument = Record<string, PdfBbox[]>;
type BboxCollectionUpdater = (bboxes: PdfBbox[]) => PdfBbox[];

export interface UsePdfBboxesResult {
  bboxes: PdfBbox[];
  currentPageBboxes: PdfBbox[];
  selectedBboxId: string | null;
  editingBboxId: string | null;
  entityOptions: readonly string[];
  selectBbox: (bboxId: string | null) => void;
  startEditingBbox: (bboxId: string | null) => void;
  createBbox: (rect: PdfBboxRect) => void;
  updateBboxRect: (bboxId: string, rect: PdfBboxRect) => void;
  updateBboxEntityLabel: (bboxId: string, nextLabel: string) => void;
  updateBboxInstanceNumber: (bboxId: string, nextNumber: number | null) => void;
  deleteBbox: (bboxId: string) => void;
  registerCustomEntityLabel: (label: string) => void;
}

const EMPTY_BBOXES: PdfBbox[] = [];

function buildBboxId(sequence: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bbox-${crypto.randomUUID()}`;
  }
  return `bbox-${Date.now()}-${sequence}`;
}

export function usePdfBboxes({
  documentKey,
  currentPage,
  pageSize
}: UsePdfBboxesOptions): UsePdfBboxesResult {
  const [bboxesByDocument, setBboxesByDocument] = useState<BboxesByDocument>({});
  const [selectedBboxId, setSelectedBboxId] = useState<string | null>(null);
  const [editingBboxId, setEditingBboxId] = useState<string | null>(null);
  const [customEntityLabels, setCustomEntityLabels] = useState<string[]>([]);
  const idSequenceRef = useRef(0);

  useEffect(() => {
    setSelectedBboxId(null);
    setEditingBboxId(null);
  }, [documentKey]);

  const bboxes = useMemo(
    () => (documentKey ? bboxesByDocument[documentKey] ?? EMPTY_BBOXES : EMPTY_BBOXES),
    [bboxesByDocument, documentKey]
  );

  const currentPageBboxes = useMemo(
    () => bboxes.filter((bbox) => bbox.pageNumber === currentPage),
    [bboxes, currentPage]
  );

  useEffect(() => {
    if (!selectedBboxId) {
      return;
    }
    const isVisible = currentPageBboxes.some((bbox) => bbox.id === selectedBboxId);
    if (!isVisible) {
      setSelectedBboxId(null);
    }
  }, [currentPageBboxes, selectedBboxId]);

  useEffect(() => {
    if (!editingBboxId) {
      return;
    }
    const isVisible = currentPageBboxes.some((bbox) => bbox.id === editingBboxId);
    if (!isVisible) {
      setEditingBboxId(null);
    }
  }, [currentPageBboxes, editingBboxId]);

  const entityOptions = useMemo(() => {
    const options: string[] = [...DEFAULT_ARABIC_ENTITY_LABELS];
    for (const customLabel of customEntityLabels) {
      if (!options.includes(customLabel)) {
        options.push(customLabel);
      }
    }
    return options;
  }, [customEntityLabels]);

  const updateActiveDocumentBboxes = useCallback(
    (updater: BboxCollectionUpdater) => {
      if (!documentKey) {
        return;
      }

      setBboxesByDocument((previous) => {
        const current = previous[documentKey] ?? EMPTY_BBOXES;
        const next = updater(current);

        if (next === current) {
          return previous;
        }

        return {
          ...previous,
          [documentKey]: next
        };
      });
    },
    [documentKey]
  );

  const selectBbox = useCallback((bboxId: string | null) => {
    setSelectedBboxId(bboxId);
  }, []);

  const startEditingBbox = useCallback((bboxId: string | null) => {
    setEditingBboxId(bboxId);
    if (bboxId) {
      setSelectedBboxId(bboxId);
    }
  }, []);

  const createBbox = useCallback(
    (rect: PdfBboxRect) => {
      if (!documentKey) {
        return;
      }

      const nextRect = normalizeRectWithinBounds(rect, pageSize, BBOX_MIN_SIZE);
      idSequenceRef.current += 1;
      const nextId = buildBboxId(idSequenceRef.current);
      const nextBbox: PdfBbox = {
        id: nextId,
        pageNumber: currentPage,
        x: nextRect.x,
        y: nextRect.y,
        width: nextRect.width,
        height: nextRect.height,
        entityLabel: DEFAULT_BBOX_ENTITY_LABEL,
        instanceNumber: null
      };

      updateActiveDocumentBboxes((previous) => [...previous, nextBbox]);
      setSelectedBboxId(nextId);
      setEditingBboxId(null);
    },
    [currentPage, documentKey, pageSize, updateActiveDocumentBboxes]
  );

  const updateBboxRect = useCallback(
    (bboxId: string, rect: PdfBboxRect) => {
      const boundedRect = normalizeRectWithinBounds(rect, pageSize, BBOX_MIN_SIZE);
      updateActiveDocumentBboxes((previous) => {
        let didChange = false;
        const next = previous.map((bbox) => {
          if (bbox.id !== bboxId) {
            return bbox;
          }
          didChange = true;
          return {
            ...bbox,
            ...boundedRect
          };
        });

        return didChange ? next : previous;
      });
    },
    [pageSize, updateActiveDocumentBboxes]
  );

  const updateBboxEntityLabel = useCallback(
    (bboxId: string, nextLabel: string) => {
      updateActiveDocumentBboxes((previous) => {
        let didChange = false;
        const next = previous.map((bbox) => {
          if (bbox.id !== bboxId) {
            return bbox;
          }
          didChange = true;
          return {
            ...bbox,
            entityLabel: nextLabel
          };
        });

        return didChange ? next : previous;
      });
    },
    [updateActiveDocumentBboxes]
  );

  const updateBboxInstanceNumber = useCallback(
    (bboxId: string, nextNumber: number | null) => {
      const safeNumber =
        typeof nextNumber === "number" && Number.isFinite(nextNumber) && nextNumber > 0
          ? Math.trunc(nextNumber)
          : null;

      updateActiveDocumentBboxes((previous) => {
        let didChange = false;
        const next = previous.map((bbox) => {
          if (bbox.id !== bboxId) {
            return bbox;
          }
          didChange = true;
          return {
            ...bbox,
            instanceNumber: safeNumber
          };
        });

        return didChange ? next : previous;
      });
    },
    [updateActiveDocumentBboxes]
  );

  const deleteBbox = useCallback(
    (bboxId: string) => {
      updateActiveDocumentBboxes((previous) => {
        const next = previous.filter((bbox) => bbox.id !== bboxId);
        return next.length === previous.length ? previous : next;
      });
      setSelectedBboxId((previous) => (previous === bboxId ? null : previous));
      setEditingBboxId((previous) => (previous === bboxId ? null : previous));
    },
    [updateActiveDocumentBboxes]
  );

  const registerCustomEntityLabel = useCallback((label: string) => {
    const normalizedLabel = label.trim();
    if (!normalizedLabel) {
      return;
    }

    setCustomEntityLabels((previous) => {
      if (
        previous.includes(normalizedLabel) ||
        (DEFAULT_ARABIC_ENTITY_LABELS as readonly string[]).includes(normalizedLabel)
      ) {
        return previous;
      }
      return [...previous, normalizedLabel];
    });
  }, []);

  return {
    bboxes,
    currentPageBboxes,
    selectedBboxId,
    editingBboxId,
    entityOptions,
    selectBbox,
    startEditingBbox,
    createBbox,
    updateBboxRect,
    updateBboxEntityLabel,
    updateBboxInstanceNumber,
    deleteBbox,
    registerCustomEntityLabel
  };
}
