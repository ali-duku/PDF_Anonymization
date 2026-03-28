export function formatSaveTimestamp(timestamp: number | null): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}
