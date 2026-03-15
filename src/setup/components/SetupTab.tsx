import { useMemo, useState } from "react";
import type { JsonService } from "../../types/services";

interface SetupTabProps {
  jsonService: JsonService;
}

export function SetupTab({ jsonService }: SetupTabProps) {
  const [inputJson, setInputJson] = useState("");
  const [outputJson, setOutputJson] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const outputStats = useMemo(() => {
    if (!outputJson) {
      return "No generated JSON yet.";
    }
    const lineCount = outputJson.split("\n").length;
    return `${lineCount} lines generated`;
  }, [outputJson]);

  const handleGenerate = () => {
    setFeedback(null);
    const result = jsonService.generate(inputJson);

    if (!result.success || !result.formattedJson) {
      const location = result.error?.line
        ? `Line ${result.error.line}, column ${result.error.column ?? "?"}. `
        : "";
      setErrorText(`${location}${result.error?.message ?? "Invalid JSON input."}`);
      return;
    }

    setOutputJson(result.formattedJson);
    setErrorText(null);
    setFeedback("JSON generated successfully.");
  };

  const handleCopy = async () => {
    setFeedback(null);
    setErrorText(null);
    setIsCopying(true);
    const copied = await jsonService.copyToClipboard(outputJson);
    setIsCopying(false);

    if (copied) {
      setFeedback("Generated JSON copied to clipboard.");
    } else {
      setErrorText("Copy failed. Check clipboard permissions and try again.");
    }
  };

  return (
    <section className="panel setup-panel fade-in" aria-label="Setup tab">
      <header className="panel-header">
        <h2>Setup</h2>
        <p>Paste input JSON, validate it, format it, and copy the generated output.</p>
      </header>

      <div className="json-grid">
        <div className="json-column">
          <label htmlFor="json-input">Input JSON</label>
          <textarea
            id="json-input"
            className="json-textarea"
            placeholder='Paste JSON here, for example: {"result":"..."}'
            value={inputJson}
            onChange={(event) => setInputJson(event.target.value)}
          />
        </div>

        <div className="json-column">
          <label htmlFor="json-output">Generated JSON (read-only)</label>
          <textarea id="json-output" className="json-textarea output" readOnly value={outputJson} />
        </div>
      </div>

      <div className="setup-actions">
        <button type="button" className="action-button" onClick={handleGenerate}>
          Generate JSON
        </button>
        <button
          type="button"
          className="action-button secondary"
          onClick={handleCopy}
          disabled={!outputJson || isCopying}
        >
          {isCopying ? "Copying..." : "Copy Output"}
        </button>
        <span className="setup-meta">{outputStats}</span>
      </div>

      {feedback && (
        <p className="status-line success" role="status">
          {feedback}
        </p>
      )}
      {errorText && (
        <p className="status-line error" role="alert">
          {errorText}
        </p>
      )}
    </section>
  );
}
