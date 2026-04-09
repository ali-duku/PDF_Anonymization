import { normalizePotentialMojibakeText } from "./textEncoding";
import type { AppLanguageMode } from "../../../types/language";
import {
  normalizeEntityLabelForSearch,
  resolveEntityLabelLanguage
} from "./entitySearchNormalization";

interface BuildEntityComboboxOptionsArgs {
  query: string;
  options: readonly string[];
  maxOptions: number;
  languageMode: AppLanguageMode;
}

interface SearchCandidate {
  option: string;
  normalized: string;
  originalIndex: number;
}

export function orderEntityOptionsByLanguagePriority(
  options: readonly string[],
  languageMode: AppLanguageMode
): string[] {
  const prioritizedLanguage = languageMode === "ar" ? "ar" : "en";
  const prioritized: string[] = [];
  const secondary: string[] = [];

  options.forEach((option) => {
    if (resolveEntityLabelLanguage(option) === prioritizedLanguage) {
      prioritized.push(option);
      return;
    }

    secondary.push(option);
  });

  return [...prioritized, ...secondary];
}

function rankSearchCandidate(candidate: SearchCandidate, normalizedQuery: string): number {
  if (candidate.normalized === normalizedQuery) {
    return 0;
  }

  if (candidate.normalized.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
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
  maxOptions,
  languageMode
}: BuildEntityComboboxOptionsArgs): string[] {
  if (maxOptions <= 0) {
    return [];
  }

  const dedupedOptions = dedupeEntityOptions(options);
  const normalizedQueryText = normalizePotentialMojibakeText(query).trim();
  const normalizedQuery = normalizeEntityLabelForSearch(normalizedQueryText);
  const hasQuery = normalizedQuery.length > 0;

  if (!hasQuery) {
    return orderEntityOptionsByLanguagePriority(dedupedOptions, languageMode).slice(0, maxOptions);
  }

  const candidates = dedupedOptions
    .map<SearchCandidate>((option, index) => ({
      option,
      normalized: normalizeEntityLabelForSearch(option),
      originalIndex: index
    }))
    .filter((candidate) => candidate.normalized.includes(normalizedQuery))
    .sort((left, right) => {
      const rankDifference = rankSearchCandidate(left, normalizedQuery) - rankSearchCandidate(right, normalizedQuery);
      if (rankDifference !== 0) {
        return rankDifference;
      }

      const leftLanguage = resolveEntityLabelLanguage(left.option);
      const rightLanguage = resolveEntityLabelLanguage(right.option);
      if (leftLanguage !== rightLanguage) {
        const prioritizedLanguage = languageMode === "ar" ? "ar" : "en";
        return leftLanguage === prioritizedLanguage ? -1 : 1;
      }

      return left.originalIndex - right.originalIndex;
    });

  const matchingOptions = candidates.map((candidate) => candidate.option);
  const hasExactInputOption = dedupedOptions.includes(normalizedQueryText);
  const orderedOptions = hasExactInputOption ? matchingOptions : [normalizedQueryText, ...matchingOptions];

  return orderedOptions.slice(0, maxOptions);
}
