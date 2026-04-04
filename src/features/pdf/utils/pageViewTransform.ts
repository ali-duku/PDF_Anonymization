import {
  DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS,
  PAGE_VIEW_ROTATION_DEGREES,
  PAGE_VIEW_ROTATION_STEPS,
  type PageViewRotationQuarterTurns
} from "../constants/pageView";
import type { BboxDisplayRect, BboxResizeHandle, PdfBboxRect, PdfPageSize } from "../types/bbox";

export interface PageViewPoint {
  x: number;
  y: number;
}

type ResizeHandleMap = Record<BboxResizeHandle, BboxResizeHandle>;

const IDENTITY_RESIZE_HANDLE_MAP: ResizeHandleMap = {
  n: "n",
  ne: "ne",
  e: "e",
  se: "se",
  s: "s",
  sw: "sw",
  w: "w",
  nw: "nw"
};

const RESIZE_HANDLE_MAP_BY_ROTATION: Record<PageViewRotationQuarterTurns, ResizeHandleMap> = {
  0: IDENTITY_RESIZE_HANDLE_MAP,
  1: {
    n: "w",
    ne: "nw",
    e: "n",
    se: "ne",
    s: "e",
    sw: "se",
    w: "s",
    nw: "sw"
  },
  2: {
    n: "s",
    ne: "sw",
    e: "w",
    se: "nw",
    s: "n",
    sw: "ne",
    w: "e",
    nw: "se"
  },
  3: {
    n: "e",
    ne: "se",
    e: "s",
    se: "sw",
    s: "w",
    sw: "nw",
    w: "n",
    nw: "ne"
  }
};

export function normalizePageViewRotationQuarterTurns(
  quarterTurns: number
): PageViewRotationQuarterTurns {
  if (!Number.isFinite(quarterTurns)) {
    return DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS;
  }

  return ((Math.trunc(quarterTurns) % PAGE_VIEW_ROTATION_STEPS) +
    PAGE_VIEW_ROTATION_STEPS) %
    PAGE_VIEW_ROTATION_STEPS as PageViewRotationQuarterTurns;
}

export function pageViewQuarterTurnsToDegrees(quarterTurns: number): number {
  return normalizePageViewRotationQuarterTurns(quarterTurns) * PAGE_VIEW_ROTATION_DEGREES;
}

export function isValidPageSize(size: PdfPageSize): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeRectWithinBounds(rect: PdfBboxRect, bounds: PdfPageSize): PdfBboxRect {
  const width = clampValue(Math.abs(rect.width), 0, bounds.width);
  const height = clampValue(Math.abs(rect.height), 0, bounds.height);

  return {
    x: clampValue(rect.x, 0, bounds.width - width),
    y: clampValue(rect.y, 0, bounds.height - height),
    width,
    height
  };
}

export function getRotatedPageViewSize(
  pageSize: PdfPageSize,
  quarterTurns: number
): PdfPageSize {
  const normalizedQuarterTurns = normalizePageViewRotationQuarterTurns(quarterTurns);
  if (!isValidPageSize(pageSize)) {
    return {
      width: 0,
      height: 0
    };
  }

  if (normalizedQuarterTurns === 1 || normalizedQuarterTurns === 3) {
    return {
      width: pageSize.height,
      height: pageSize.width
    };
  }

  return {
    width: pageSize.width,
    height: pageSize.height
  };
}

export function toPageViewPoint(
  point: PageViewPoint,
  pageViewBaseSize: PdfPageSize,
  quarterTurns: number
): PageViewPoint {
  const normalizedQuarterTurns = normalizePageViewRotationQuarterTurns(quarterTurns);
  if (!isValidPageSize(pageViewBaseSize)) {
    return {
      x: 0,
      y: 0
    };
  }

  if (normalizedQuarterTurns === 0) {
    return point;
  }

  if (normalizedQuarterTurns === 1) {
    return {
      x: pageViewBaseSize.height - point.y,
      y: point.x
    };
  }

  if (normalizedQuarterTurns === 2) {
    return {
      x: pageViewBaseSize.width - point.x,
      y: pageViewBaseSize.height - point.y
    };
  }

  return {
    x: point.y,
    y: pageViewBaseSize.width - point.x
  };
}

export function toPageViewBasePoint(
  point: PageViewPoint,
  pageViewBaseSize: PdfPageSize,
  quarterTurns: number
): PageViewPoint {
  const normalizedQuarterTurns = normalizePageViewRotationQuarterTurns(quarterTurns);
  if (!isValidPageSize(pageViewBaseSize)) {
    return {
      x: 0,
      y: 0
    };
  }

  if (normalizedQuarterTurns === 0) {
    return point;
  }

  if (normalizedQuarterTurns === 1) {
    return {
      x: point.y,
      y: pageViewBaseSize.height - point.x
    };
  }

  if (normalizedQuarterTurns === 2) {
    return {
      x: pageViewBaseSize.width - point.x,
      y: pageViewBaseSize.height - point.y
    };
  }

  return {
    x: pageViewBaseSize.width - point.y,
    y: point.x
  };
}

export function pageRectToRotatedDisplayRect(
  rect: PdfBboxRect,
  pageSize: PdfPageSize,
  displayPageBaseSize: PdfPageSize,
  quarterTurns: number
): BboxDisplayRect | null {
  if (!isValidPageSize(pageSize) || !isValidPageSize(displayPageBaseSize)) {
    return null;
  }

  const boundedRect = normalizeRectWithinBounds(rect, pageSize);
  const scaleX = displayPageBaseSize.width / pageSize.width;
  const scaleY = displayPageBaseSize.height / pageSize.height;

  const x0 = boundedRect.x * scaleX;
  const y0 = boundedRect.y * scaleY;
  const x1 = (boundedRect.x + boundedRect.width) * scaleX;
  const y1 = (boundedRect.y + boundedRect.height) * scaleY;

  const corners = [
    toPageViewPoint({ x: x0, y: y0 }, displayPageBaseSize, quarterTurns),
    toPageViewPoint({ x: x1, y: y0 }, displayPageBaseSize, quarterTurns),
    toPageViewPoint({ x: x1, y: y1 }, displayPageBaseSize, quarterTurns),
    toPageViewPoint({ x: x0, y: y1 }, displayPageBaseSize, quarterTurns)
  ];

  const left = Math.min(...corners.map((corner) => corner.x));
  const right = Math.max(...corners.map((corner) => corner.x));
  const top = Math.min(...corners.map((corner) => corner.y));
  const bottom = Math.max(...corners.map((corner) => corner.y));

  return {
    x: left,
    y: top,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0)
  };
}

export type ClientToPageProjector = (clientX: number, clientY: number) => PageViewPoint;

export function buildClientPointToPageProjector(
  stageElement: HTMLElement | null,
  pageSize: PdfPageSize,
  displayPageBaseSize: PdfPageSize,
  quarterTurns: number
): ClientToPageProjector | null {
  if (!stageElement || !isValidPageSize(pageSize) || !isValidPageSize(displayPageBaseSize)) {
    return null;
  }

  const stageRect = stageElement.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) {
    return null;
  }

  const rotatedDisplaySize = getRotatedPageViewSize(displayPageBaseSize, quarterTurns);
  const scaleXToView = rotatedDisplaySize.width / stageRect.width;
  const scaleYToView = rotatedDisplaySize.height / stageRect.height;
  const scaleXToPage = pageSize.width / displayPageBaseSize.width;
  const scaleYToPage = pageSize.height / displayPageBaseSize.height;

  return (clientX: number, clientY: number) => {
    const viewPoint = {
      x: clampValue((clientX - stageRect.left) * scaleXToView, 0, rotatedDisplaySize.width),
      y: clampValue((clientY - stageRect.top) * scaleYToView, 0, rotatedDisplaySize.height)
    };

    const baseDisplayPoint = toPageViewBasePoint(viewPoint, displayPageBaseSize, quarterTurns);
    return {
      x: clampValue(baseDisplayPoint.x * scaleXToPage, 0, pageSize.width),
      y: clampValue(baseDisplayPoint.y * scaleYToPage, 0, pageSize.height)
    };
  };
}

export function mapViewResizeHandleToPageResizeHandle(
  handle: BboxResizeHandle,
  quarterTurns: number
): BboxResizeHandle {
  const normalizedQuarterTurns = normalizePageViewRotationQuarterTurns(quarterTurns);
  return RESIZE_HANDLE_MAP_BY_ROTATION[normalizedQuarterTurns][handle];
}

export function getPageCanvasRotationTransform(
  displayPageBaseSize: PdfPageSize,
  quarterTurns: number
): string {
  const normalizedQuarterTurns = normalizePageViewRotationQuarterTurns(quarterTurns);

  if (!isValidPageSize(displayPageBaseSize) || normalizedQuarterTurns === 0) {
    return "none";
  }

  if (normalizedQuarterTurns === 1) {
    return `translateX(${displayPageBaseSize.height}px) rotate(90deg)`;
  }

  if (normalizedQuarterTurns === 2) {
    return `translateX(${displayPageBaseSize.width}px) translateY(${displayPageBaseSize.height}px) rotate(180deg)`;
  }

  return `translateY(${displayPageBaseSize.width}px) rotate(270deg)`;
}
