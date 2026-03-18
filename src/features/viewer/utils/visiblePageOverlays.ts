import type { OverlayRegion } from "../../../types/overlay";
import { CREATE_DRAFT_REGION_ID } from "../constants/viewerConstants";

interface OverlayInteractionDraft {
  regionId: string;
  pageNumber: number;
  bbox: OverlayRegion["bbox"];
}

interface CreateInteractionDraft {
  pageNumber: number;
  bbox: OverlayRegion["bbox"];
}

export function buildVisiblePageOverlays(
  currentPageOverlays: OverlayRegion[],
  currentPage: number,
  draft: OverlayInteractionDraft | null,
  createDraft: CreateInteractionDraft | null
): OverlayRegion[] {
  let overlays = currentPageOverlays;

  if (draft && draft.pageNumber === currentPage) {
    overlays = currentPageOverlays.map((region) =>
      region.id === draft.regionId
        ? {
            ...region,
            bbox: draft.bbox
          }
        : region
    );
  }

  if (createDraft && createDraft.pageNumber === currentPage) {
    const draftRegion: OverlayRegion = {
      id: CREATE_DRAFT_REGION_ID,
      pageNumber: currentPage,
      label: "Text",
      bbox: createDraft.bbox,
      matchedContent: false,
      text: "",
      entities: [],
      metadata: {
        pageNumber: Math.max(0, currentPage - 1),
        regionId: null
      },
      layoutSource: null,
      contentSource: null
    };
    overlays = [...overlays, draftRegion];
  }

  return overlays;
}
