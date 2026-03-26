import { GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let isWorkerConfigured = false;

export function configurePdfJsWorker(): void {
  if (isWorkerConfigured) {
    return;
  }

  GlobalWorkerOptions.workerSrc = pdfWorker;
  isWorkerConfigured = true;
}
