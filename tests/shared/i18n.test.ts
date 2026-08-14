import { describe, expect, it } from "vitest";
import { t } from "../../src/shared/i18n";

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

const disallowedBoundaryWords = [
  "左端",
  "右端",
  "left boundary",
  "right boundary"
];

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
      for (const language of ["ja", "en"] as const) {
        const value = t(language, key);

        for (const disallowedWord of disallowedBoundaryWords) {
          expect(value).not.toContain(disallowedWord);
        }
      }
    }
  });
});
