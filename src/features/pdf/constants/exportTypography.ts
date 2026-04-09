import arabicLabelFontUrl from "../../../assets/fonts/NotoNaskhArabic-Bold.ttf?url";
import latinLabelFontUrl from "../../../assets/fonts/NotoSans-SemiBold.ttf?url";
import { BBOX_TEXT_COLOR } from "./bbox";

export const EXPORT_LABEL_FONT_URLS = Object.freeze({
  arabic: arabicLabelFontUrl,
  latin: latinLabelFontUrl
});

export const EXPORT_LABEL_TEXT_COLOR_HEX = BBOX_TEXT_COLOR;
export const EXPORT_LABEL_FONT_FEATURES = Object.freeze({
  calt: true,
  ccmp: true,
  kern: true,
  liga: true,
  mark: true,
  mkmk: true,
  rlig: true
});

export const EXPORT_LABEL_ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;
export const EXPORT_LABEL_ARABIC_INDIC_DIGIT_REGEX = /[\u0660-\u0669]/u;

export const EXPORT_LABEL_MIN_FONT_SIZE = 0.001;
export const EXPORT_LABEL_FIT_BINARY_SEARCH_STEPS = 20;
export const EXPORT_LABEL_FIT_SAFETY_RATIO = 0.995;
export const EXPORT_LABEL_FIT_FINAL_SHRINK_RATIO = 0.998;
