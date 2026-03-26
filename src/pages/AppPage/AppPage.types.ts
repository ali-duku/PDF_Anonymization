import type { PdfRetrievalService } from "../../types/services";

export interface AppPageProps {
  services?: {
    pdfRetrievalService?: PdfRetrievalService;
  };
}
