import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

export async function withExportTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutCode: PdfExportErrorCode,
  timeoutMessage: string,
  metadata?: Record<string, unknown>
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new PdfExportError(timeoutCode, timeoutMessage, {
          metadata: { ...metadata, timeoutMs }
        })
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}
