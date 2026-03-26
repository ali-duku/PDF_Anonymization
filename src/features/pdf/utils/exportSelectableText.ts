import type { PdfBboxRect, PdfPageSize } from "../types/bbox";

export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectableTextRun {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

interface PdfJsTextStyle {
  ascent?: number;
  descent?: number;
}

interface PdfJsTextContent {
  items: unknown[];
  styles?: Record<string, PdfJsTextStyle>;
}

interface PdfJsTextItem {
  str: string;
  width: number;
  height: number;
  transform: [number, number, number, number, number, number];
  fontName?: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPdfJsTextItem(item: unknown): item is PdfJsTextItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as Partial<PdfJsTextItem>;
  return (
    typeof candidate.str === "string" &&
    Array.isArray(candidate.transform) &&
    candidate.transform.length === 6 &&
    candidate.transform.every(isFiniteNumber) &&
    isFiniteNumber(candidate.width) &&
    isFiniteNumber(candidate.height)
  );
}

export function toPdfBottomLeftRect(rect: PdfBboxRect, pageSize: PdfPageSize): PdfRect {
  return {
    x: rect.x,
    y: pageSize.height - (rect.y + rect.height),
    width: rect.width,
    height: rect.height
  };
}

export function rectsIntersect(a: PdfRect, b: PdfRect): boolean {
  const aRight = a.x + a.width;
  const aTop = a.y + a.height;
  const bRight = b.x + b.width;
  const bTop = b.y + b.height;

  return a.x < bRight && aRight > b.x && a.y < bTop && aTop > b.y;
}

function expandRect(rect: PdfRect, margin: number): PdfRect {
  if (margin <= 0) {
    return rect;
  }

  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2
  };
}

function buildTextBounds(item: PdfJsTextItem, style?: PdfJsTextStyle): PdfRect {
  const [a, b, c, d, e, f] = item.transform;
  const fallbackHeight = Math.max(Math.hypot(c, d), Math.hypot(a, b), 1);
  const textHeight = Math.max(item.height, fallbackHeight, 1);
  const textWidth = Math.max(item.width, 0.1);
  const descent = Number.isFinite(style?.descent) ? Math.min(style?.descent ?? 0, 0) : -0.2;
  const bottomY = f + descent * textHeight;

  return {
    x: e,
    y: bottomY,
    width: textWidth,
    height: textHeight
  };
}

function resolveTextFontSize(item: PdfJsTextItem): number {
  const [a, b, c, d] = item.transform;
  return Math.max(Math.hypot(c, d), Math.hypot(a, b), item.height, 1);
}

export function extractSelectableTextRuns(
  textContent: unknown,
  redactionRects: readonly PdfRect[],
  overlapPadding: number
): SelectableTextRun[] {
  if (!textContent || typeof textContent !== "object") {
    return [];
  }

  const { items, styles } = textContent as PdfJsTextContent;
  if (!Array.isArray(items)) {
    return [];
  }

  const expandedRedactions = redactionRects.map((rect) => expandRect(rect, overlapPadding));
  const runs: SelectableTextRun[] = [];

  for (const item of items) {
    if (!isPdfJsTextItem(item)) {
      continue;
    }

    if (!item.str.trim()) {
      continue;
    }

    const style = item.fontName ? styles?.[item.fontName] : undefined;
    const textBounds = buildTextBounds(item, style);
    const intersectsRedaction = expandedRedactions.some((redactionRect) =>
      rectsIntersect(textBounds, redactionRect)
    );

    if (intersectsRedaction) {
      continue;
    }

    runs.push({
      text: item.str,
      x: textBounds.x,
      y: textBounds.y,
      fontSize: resolveTextFontSize(item)
    });
  }

  return runs;
}
