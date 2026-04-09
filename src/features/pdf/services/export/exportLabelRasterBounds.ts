import {
  EXPORT_LABEL_RASTER_ALPHA_THRESHOLD,
  EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS
} from "../../constants/exportLabelSafety";
import type { PdfBboxRect } from "../../types/bbox";

export interface RasterAlphaBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function resolveRasterAlphaBounds(
  drawContext: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): RasterAlphaBounds | null {
  const imageData = drawContext.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < canvasHeight; y += 1) {
    for (let x = 0; x < canvasWidth; x += 1) {
      const alpha = data[(y * canvasWidth + x) * 4 + 3];
      if (alpha < EXPORT_LABEL_RASTER_ALPHA_THRESHOLD) {
        continue;
      }

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }

  return { left, top, right, bottom };
}

export function doesRasterBoundsFitSafeRect(
  bounds: RasterAlphaBounds | null,
  safeRect: PdfBboxRect,
  scale: number
): boolean {
  if (!bounds) {
    return true;
  }

  const left = bounds.left / scale;
  const top = bounds.top / scale;
  const right = (bounds.right + 1) / scale;
  const bottom = (bounds.bottom + 1) / scale;
  const safeRight = safeRect.x + safeRect.width;
  const safeBottom = safeRect.y + safeRect.height;

  return (
    left >= safeRect.x - EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS &&
    top >= safeRect.y - EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS &&
    right <= safeRight + EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS &&
    bottom <= safeBottom + EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS
  );
}
