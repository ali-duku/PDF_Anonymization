import type { OverlayEntitySpan } from "../../../types/overlay";
import { sortEntitySpans } from "../../../constants/anonymizationEntities";
import { buildTextSegments, type TextSegment } from "./textEntities";

type PreviewWarningCode = "ENTITY_OVERLAPS_MARKUP" | "SELECTION_OVERLAPS_MARKUP";

export interface PreviewWarning {
  code: PreviewWarningCode;
  message: string;
  entityIndex?: number;
}

interface VisibleTextRange {
  start: number;
  end: number;
  text: string;
}

export interface TablePreviewFragment {
  text: string;
  entityIndex: number | null;
  entity: string | null;
  start: number | null;
  end: number | null;
}

export interface TablePreviewCell {
  kind: "th" | "td";
  colSpan: number;
  rowSpan: number;
  fragments: TablePreviewFragment[];
}

export interface TablePreviewRow {
  cells: TablePreviewCell[];
}

export interface PlainTextPreviewModel {
  kind: "plain_text";
  segments: TextSegment[];
}

export interface HtmlTablePreviewModel {
  kind: "html_table";
  rows: TablePreviewRow[];
  warnings: PreviewWarning[];
  visibleTextRanges: ReadonlyArray<VisibleTextRange>;
}

export type RegionPreviewModel = PlainTextPreviewModel | HtmlTablePreviewModel;

function toIntAttribute(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function mergePlainFragments(fragments: TablePreviewFragment[]): TablePreviewFragment[] {
  if (fragments.length <= 1) {
    return fragments;
  }
  const merged: TablePreviewFragment[] = [];
  for (const fragment of fragments) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.entityIndex === null &&
      fragment.entityIndex === null &&
      previous.end === fragment.start
    ) {
      previous.text += fragment.text;
      previous.end = fragment.end;
      continue;
    }
    merged.push({ ...fragment });
  }
  return merged;
}

function splitRangeIntoFragments(
  range: VisibleTextRange,
  entities: OverlayEntitySpan[]
): TablePreviewFragment[] {
  const fragments: TablePreviewFragment[] = [];
  let cursor = range.start;

  entities.forEach((entity, index) => {
    if (entity.end <= range.start || entity.start >= range.end) {
      return;
    }

    const overlapStart = Math.max(entity.start, range.start);
    const overlapEnd = Math.min(entity.end, range.end);
    if (overlapStart >= overlapEnd) {
      return;
    }

    if (overlapStart > cursor) {
      fragments.push({
        text: range.text.slice(cursor - range.start, overlapStart - range.start),
        entityIndex: null,
        entity: null,
        start: cursor,
        end: overlapStart
      });
    }

    fragments.push({
      text: range.text.slice(overlapStart - range.start, overlapEnd - range.start),
      entityIndex: index,
      entity: entity.entity,
      start: overlapStart,
      end: overlapEnd
    });
    cursor = overlapEnd;
  });

  if (cursor < range.end) {
    fragments.push({
      text: range.text.slice(cursor - range.start),
      entityIndex: null,
      entity: null,
      start: cursor,
      end: range.end
    });
  }

  if (fragments.length === 0) {
    fragments.push({
      text: range.text,
      entityIndex: null,
      entity: null,
      start: range.start,
      end: range.end
    });
  }

  return fragments;
}

function rangeIsFullyVisible(
  visibleRanges: ReadonlyArray<VisibleTextRange>,
  start: number,
  end: number
): boolean {
  if (start >= end) {
    return false;
  }

  let position = start;
  for (const range of visibleRanges) {
    if (range.end <= position) {
      continue;
    }
    if (range.start > position) {
      break;
    }
    position = Math.min(end, range.end);
    if (position >= end) {
      return true;
    }
  }

  return false;
}

function detectFencedHtmlTable(text: string):
  | {
      tableHtml: string;
      tableStartInText: number;
    }
  | null {
  const fenceStart = text.indexOf("```html");
  if (fenceStart < 0) {
    return null;
  }

  if (!/^\s*$/.test(text.slice(0, fenceStart))) {
    return null;
  }

  const openFenceMatch = /```html[^\n]*\n/.exec(text.slice(fenceStart));
  if (!openFenceMatch) {
    return null;
  }

  const htmlStart = fenceStart + openFenceMatch[0].length;
  const closeFenceStart = text.indexOf("\n```", htmlStart);
  if (closeFenceStart < 0) {
    return null;
  }

  const trailing = text.slice(closeFenceStart + 4);
  if (!/^\s*$/.test(trailing)) {
    return null;
  }

  const fencedBody = text.slice(htmlStart, closeFenceStart);
  const tableMatch = /<table\b[\s\S]*<\/table>/i.exec(fencedBody);
  if (!tableMatch) {
    return null;
  }

  const beforeTable = fencedBody.slice(0, tableMatch.index);
  const afterTable = fencedBody.slice(tableMatch.index + tableMatch[0].length);
  if (!/^\s*$/.test(beforeTable) || !/^\s*$/.test(afterTable)) {
    return null;
  }

  return {
    tableHtml: tableMatch[0],
    tableStartInText: htmlStart + tableMatch.index
  };
}

function parseCellInnerVisibleRanges(
  cellInnerHtml: string,
  cellInnerStartInText: number
): VisibleTextRange[] {
  const ranges: VisibleTextRange[] = [];
  const tagPattern = /<[^>]*>/g;
  let cursor = 0;
  let match = tagPattern.exec(cellInnerHtml);

  while (match) {
    if (match.index > cursor) {
      const textChunk = cellInnerHtml.slice(cursor, match.index);
      if (textChunk.length > 0) {
        ranges.push({
          start: cellInnerStartInText + cursor,
          end: cellInnerStartInText + match.index,
          text: textChunk
        });
      }
    }
    cursor = match.index + match[0].length;
    match = tagPattern.exec(cellInnerHtml);
  }

  if (cursor < cellInnerHtml.length) {
    const textChunk = cellInnerHtml.slice(cursor);
    if (textChunk.length > 0) {
      ranges.push({
        start: cellInnerStartInText + cursor,
        end: cellInnerStartInText + cellInnerHtml.length,
        text: textChunk
      });
    }
  }

  return ranges;
}

export function buildRegionPreviewModel(
  text: string,
  entities: OverlayEntitySpan[]
): RegionPreviewModel {
  const normalizedEntities = sortEntitySpans(entities);
  const tableSource = detectFencedHtmlTable(text);
  if (!tableSource) {
    return {
      kind: "plain_text",
      segments: buildTextSegments(text, normalizedEntities)
    };
  }

  const rows: TablePreviewRow[] = [];
  const warnings: PreviewWarning[] = [];
  const visibleTextRanges: VisibleTextRange[] = [];

  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch = rowPattern.exec(tableSource.tableHtml);

  while (rowMatch) {
    const rowMarkup = rowMatch[0];
    const rowContent = rowMatch[1] ?? "";
    const rowOpenTagMatch = /<tr\b[^>]*>/i.exec(rowMarkup);
    const rowContentStartInTable =
      rowMatch.index + (rowOpenTagMatch ? rowOpenTagMatch[0].length : 0);
    const rowContentStartInText = tableSource.tableStartInText + rowContentStartInTable;

    const cells: TablePreviewCell[] = [];
    const cellPattern = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cellMatch = cellPattern.exec(rowContent);

    while (cellMatch) {
      const fullCellMarkup = cellMatch[0];
      const tag = (cellMatch[1] ?? "td").toLowerCase() as "td" | "th";
      const attributes = cellMatch[2] ?? "";
      const innerHtml = cellMatch[3] ?? "";

      const cellOpenTagMatch = /<(td|th)\b[^>]*>/i.exec(fullCellMarkup);
      const cellInnerStartInRowContent =
        cellMatch.index + (cellOpenTagMatch ? cellOpenTagMatch[0].length : 0);
      const cellInnerStartInText = rowContentStartInText + cellInnerStartInRowContent;

      const cellRanges = parseCellInnerVisibleRanges(innerHtml, cellInnerStartInText);
      visibleTextRanges.push(...cellRanges);

      const cellFragments = mergePlainFragments(
        cellRanges.flatMap((range) => splitRangeIntoFragments(range, normalizedEntities))
      );

      const colSpanMatch = /\bcolspan\s*=\s*"(\d+)"/i.exec(attributes);
      const rowSpanMatch = /\browspan\s*=\s*"(\d+)"/i.exec(attributes);

      cells.push({
        kind: tag,
        colSpan: toIntAttribute(colSpanMatch?.[1] ?? null, 1),
        rowSpan: toIntAttribute(rowSpanMatch?.[1] ?? null, 1),
        fragments: cellFragments
      });

      cellMatch = cellPattern.exec(rowContent);
    }

    rows.push({ cells });
    rowMatch = rowPattern.exec(tableSource.tableHtml);
  }

  normalizedEntities.forEach((entity, index) => {
    if (!rangeIsFullyVisible(visibleTextRanges, entity.start, entity.end)) {
      warnings.push({
        code: "ENTITY_OVERLAPS_MARKUP",
        entityIndex: index,
        message: `Anonymized span #${index + 1} overlaps HTML markup and cannot be fully rendered in table preview.`
      });
    }
  });

  return {
    kind: "html_table",
    rows,
    warnings,
    visibleTextRanges
  };
}

export function canApplySelectionToTablePreview(
  previewModel: RegionPreviewModel,
  start: number,
  end: number
): { valid: true } | { valid: false; warning: PreviewWarning } {
  if (previewModel.kind !== "html_table") {
    return { valid: true };
  }

  if (rangeIsFullyVisible(previewModel.visibleTextRanges, start, end)) {
    return { valid: true };
  }

  return {
    valid: false,
    warning: {
      code: "SELECTION_OVERLAPS_MARKUP",
      message: "Selection overlaps HTML markup. Select only visible table text before anonymizing."
    }
  };
}
