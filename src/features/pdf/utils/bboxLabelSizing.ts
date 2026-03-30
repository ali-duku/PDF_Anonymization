import {
  BBOX_LABEL_FONT_FAMILY,
  BBOX_LABEL_FONT_WEIGHT
} from "../constants/bbox";
import type { BboxDisplayRect } from "../types/bbox";
import { buildBboxLabelLayoutSpec, normalizeBboxLabelText } from "./bboxLabelLayout";

export interface AdaptiveBboxLabelSizing {
  fontSize: number;
  lineHeight: number;
}

const LABEL_MEASURE_FONT_SIZE = 100;
let labelMeasureContext: CanvasRenderingContext2D | null | undefined;

function getLabelMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (labelMeasureContext !== undefined) {
    return labelMeasureContext;
  }

  const canvas = document.createElement("canvas");
  labelMeasureContext = canvas.getContext("2d");
  return labelMeasureContext;
}

function resolveMeasuredTextWidthPerPixel(text: string): number | null {
  const context = getLabelMeasureContext();
  if (!context) {
    return null;
  }

  context.font = `${BBOX_LABEL_FONT_WEIGHT} ${LABEL_MEASURE_FONT_SIZE}px ${BBOX_LABEL_FONT_FAMILY}`;
  const width = context.measureText(text).width;
  if (width <= 0) {
    return null;
  }

  return width / LABEL_MEASURE_FONT_SIZE;
}

export function getAdaptiveBboxLabelSizing(
  labelText: string,
  displayRect: BboxDisplayRect
): AdaptiveBboxLabelSizing {
  const normalizedText = normalizeBboxLabelText(labelText);
  const measuredWidthPerPixel = normalizedText ? resolveMeasuredTextWidthPerPixel(normalizedText) : null;
  const layoutSpec = buildBboxLabelLayoutSpec({
    labelText: normalizedText,
    rect: displayRect,
    measuredWidthPerFontUnit: measuredWidthPerPixel
  });

  return {
    fontSize: layoutSpec.fontSize,
    lineHeight: layoutSpec.lineHeight
  };
}
