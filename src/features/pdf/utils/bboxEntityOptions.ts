import { normalizePotentialMojibakeText } from "./textEncoding";

interface BuildEntityComboboxOptionsArgs {
  query: string;
  options: readonly string[];
  maxOptions: number;
}

export function dedupeEntityOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const option of options) {
    const normalizedOption = normalizePotentialMojibakeText(option);
    if (seen.has(normalizedOption)) {
      continue;
    }

    seen.add(normalizedOption);
    deduped.push(normalizedOption);
  }

  return deduped;
}

export function buildEntityComboboxOptions({
  query,
  options,
  maxOptions
}: BuildEntityComboboxOptionsArgs): string[] {
  if (maxOptions <= 0) {
    return [];
  }

  const dedupedOptions = dedupeEntityOptions(options);
  const normalizedQuery = normalizePotentialMojibakeText(query);
  const hasQuery = normalizedQuery.length > 0;

  if (!hasQuery) {
    return dedupedOptions.slice(0, maxOptions);
  }

  const matchingOptions = dedupedOptions.filter((option) => option.includes(normalizedQuery));
  const hasExactMatch = matchingOptions.includes(normalizedQuery);

  // Keep the exact typed value as a first-class option unless it already exists as an exact match.
  const orderedOptions = hasExactMatch
    ? [normalizedQuery, ...matchingOptions.filter((option) => option !== normalizedQuery)]
    : [normalizedQuery, ...matchingOptions];

  return orderedOptions.slice(0, maxOptions);
}
