import type { GlossaryEntry } from "../shared/glossary";

function asciiLowercaseForNavigatorSearch(value: string): string {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    result += code >= 0x41 && code <= 0x5a
      ? String.fromCharCode(code + 0x20)
      : value[index];
  }

  return result;
}

function glossaryNavigatorSearchSurfaces(
  entry: GlossaryEntry
): readonly string[] {
  return entry.forms
    .filter(
      (form) =>
        form.isCanonical === true ||
        form.relation === "alias" ||
        form.relation === "variant"
    )
    .map((form) => form.surface);
}

export function matchesGlossaryNavigatorSearch(
  entry: GlossaryEntry,
  query: string
): boolean {
  const normalizedQuery = asciiLowercaseForNavigatorSearch(query.trim());

  if (normalizedQuery.length === 0) {
    return true;
  }

  return glossaryNavigatorSearchSurfaces(entry).some((surface) =>
    asciiLowercaseForNavigatorSearch(surface).includes(normalizedQuery)
  );
}

export function filterGlossaryEntriesForNavigator(
  entries: readonly GlossaryEntry[],
  query: string
): readonly GlossaryEntry[] {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return entries;
  }

  return entries.filter((entry) =>
    matchesGlossaryNavigatorSearch(entry, trimmedQuery)
  );
}
