import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbStorageService } from "./indexedDbStorageService";

describe("IndexedDbStorageService", () => {
  let service: IndexedDbStorageService;

  beforeEach(() => {
    service = new IndexedDbStorageService({
      dbName: `anonymizer-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
    });
  });

  it("returns null if no PDF has been saved", async () => {
    const result = await service.loadPdfRecord();
    expect(result).toBeNull();
  });

  it("stores and restores a PDF record", async () => {
    const file = new File(["%PDF-test"], "sample.pdf", { type: "application/pdf" });
    await service.replacePdf(file, { currentPage: 1, zoom: 1 });

    const restored = await service.loadPdfRecord();
    expect(restored).not.toBeNull();
    expect(restored?.fileName).toBe("sample.pdf");
    expect(restored?.viewerState.currentPage).toBe(1);
  });

  it("updates persisted viewer state", async () => {
    const file = new File(["%PDF-test"], "state.pdf", { type: "application/pdf" });
    await service.replacePdf(file, { currentPage: 1, zoom: 1 });

    await service.saveViewerState({ currentPage: 3, zoom: 1.5 });

    const state = await service.loadViewerState();
    const record = await service.loadPdfRecord();
    expect(state).toEqual({ currentPage: 3, zoom: 1.5 });
    expect(record?.viewerState).toEqual({ currentPage: 3, zoom: 1.5 });
  });
});
