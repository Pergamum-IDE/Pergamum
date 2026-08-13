import { describe, expect, it } from "vitest";
import type {
  GlossaryEntry,
  GlossaryForm,
  GlossaryFormRelation,
  GlossaryWarningPolicy
} from "../../src/shared/glossary";
import {
  buildGlossarySurfaceIndex,
  matchGlossarySurfacesInText,
  type GlossarySurfaceTextMatch
} from "../../src/shared/glossarySurfaceMatching";
import { buildGlossaryHoverCardContent } from "../../src/renderer/glossaryHoverCardContent";

const timestamp = "2026-08-13T00:00:00.000Z";

function canonicalForm(
  entryId: string,
  id: string,
  surface: string
): GlossaryForm {
  return {
    id,
    entryId,
    surface,
    matchBoundaryLeft: "auto",
    matchBoundaryRight: "auto",
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
    matchBoundaryLeft: "auto",
    matchBoundaryRight: "auto",
    isCanonical: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function glossaryEntry(
  id: string,
  kind: GlossaryEntry["kind"],
  description: string,
  forms: GlossaryForm[]
): GlossaryEntry {
  return {
    id,
    kind,
    description,
    forms,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

describe("buildGlossaryHoverCardContent", () => {
  it("builds unique hover card content with entry and match details", () => {
    const entryId = "018f4b8c-7a2b-7c3d-8e4f-100000000001";
    const entries = [
      glossaryEntry(
        entryId,
        "person",
        "辺境領の若き領主。\n千年領主オーダの制度を背負っている。",
        [
          canonicalForm(
            entryId,
            "018f4b8c-7a2b-7c3d-8e4f-200000000001",
            "アルベルト"
          ),
          nonCanonicalForm(
            entryId,
            "018f4b8c-7a2b-7c3d-8e4f-200000000002",
            "アル",
            "alias",
            "default"
          )
        ]
      )
    ];
    const [match] = matchGlossarySurfacesInText(
      "アルは笑った。",
      buildGlossarySurfaceIndex(entries)
    );
    const content = buildGlossaryHoverCardContent(match, entries);

    expect(content).toMatchObject({
      matchedSurface: "アル",
      isAmbiguous: false,
      candidates: [
        {
          canonicalSurface: "アルベルト",
          matchedSurface: "アル",
          relation: "alias",
          warningPolicy: "default",
          kind: "person",
          descriptionPreview:
            "辺境領の若き領主。 千年領主オーダの制度を背負っている。",
          isMissingEntry: false
        }
      ]
    });
  });

  it("builds ambiguous content in candidate order", () => {
    const canonicalEntryId =
      "018f4b8c-7a2b-7c3d-8e4f-100000000002";
    const aliasEntryId = "018f4b8c-7a2b-7c3d-8e4f-100000000003";
    const variantEntryId =
      "018f4b8c-7a2b-7c3d-8e4f-100000000004";
    const entries = [
      glossaryEntry(canonicalEntryId, "term", "canonical description", [
        canonicalForm(
          canonicalEntryId,
          "018f4b8c-7a2b-7c3d-8e4f-200000000003",
          "重複"
        )
      ]),
      glossaryEntry(aliasEntryId, "place", "alias description", [
        canonicalForm(
          aliasEntryId,
          "018f4b8c-7a2b-7c3d-8e4f-200000000004",
          "別名の本体"
        ),
        nonCanonicalForm(
          aliasEntryId,
          "018f4b8c-7a2b-7c3d-8e4f-200000000005",
          "重複",
          "alias",
          "warn"
        )
      ]),
      glossaryEntry(variantEntryId, "concept", "variant description", [
        canonicalForm(
          variantEntryId,
          "018f4b8c-7a2b-7c3d-8e4f-200000000006",
          "異体字の本体"
        ),
        nonCanonicalForm(
          variantEntryId,
          "018f4b8c-7a2b-7c3d-8e4f-200000000007",
          "重複",
          "variant",
          "ignore"
        )
      ])
    ];
    const [match] = matchGlossarySurfacesInText(
      "重複",
      buildGlossarySurfaceIndex(entries)
    );
    const content = buildGlossaryHoverCardContent(match, entries);

    expect(content.isAmbiguous).toBe(true);
    expect(
      content.candidates.map((candidate) => ({
        canonicalSurface: candidate.canonicalSurface,
        matchedSurface: candidate.matchedSurface,
        relation: candidate.relation,
        kind: candidate.kind,
        descriptionPreview: candidate.descriptionPreview
      }))
    ).toEqual([
      {
        canonicalSurface: "重複",
        matchedSurface: "重複",
        relation: "canonical",
        kind: "term",
        descriptionPreview: "canonical description"
      },
      {
        canonicalSurface: "別名の本体",
        matchedSurface: "重複",
        relation: "alias",
        kind: "place",
        descriptionPreview: "alias description"
      },
      {
        canonicalSurface: "異体字の本体",
        matchedSurface: "重複",
        relation: "variant",
        kind: "concept",
        descriptionPreview: "variant description"
      }
    ]);
  });

  it("does not throw when a candidate entry is missing", () => {
    const match: GlossarySurfaceTextMatch = {
      matchedText: "失踪",
      range: {
        start: 0,
        end: "失踪".length
      },
      candidates: [
        {
          entryId: "missing-entry",
          formId: "missing-form",
          surface: "失踪",
          relation: "alias",
          warningPolicy: "warn"
        }
      ]
    };

    expect(() => buildGlossaryHoverCardContent(match, [])).not.toThrow();
    expect(buildGlossaryHoverCardContent(match, []).candidates[0]).toMatchObject({
      canonicalSurface: "失踪",
      matchedSurface: "失踪",
      relation: "alias",
      warningPolicy: "warn",
      kind: null,
      descriptionPreview: "",
      isMissingEntry: true
    });
  });
});
