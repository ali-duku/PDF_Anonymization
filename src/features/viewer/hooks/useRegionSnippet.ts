import { useEffect, useState, type RefObject } from "react";
import type { OverlayRegion } from "../../../types/overlay";
import type { RegionEditorSnippet } from "../components/RegionEditorModal/RegionEditorModal.types";
import { normalizedBboxToCanvasCrop } from "../utils/regionSnippet";

interface UseRegionSnippetOptions {
  activeRegion: OverlayRegion | null;
  canvasRef: RefObject<HTMLCanvasElement>;
  currentPage: number;
  pageWidth: number;
  pageHeight: number;
}

export function useRegionSnippet({
  activeRegion,
  canvasRef,
  currentPage,
  pageWidth,
  pageHeight
}: UseRegionSnippetOptions): RegionEditorSnippet | null {
  const [regionSnippet, setRegionSnippet] = useState<RegionEditorSnippet | null>(null);

  useEffect(() => {
    if (!activeRegion) {
      setRegionSnippet(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
        setRegionSnippet({
          imageUrl: null,
          width: null,
          height: null
        });
        return;
      }

      const crop = normalizedBboxToCanvasCrop(
        activeRegion.bbox,
        canvas.width,
        canvas.height
      );

      if (!crop) {
        setRegionSnippet({
          imageUrl: null,
          width: null,
          height: null
        });
        return;
      }

      const snippetCanvas = document.createElement("canvas");
      snippetCanvas.width = crop.width;
      snippetCanvas.height = crop.height;
      const snippetContext = snippetCanvas.getContext("2d");
      if (!snippetContext) {
        setRegionSnippet({
          imageUrl: null,
          width: crop.width,
          height: crop.height
        });
        return;
      }

      snippetContext.drawImage(
        canvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      setRegionSnippet({
        imageUrl: snippetCanvas.toDataURL("image/png"),
        width: crop.width,
        height: crop.height
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeRegion, canvasRef, currentPage, pageHeight, pageWidth]);

  return regionSnippet;
}
