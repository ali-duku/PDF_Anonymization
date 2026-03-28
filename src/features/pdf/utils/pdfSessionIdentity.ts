import type { RetrievedPdfMeta } from "../../../types/pdfRetrieval";
import type { PdfSessionIdentity } from "../types/session";

const SESSION_KEY_PREFIX = "session";

function sanitizeSegment(value: string): string {
  return value.trim().replace(/\s+/g, "-").slice(0, 120);
}

export function buildRetrievalSessionIdentitySeed(input: {
  id: string;
  bucketKey: string;
  updatedAt: string;
  fileSize: number;
}): string {
  return [
    "retrieval",
    sanitizeSegment(input.id),
    sanitizeSegment(input.bucketKey),
    sanitizeSegment(input.updatedAt),
    String(input.fileSize)
  ].join("|");
}

export function resolvePdfSessionIdentity(documentMeta: RetrievedPdfMeta | null): PdfSessionIdentity | null {
  if (!documentMeta) {
    return null;
  }

  const stableId = documentMeta.sessionIdentitySeed;
  const sessionKey = `${SESSION_KEY_PREFIX}:${stableId}`;

  return {
    key: sessionKey,
    sourceType: documentMeta.sourceType,
    fileName: documentMeta.fileName,
    id: documentMeta.id
  };
}
