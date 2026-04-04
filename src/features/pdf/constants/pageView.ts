export const PAGE_VIEW_ROTATION_STEPS = 4;
export const PAGE_VIEW_ROTATION_STEP = 1;
export const PAGE_VIEW_ROTATION_DEGREES = 90;
export const DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS = 0 as const;

export const PAGE_VIEW_ROTATION_SEQUENCE = [0, 1, 2, 3] as const;

export type PageViewRotationQuarterTurns = (typeof PAGE_VIEW_ROTATION_SEQUENCE)[number];
