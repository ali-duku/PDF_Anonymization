import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredPdfRecord } from "../../types/pdf";
import type { StorageService } from "../../types/services";
import { PdfViewerTab } from "./PdfViewerTab";

const mockGetDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: (...args: unknown[]) => mockGetDocument(...args)
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "mock-worker.js"
}));

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: vi.fn(() => ({} as CanvasRenderingContext2D))
  });
});

beforeEach(() => {
  mockGetDocument.mockReset();
});

function createStorageMock(overrides?: Partial<StorageService>): StorageService {
  return {
    loadPdfRecord: vi.fn().mockResolvedValue(null),
    savePdfRecord: vi.fn().mockResolvedValue(undefined),
    replacePdf: vi.fn(),
    loadViewerState: vi.fn().mockResolvedValue(null),
    saveViewerState: vi.fn().mockResolvedValue(undefined),
    clearPdfRecord: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("PdfViewerTab", () => {
  it("shows upload empty state when no stored PDF exists", async () => {
    const storage = createStorageMock();
    render(<PdfViewerTab storageService={storage} />);

    expect(await screen.findByText("No PDF uploaded yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Upload PDF" }).length).toBeGreaterThanOrEqual(1);
  });

  it("replaces PDF when user uploads a file", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });

    const doc = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 500, height: 700 }),
        render: vi.fn().mockReturnValue({
          promise: Promise.resolve(),
          cancel: vi.fn()
        })
      }),
      destroy: vi.fn()
    };

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const storedRecord: StoredPdfRecord = {
      id: "last-uploaded-pdf",
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      updatedAt: new Date().toISOString(),
      pdfBlob: file,
      viewerState: { currentPage: 1, zoom: 1 }
    };

    const replacePdf = vi.fn().mockResolvedValue(storedRecord);
    const storage = createStorageMock({
      replacePdf
    });

    const { container } = render(<PdfViewerTab storageService={storage} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(replacePdf).toHaveBeenCalled();
      expect(screen.getByText("uploaded.pdf")).toBeInTheDocument();
    });
  });
});
