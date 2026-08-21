import { describe, expect, it } from "vitest";
import {
  languageDefinitions,
  supportedLanguages,
  t
} from "../../src/shared/i18n";

const matchBoundaryKeys = [
  "glossaryEditor.advancedMatchingSettings",
  "glossaryEditor.matchBoundaryStart",
  "glossaryEditor.matchBoundaryEnd",
  "glossaryEditor.matchBoundary.auto.label",
  "glossaryEditor.matchBoundary.strict.label",
  "glossaryEditor.matchBoundary.none.label",
  "glossaryEditor.matchBoundary.auto.description",
  "glossaryEditor.matchBoundary.strict.description",
  "glossaryEditor.matchBoundary.none.description"
] as const;

const glossaryNavigatorSearchKeys = [
  "glossaryNavigator.search",
  "glossaryNavigator.searchPlaceholder",
  "glossaryNavigator.emptySearchResult"
] as const;

const disallowedBoundaryWords = [
  "左端",
  "右端",
  "left boundary",
  "right boundary"
];

describe("supported UI languages (#186)", () => {
  it("keeps selectable UI language values exactly ja and en", () => {
    expect([...supportedLanguages]).toEqual(["ja", "en"]);
  });

  it("derives supportedLanguages from the language definition map", () => {
    expect([...supportedLanguages]).toEqual(Object.keys(languageDefinitions));
  });

  it("defines stable native names for the settings language selector", () => {
    expect(
      supportedLanguages.map(
        (language) => languageDefinitions[language].nativeName
      )
    ).toEqual(["日本語", "English"]);
  });
});

describe("glossary entry deletion translations", () => {
  it("labels the delete button and its confirmation message for ja and en", () => {
    expect(t("ja", "glossaryEditor.deleteEntry")).toBe("削除");
    expect(t("en", "glossaryEditor.deleteEntry")).toBe("Delete");
    expect(t("ja", "glossaryEditor.deleteEntryConfirmMessage")).toBe(
      "この語彙を削除します。よろしいですか？"
    );
    expect(t("en", "glossaryEditor.deleteEntryConfirmMessage")).toBe(
      "Delete this glossary entry?"
    );
  });
});

describe("dirty close choice dogfood translations (#192)", () => {
  it("defines the save-and-close choice label for ja and en", () => {
    expect(t("ja", "dialog.dirtyClose.saveAndClose")).toBe("保存して閉じる");
    expect(t("en", "dialog.dirtyClose.saveAndClose")).toBe("Save and Close");
  });

  it("defines the temporary save-before-close status message", () => {
    expect(t("ja", "status.saveBeforeCloseNotImplemented")).toBe(
      "保存未実装"
    );
    expect(t("en", "status.saveBeforeCloseNotImplemented")).toBe(
      "Save before close is not implemented"
    );
  });
});

describe("glossary form match boundary translations", () => {
  it("defines every advanced matching settings key for ja and en", () => {
    for (const key of matchBoundaryKeys) {
      expect(t("ja", key).length).toBeGreaterThan(0);
      expect(t("en", key).length).toBeGreaterThan(0);
    }
  });

  it("labels the disclosure and both boundary fields without left/right vocabulary", () => {
    expect(t("ja", "glossaryEditor.advancedMatchingSettings")).toBe(
      "機械検索用詳細設定"
    );
    expect(t("en", "glossaryEditor.advancedMatchingSettings")).toBe(
      "Advanced matching settings"
    );
    expect(t("ja", "glossaryEditor.matchBoundaryStart")).toBe(
      "一致開始側の境界"
    );
    expect(t("en", "glossaryEditor.matchBoundaryStart")).toBe(
      "Match start boundary"
    );
    expect(t("ja", "glossaryEditor.matchBoundaryEnd")).toBe(
      "一致終了側の境界"
    );
    expect(t("en", "glossaryEditor.matchBoundaryEnd")).toBe(
      "Match end boundary"
    );
  });

  it("labels the auto/strict/none options using the internal values as keys, not left/right", () => {
    expect(t("ja", "glossaryEditor.matchBoundary.auto.label")).toBe("自動");
    expect(t("ja", "glossaryEditor.matchBoundary.strict.label")).toBe("厳密");
    expect(t("ja", "glossaryEditor.matchBoundary.none.label")).toBe("なし");
    expect(t("en", "glossaryEditor.matchBoundary.auto.label")).toBe("Auto");
    expect(t("en", "glossaryEditor.matchBoundary.strict.label")).toBe(
      "Strict"
    );
    expect(t("en", "glossaryEditor.matchBoundary.none.label")).toBe("None");
  });

  it("warns in the ja strict description that behavior may become stricter in the future", () => {
    expect(t("ja", "glossaryEditor.matchBoundary.strict.description")).toContain(
      "今後より厳しくなる場合があります"
    );
  });

  it("warns in the en strict description that behavior may become stricter in the future", () => {
    const description = t(
      "en",
      "glossaryEditor.matchBoundary.strict.description"
    );

    expect(description).toMatch(/future/i);
    expect(description).toMatch(/stricter/i);
  });

  it("never exposes left/right boundary vocabulary in the new translation content", () => {
    for (const key of matchBoundaryKeys) {
      for (const language of supportedLanguages) {
        const value = t(language, key);

        for (const disallowedWord of disallowedBoundaryWords) {
          expect(value).not.toContain(disallowedWord);
        }
      }
    }
  });
});

describe("glossary navigator search translations", () => {
  it("defines search input and empty search result keys for ja and en", () => {
    for (const key of glossaryNavigatorSearchKeys) {
      expect(t("ja", key).length).toBeGreaterThan(0);
      expect(t("en", key).length).toBeGreaterThan(0);
    }
  });

  it("uses the Issue 79 search labels and empty result text", () => {
    expect(t("ja", "glossaryNavigator.search")).toBe("語彙を検索");
    expect(t("ja", "glossaryNavigator.searchPlaceholder")).toBe("語彙を検索");
    expect(t("ja", "glossaryNavigator.emptySearchResult")).toBe(
      "一致する語彙がありません"
    );
    expect(t("en", "glossaryNavigator.search")).toBe("Search glossary");
    expect(t("en", "glossaryNavigator.searchPlaceholder")).toBe(
      "Search glossary"
    );
    expect(t("en", "glossaryNavigator.emptySearchResult")).toBe(
      "No glossary entries match your search."
    );
  });
});

const glossaryOccurrenceNavigationKeys = [
  "glossaryEditor.previousOccurrenceLabel",
  "glossaryEditor.nextOccurrenceLabel",
  "glossaryEditor.previousOccurrence",
  "glossaryEditor.nextOccurrence",
  "status.glossaryOccurrenceNoActiveDocument",
  "status.glossaryOccurrenceNotFound"
] as const;

describe("glossary occurrence navigation translations", () => {
  it("defines the occurrence navigation keys for ja and en", () => {
    for (const key of glossaryOccurrenceNavigationKeys) {
      expect(t("ja", key).length).toBeGreaterThan(0);
      expect(t("en", key).length).toBeGreaterThan(0);
    }
  });

  it("uses the Issue 81 display labels, aria text, and status messages", () => {
    expect(t("ja", "glossaryEditor.previousOccurrenceLabel")).toBe("◀");
    expect(t("ja", "glossaryEditor.nextOccurrenceLabel")).toBe("▶");
    expect(t("ja", "glossaryEditor.previousOccurrence")).toBe(
      "前の使用箇所"
    );
    expect(t("ja", "glossaryEditor.nextOccurrence")).toBe("次の使用箇所");
    expect(t("ja", "status.glossaryOccurrenceNoActiveDocument")).toBe(
      "移動先の文書がありません"
    );
    expect(t("ja", "status.glossaryOccurrenceNotFound")).toBe(
      "この文書内に使用箇所がありません"
    );

    expect(t("en", "glossaryEditor.previousOccurrenceLabel")).toBe("◀");
    expect(t("en", "glossaryEditor.nextOccurrenceLabel")).toBe("▶");
    expect(t("en", "glossaryEditor.previousOccurrence")).toBe(
      "Previous occurrence"
    );
    expect(t("en", "glossaryEditor.nextOccurrence")).toBe("Next occurrence");
    expect(t("en", "status.glossaryOccurrenceNoActiveDocument")).toBe(
      "No document to search."
    );
    expect(t("en", "status.glossaryOccurrenceNotFound")).toBe(
      "No occurrences in this document."
    );
  });
});
