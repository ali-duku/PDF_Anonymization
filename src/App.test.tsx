import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { JsonService, StorageService } from "./types/services";

vi.mock("./viewer/components/PdfViewerTab", () => ({
  PdfViewerTab: () => <div>Viewer Placeholder</div>
}));

describe("App tab behavior", () => {
  it("switches tabs and preserves setup state", async () => {
    const user = userEvent.setup();

    const mockStorage: StorageService = {
      loadPdfRecord: vi.fn().mockResolvedValue(null),
      savePdfRecord: vi.fn().mockResolvedValue(undefined),
      replacePdf: vi.fn(),
      loadViewerState: vi.fn().mockResolvedValue(null),
      saveViewerState: vi.fn().mockResolvedValue(undefined),
      clearPdfRecord: vi.fn().mockResolvedValue(undefined)
    };

    const mockJson: JsonService = {
      generate: vi.fn((raw) => ({ success: true, formattedJson: raw })),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    render(
      <App
        services={{
          storageService: mockStorage,
          jsonService: mockJson
        }}
      />
    );

    expect(screen.getByText("Viewer Placeholder")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Setup" }));
    const input = screen.getByLabelText("Input JSON");
    fireEvent.change(input, { target: { value: '{"persist":true}' } });

    await user.click(screen.getByRole("button", { name: "Viewer" }));
    await user.click(screen.getByRole("button", { name: "Setup" }));

    expect(screen.getByLabelText("Input JSON")).toHaveValue('{"persist":true}');
  });
});
