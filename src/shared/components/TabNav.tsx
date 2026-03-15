export type AppTab = "viewer" | "setup";

interface TabNavProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav" aria-label="Main Tabs">
      <button
        type="button"
        className={`tab-trigger ${activeTab === "viewer" ? "active" : ""}`}
        onClick={() => onChange("viewer")}
        aria-selected={activeTab === "viewer"}
      >
        Viewer
      </button>
      <button
        type="button"
        className={`tab-trigger ${activeTab === "setup" ? "active" : ""}`}
        onClick={() => onChange("setup")}
        aria-selected={activeTab === "setup"}
      >
        Setup
      </button>
    </nav>
  );
}
