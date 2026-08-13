import { describe, expect, it } from "vitest";
import type {
  GlossaryEntry,
  GlossaryForm,
  GlossaryFormRelation,
  GlossaryWarningPolicy
} from "../../src/shared/glossary";
import {
  buildGlossarySurfaceIndex,
  matchGlossarySurfacesInText
} from "../../src/shared/glossarySurfaceMatching";
import { renderGlossaryMatchesForDebug } from "../../src/shared/glossarySurfaceMatchingDebug";

const timestamp = "2026-08-13T00:00:00.000Z";
const albertEntryId = "018f4b8c-7a2b-7c3d-8e4f-300000000001";
const eclipseEntryId = "018f4b8c-7a2b-7c3d-8e4f-300000000002";
const fixtureText =
  "アルベルトはアルと呼ばれていた。蝕の夜、アルベルト卿はAlbertと署名した。";

function canonicalForm(
  entryId: string,
  id: string,
  surface: string
): GlossaryForm {
  return {
    id,
    entryId,
    surface,
    relation: null,
    warningPolicy: null,
    isCanonical: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function nonCanonicalForm(
  entryId: string,
  id: string,
  surface: string,
  relation: GlossaryFormRelation,
  warningPolicy: GlossaryWarningPolicy
): GlossaryForm {
  return {
    id,
    entryId,
    surface,
    relation,
    warningPolicy,
    isCanonical: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function glossaryEntry(
  id: string,
  forms: GlossaryForm[]
): GlossaryEntry {
  return {
    id,
    kind: "term",
    description: "",
    forms,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function fixtureEntries(): GlossaryEntry[] {
  return [
    glossaryEntry(albertEntryId, [
      canonicalForm(
        albertEntryId,
        "018f4b8c-7a2b-7c3d-8e4f-400000000001",
        "アルベルト"
      ),
      nonCanonicalForm(
        albertEntryId,
        "018f4b8c-7a2b-7c3d-8e4f-400000000002",
        "アル",
        "alias",
        "default"
      ),
      nonCanonicalForm(
        albertEntryId,
        "018f4b8c-7a2b-7c3d-8e4f-400000000003",
        "アルベルト卿",
        "alias",
        "warn"
      ),
      nonCanonicalForm(
        albertEntryId,
        "018f4b8c-7a2b-7c3d-8e4f-400000000004",
        "Albert",
        "variant",
        "ignore"
      )
    ]),
    glossaryEntry(eclipseEntryId, [
      canonicalForm(
        eclipseEntryId,
        "018f4b8c-7a2b-7c3d-8e4f-400000000005",
        "蝕"
      ),
      nonCanonicalForm(
        eclipseEntryId,
        "018f4b8c-7a2b-7c3d-8e4f-400000000006",
        "トータル・エクリプス",
        "alias",
        "default"
      )
    ])
  ];
}

describe("glossary surface matching debug helper", () => {
  it("renders default fixture matches as bracketed ranges", () => {
    const matches = matchGlossarySurfacesInText(
      fixtureText,
      buildGlossarySurfaceIndex(fixtureEntries())
    );

    expect(renderGlossaryMatchesForDebug(fixtureText, matches)).toBe(
      "[アルベルト]は[アル]と呼ばれていた。蝕の夜、[アルベルト卿]は[Albert]と署名した。"
    );
  });

  it("renders one-character fixture matches when minimumSurfaceLength is 1", () => {
    const matches = matchGlossarySurfacesInText(
      fixtureText,
      buildGlossarySurfaceIndex(fixtureEntries(), {
        minimumSurfaceLength: 1
      })
    );

    expect(renderGlossaryMatchesForDebug(fixtureText, matches)).toBe(
      "[アルベルト]は[アル]と呼ばれていた。[蝕]の夜、[アルベルト卿]は[Albert]と署名した。"
    );
  });

  it("does not depend on UI or DOM structures", () => {
    expect(renderGlossaryMatchesForDebug("一致なし", [])).toBe("一致なし");
  });
});
