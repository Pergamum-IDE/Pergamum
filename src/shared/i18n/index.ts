import { enTranslations } from "./en";
import { jaTranslations, type TranslationKey } from "./ja";

export type { TranslationKey };

export type Language = "ja" | "en";
export type TranslationValues = Record<string, string | number>;
export type Translate = (
  key: TranslationKey,
  values?: TranslationValues
) => string;

export const defaultLanguage: Language = "ja";
export const supportedLanguages: readonly Language[] = ["ja", "en"];

const translations = {
  ja: jaTranslations,
  en: enTranslations
} as const;

export function isLanguage(value: unknown): value is Language {
  return value === "ja" || value === "en";
}

export function t(
  language: Language,
  key: TranslationKey,
  values: TranslationValues = {}
): string {
  const template = translations[language][key];

  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, name) => {
    const value = values[name];

    return value === undefined ? placeholder : String(value);
  });
}
