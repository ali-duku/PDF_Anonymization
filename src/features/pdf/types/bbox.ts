export interface PdfPageSize {
  width: number;
  height: number;
}

export type BboxTextRotationQuarterTurns = 0 | 1 | 2 | 3;

export interface PdfBboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfBbox extends PdfBboxRect {
  id: string;
  pageNumber: number;
  entityLabel: string;
  instanceNumber: number | null;
  textRotationQuarterTurns: BboxTextRotationQuarterTurns;
}

export interface BboxClipboardSnapshot extends PdfBboxRect {
  entityLabel: string;
  instanceNumber: number | null;
  textRotationQuarterTurns: BboxTextRotationQuarterTurns;
}

export interface BboxDisplayRect extends PdfBboxRect {}

export type BboxResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

