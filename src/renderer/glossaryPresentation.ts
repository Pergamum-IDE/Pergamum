import type { GlossaryEntry } from "../shared/glossary";

export function canonicalGlossarySurface(entry: GlossaryEntry): string {
  const canonicalForm = entry.forms.find(
    (form) => form.isCanonical === true
  );

  return canonicalForm?.surface ?? entry.id;
}
