export interface PdfPageSize {
  width: number;
  height: number;
}

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
}

export interface BboxDisplayRect extends PdfBboxRect {}

export type BboxResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

