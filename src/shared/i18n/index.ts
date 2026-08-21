import { enTranslations } from "./en";
import { jaTranslations, type TranslationKey } from "./ja";

export type { TranslationKey };

export type TranslationValues = Record<string, string | number>;
export type Translate = (
  key: TranslationKey,
  values?: TranslationValues
) => string;

/**
 * The single source of truth for selectable UI languages (#186).
 * Keep this to language identity and translation dictionaries only;
 * text direction and other language metadata belong to future issues.
 */
export const languageDefinitions = {
  ja: {
    nativeName: "日本語",
    translations: jaTranslations
  },
  en: {
    nativeName: "English",
    translations: enTranslations
  }
} as const;

export type Language = keyof typeof languageDefinitions;

export const defaultLanguage: Language = "ja";

// Object.keys cannot express non-empty objects, but languageDefinitions is the
// closed set above and must stay non-empty for the UI language setting enum.
export const supportedLanguages = Object.keys(
  languageDefinitions
) as unknown as readonly [Language, ...Language[]];

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(languageDefinitions, value)
  );
}

export function t(
  language: Language,
  key: TranslationKey,
  values: TranslationValues = {}
): string {
  const template = languageDefinitions[language].translations[key];

  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, name) => {
    const value = values[name];

    return value === undefined ? placeholder : String(value);
  });
}
