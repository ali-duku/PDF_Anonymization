import type { ImageDataLike } from "@embedpdf/models";
import {
  EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX,
  EXPORT_INTEGRITY_DIFF_RATIO_THRESHOLD,
  EXPORT_INTEGRITY_PIXEL_DIFF_THRESHOLD,
  EXPORT_INTEGRITY_SEVERE_DIFF_RATIO_THRESHOLD,
  EXPORT_INTEGRITY_SEVERE_PIXEL_DIFF_THRESHOLD
} from "../../constants/export";
import type { PdfBbox } from "../../types/bbox";

export interface DifferenceMetrics {
  changedRatio: number;
  severeRatio: number;
}

export function createRedactionMask(
  width: number,
  height: number,
  pageSize: { width: number; height: number },
  bboxes: readonly PdfBbox[]
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (width <= 0 || height <= 0 || pageSize.width <= 0 || pageSize.height <= 0) {
    return mask;
  }

  const widthScale = width / pageSize.width;
  const heightScale = height / pageSize.height;

  for (const bbox of bboxes) {
    const x0 = Math.max(0, Math.floor((bbox.x - EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * widthScale));
    const y0 = Math.max(0, Math.floor((bbox.y - EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * heightScale));
    const x1 = Math.min(
      width,
      Math.ceil((bbox.x + bbox.width + EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * widthScale)
    );
    const y1 = Math.min(
      height,
      Math.ceil((bbox.y + bbox.height + EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * heightScale)
    );

    for (let y = y0; y < y1; y += 1) {
      const rowOffset = y * width;
      for (let x = x0; x < x1; x += 1) {
        mask[rowOffset + x] = 1;
      }
    }
  }

  return mask;
}

function toLuminance(red: number, green: number, blue: number): number {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function evaluateDifference(
  sourceImage: ImageDataLike,
  redactedImage: ImageDataLike,
  redactionMask: Uint8Array
): DifferenceMetrics {
  const { width, height } = sourceImage;
  const sourceData = sourceImage.data;
  const redactedData = redactedImage.data;
  const sampleStride = 2;
  let comparedPixels = 0;
  let changedPixels = 0;
  let severePixels = 0;

  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const pixelOffset = y * width + x;
      if (redactionMask[pixelOffset] === 1) {
        continue;
      }

      const dataOffset = pixelOffset * 4;
      const sourceLuminance = toLuminance(
        sourceData[dataOffset],
        sourceData[dataOffset + 1],
        sourceData[dataOffset + 2]
      );
      const redactedLuminance = toLuminance(
        redactedData[dataOffset],
        redactedData[dataOffset + 1],
        redactedData[dataOffset + 2]
      );
      const delta = Math.abs(sourceLuminance - redactedLuminance);

      comparedPixels += 1;
      if (delta >= EXPORT_INTEGRITY_PIXEL_DIFF_THRESHOLD) {
        changedPixels += 1;
      }
      if (delta >= EXPORT_INTEGRITY_SEVERE_PIXEL_DIFF_THRESHOLD) {
        severePixels += 1;
      }
    }
  }

  if (comparedPixels === 0) {
    return {
      changedRatio: 0,
      severeRatio: 0
    };
  }

  return {
    changedRatio: changedPixels / comparedPixels,
    severeRatio: severePixels / comparedPixels
  };
}

export function isPageVisuallyUnsafe(metrics: DifferenceMetrics): boolean {
  return (
    metrics.changedRatio > EXPORT_INTEGRITY_DIFF_RATIO_THRESHOLD ||
    metrics.severeRatio > EXPORT_INTEGRITY_SEVERE_DIFF_RATIO_THRESHOLD
  );
}
