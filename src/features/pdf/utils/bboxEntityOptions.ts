interface BuildEntityComboboxOptionsArgs {
  query: string;
  options: readonly string[];
  maxOptions: number;
}

export function dedupeEntityOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const option of options) {
    if (seen.has(option)) {
      continue;
    }

    seen.add(option);
    deduped.push(option);
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
  const hasQuery = query.length > 0;

  if (!hasQuery) {
    return dedupedOptions.slice(0, maxOptions);
  }

  const matchingOptions = dedupedOptions.filter((option) => option.includes(query));
  const hasExactMatch = matchingOptions.includes(query);

  // Keep the exact typed value as a first-class option unless it already exists as an exact match.
  const orderedOptions = hasExactMatch
    ? [query, ...matchingOptions.filter((option) => option !== query)]
    : [query, ...matchingOptions];

  return orderedOptions.slice(0, maxOptions);
}
