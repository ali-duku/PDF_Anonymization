import { fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JsonService } from "../../types/services";
import { SetupTab } from "./SetupTab";

describe("SetupTab", () => {
  it("generates JSON then copies output", async () => {
    const user = userEvent.setup();
    const copyToClipboard = vi.fn().mockResolvedValue(true);

    const mockJsonService: JsonService = {
      generate: vi.fn((raw) => ({
        success: true,
        formattedJson: JSON.stringify(JSON.parse(raw), null, 2)
      })),
      copyToClipboard
    };

    const view = render(<SetupTab jsonService={mockJsonService} />);

    const input = view.getByLabelText("Input JSON");
    fireEvent.change(input, { target: { value: '{"a":1}' } });
    await user.click(view.getByRole("button", { name: "Generate JSON" }));

    const output = view.getByLabelText("Generated JSON (read-only)");
    expect(output).toHaveValue('{\n  "a": 1\n}');

    await user.click(view.getByRole("button", { name: "Copy Output" }));
    expect(copyToClipboard).toHaveBeenCalledWith('{\n  "a": 1\n}');
    expect(view.getByText("Generated JSON copied to clipboard.")).toBeInTheDocument();
  });

  it("keeps previous output when generation fails", async () => {
    const user = userEvent.setup();
    const generate = vi
      .fn()
      .mockReturnValueOnce({ success: true, formattedJson: '{\n  "ok": true\n}' })
      .mockReturnValueOnce({
        success: false,
        formattedJson: "",
        error: { message: "Bad JSON", line: 1, column: 7 }
      });

    const mockJsonService: JsonService = {
      generate,
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    const view = render(<SetupTab jsonService={mockJsonService} />);

    const input = view.getByLabelText("Input JSON");
    fireEvent.change(input, { target: { value: '{"ok":true}' } });
    await user.click(view.getByRole("button", { name: "Generate JSON" }));
    expect(view.getByLabelText("Generated JSON (read-only)")).toHaveValue('{\n  "ok": true\n}');

    fireEvent.change(input, { target: { value: '{"broken":}' } });
    await user.click(view.getByRole("button", { name: "Generate JSON" }));

    expect(view.getByLabelText("Generated JSON (read-only)")).toHaveValue('{\n  "ok": true\n}');
    expect(view.getByRole("alert")).toHaveTextContent("Line 1, column 7. Bad JSON");
  });
});
