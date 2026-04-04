import { DEFAULT_ARABIC_ENTITY_LABELS } from "../../constants/bbox";
import type { PdfBboxRect } from "../../types/bbox";
import type { SessionPresentState } from "../../types/session";
import { resolveBboxTextRotationQuarterTurns } from "../../utils/bboxState";
import { normalizeBboxTextRotationQuarterTurns } from "../../utils/bboxTextRotation";
import { normalizePotentialMojibakeText } from "../../utils/textEncoding";

type SessionMutationResult = Omit<SessionPresentState, "revision"> | null;

function areRectsEqual(left: PdfBboxRect, right: PdfBboxRect): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

export function buildEntityOptions(customEntityLabels: readonly string[]): readonly string[] {
  const options: string[] = DEFAULT_ARABIC_ENTITY_LABELS.map((label) => normalizePotentialMojibakeText(label));
  for (const customLabel of customEntityLabels) {
    const normalizedCustomLabel = normalizePotentialMojibakeText(customLabel);
    if (!options.includes(normalizedCustomLabel)) {
      options.push(normalizedCustomLabel);
    }
  }
  return options;
}

export function applyBboxRectUpdate(
  present: SessionPresentState,
  bboxId: string,
  boundedRect: PdfBboxRect
): SessionMutationResult {
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
}

export function applyBboxEntityLabelUpdate(
  present: SessionPresentState,
  bboxId: string,
  nextLabel: string
): SessionMutationResult {
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
}

export function applyBboxInstanceNumberUpdate(
  present: SessionPresentState,
  bboxId: string,
  nextNumber: number | null
): SessionMutationResult {
  let didChange = false;
  const nextBboxes = present.bboxes.map((bbox) => {
    if (bbox.id !== bboxId) {
      return bbox;
    }
    if (bbox.instanceNumber === nextNumber) {
      return bbox;
    }
    didChange = true;
    return {
      ...bbox,
      instanceNumber: nextNumber
    };
  });
  if (!didChange) {
    return null;
  }
  return {
    bboxes: nextBboxes,
    customEntityLabels: present.customEntityLabels
  };
}

export function applyBboxTextRotationUpdate(
  present: SessionPresentState,
  bboxId: string,
  nextRotationQuarterTurns: number
): SessionMutationResult {
  const normalizedRotation = normalizeBboxTextRotationQuarterTurns(nextRotationQuarterTurns);
  let didChange = false;
  const nextBboxes = present.bboxes.map((bbox) => {
    if (bbox.id !== bboxId) {
      return bbox;
    }
    const previousRotation = resolveBboxTextRotationQuarterTurns(bbox.textRotationQuarterTurns);
    if (previousRotation === normalizedRotation) {
      return bbox;
    }
    didChange = true;
    return {
      ...bbox,
      textRotationQuarterTurns: normalizedRotation
    };
  });
  if (!didChange) {
    return null;
  }
  return {
    bboxes: nextBboxes,
    customEntityLabels: present.customEntityLabels
  };
}

export function applyCustomEntityLabelRegistration(
  present: SessionPresentState,
  label: string
): SessionMutationResult {
  const normalizedLabel = normalizePotentialMojibakeText(label);
  if (normalizedLabel.trim().length === 0) {
    return null;
  }
  if (
    present.customEntityLabels.includes(normalizedLabel) ||
    (DEFAULT_ARABIC_ENTITY_LABELS as readonly string[]).includes(normalizedLabel)
  ) {
    return null;
  }
  return {
    bboxes: present.bboxes,
    customEntityLabels: [...present.customEntityLabels, normalizedLabel]
  };
}
