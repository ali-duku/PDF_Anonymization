import type { GetFileRequest, GetFileResponse } from "./pdfRetrieval";

/**
 * Backend-facing PDF retrieval contract.
 */
export interface PdfRetrievalService {
  getFile(request: GetFileRequest, options?: { signal?: AbortSignal }): Promise<GetFileResponse>;
}
