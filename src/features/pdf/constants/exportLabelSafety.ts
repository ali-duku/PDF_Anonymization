// Export label canvas resolution is fixed so fitting stays deterministic and independent from device DPR.
export const EXPORT_LABEL_CANVAS_SCALE = 4;

// Conservative final-fit verification configuration.
export const EXPORT_LABEL_RASTER_ALPHA_THRESHOLD = 1;
export const EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS = 0.001;
export const EXPORT_LABEL_MAX_FIT_ATTEMPTS = 48;
export const EXPORT_LABEL_FONT_SHRINK_RATIO = 0.88;
export const EXPORT_LABEL_FONT_SHRINK_MIN_STEP = 0.01;
export const EXPORT_LABEL_MIN_FONT_SIZE = 0.001;

// Keep a small extra inset from content edges to absorb anti-aliasing and renderer variance.
export const EXPORT_LABEL_VERIFICATION_INSET_RATIO = 0.015;
export const EXPORT_LABEL_VERIFICATION_INSET_MIN_UNITS = 0.05;
export const EXPORT_LABEL_VERIFICATION_INSET_MAX_UNITS = 0.6;
