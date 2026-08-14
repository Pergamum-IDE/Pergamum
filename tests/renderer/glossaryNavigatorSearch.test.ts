import { describe, expect, it } from "vitest";
import type {
  GlossaryEntry,
  GlossaryEntryKind,
  GlossaryForm,
  GlossaryFormMatchBoundary,
  GlossaryFormRelation,
  GlossaryWarningPolicy
} from "../../src/shared/glossary";
import {
  filterGlossaryEntriesForNavigator,
  matchesGlossaryNavigatorSearch
} from "../../src/renderer/glossaryNavigatorSearch";

const timestamp = "2026-08-14T00:00:00.000Z";

function canonicalForm(
  entryId: string,
  id: string,
  surface: string,
  matchBoundaryStart: GlossaryFormMatchBoundary = "auto",
  matchBoundaryEnd: GlossaryFormMatchBoundary = "auto"
): GlossaryForm {
  return {
    id,
    entryId,
    surface,
    relation: null,
    warningPolicy: null,
    isCanonical: true,
    matchBoundaryStart,
    matchBoundaryEnd,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function nonCanonicalForm(
  entryId: string,
  id: string,
  surface: string,
  relation: GlossaryFormRelation,
  warningPolicy: GlossaryWarningPolicy,
  matchBoundaryStart: GlossaryFormMatchBoundary = "auto",
  matchBoundaryEnd: GlossaryFormMatchBoundary = "auto"
): GlossaryForm {
  return {
    id,
    entryId,
    surface,
    relation,
    warningPolicy,
    isCanonical: false,
    matchBoundaryStart,
    matchBoundaryEnd,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function glossaryEntry(
  id: string,
  kind: GlossaryEntryKind,
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

function entryIds(entries: readonly GlossaryEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

const albertEntry = glossaryEntry("entry-albert", "person", "辺境領主", [
  canonicalForm("entry-albert", "form-albert-canonical", "アルベルト"),
  nonCanonicalForm(
    "entry-albert",
    "form-albert-alias",
    "アル",
    "alias",
    "default"
  ),
  nonCanonicalForm(
    "entry-albert",
    "form-albert-variant",
    "Albert",
    "variant",
    "ignore"
  )
]);

const maidEntry = glossaryEntry("entry-maid", "term", "王城に仕える人", [
  canonicalForm("entry-maid", "form-maid-canonical", "メイド"),
  nonCanonicalForm(
    "entry-maid",
    "form-maid-alias",
    "侍女",
    "alias",
    "default"
  ),
  nonCanonicalForm(
    "entry-maid",
    "form-maid-variant",
    "Maid",
    "variant",
    "warn"
  )
]);

const glossaryEntries = [maidEntry, albertEntry];

describe("Glossary Navigator search filter", () => {
  it("returns all entries for an empty or trim-empty query", () => {
    expect(filterGlossaryEntriesForNavigator(glossaryEntries, "")).toBe(
      glossaryEntries
    );
    expect(filterGlossaryEntriesForNavigator(glossaryEntries, "   ")).toBe(
      glossaryEntries
    );
  });

  it("trims query whitespace before matching", () => {
    expect(
      entryIds(filterGlossaryEntriesForNavigator(glossaryEntries, "  イド  "))
    ).toEqual(["entry-maid"]);
  });

  it("matches canonical, alias, and variant surfaces by substring", () => {
    expect(
      entryIds(filterGlossaryEntriesForNavigator(glossaryEntries, "ベルト"))
    ).toEqual(["entry-albert"]);
    expect(
      entryIds(filterGlossaryEntriesForNavigator(glossaryEntries, "侍"))
    ).toEqual(["entry-maid"]);
    expect(
      entryIds(filterGlossaryEntriesForNavigator(glossaryEntries, "bert"))
    ).toEqual(["entry-albert"]);
  });

  it("does not search description or kind", () => {
    expect(
      entryIds(filterGlossaryEntriesForNavigator(glossaryEntries, "王城"))
    ).toEqual([]);
    expect(
      entryIds(filterGlossaryEntriesForNavigator(glossaryEntries, "person"))
    ).toEqual([]);
  });

  it("matches ASCII alphabet case-insensitively within the ASCII range only", () => {
    const entry = glossaryEntry("entry-ascii", "term", "", [
      canonicalForm("entry-ascii", "form-ascii-canonical", "HandMAIDen")
    ]);

    expect(matchesGlossaryNavigatorSearch(entry, "maid")).toBe(true);
    expect(matchesGlossaryNavigatorSearch(entry, "MAID")).toBe(true);
    expect(matchesGlossaryNavigatorSearch(entry, "mAiDeN")).toBe(true);
  });

  it("does not case-fold, normalize, or absorb non-ASCII notation variants", () => {
    const entries = [
      glossaryEntry("entry-dotted-i", "place", "", [
        canonicalForm("entry-dotted-i", "form-dotted-i", "İstanbul")
      ]),
      glossaryEntry("entry-sharp-s", "term", "", [
        canonicalForm("entry-sharp-s", "form-sharp-s", "Straße")
      ]),
      glossaryEntry("entry-fullwidth", "term", "", [
        canonicalForm("entry-fullwidth", "form-fullwidth", "ＭＡＩＤ")
      ]),
      glossaryEntry("entry-accent", "term", "", [
        canonicalForm("entry-accent", "form-accent", "Cafe\u0301")
      ]),
      glossaryEntry("entry-middle-dot", "person", "", [
        canonicalForm(
          "entry-middle-dot",
          "form-middle-dot",
          "ジャンヌ・ダルク"
        )
      ]),
      glossaryEntry("entry-kana", "term", "", [
        canonicalForm("entry-kana", "form-kana", "メイド")
      ])
    ];

    expect(entryIds(filterGlossaryEntriesForNavigator(entries, "istanbul"))).toEqual([]);
    expect(entryIds(filterGlossaryEntriesForNavigator(entries, "strasse"))).toEqual([]);
    expect(entryIds(filterGlossaryEntriesForNavigator(entries, "maid"))).toEqual([]);
    expect(entryIds(filterGlossaryEntriesForNavigator(entries, "Café"))).toEqual([]);
    expect(
      entryIds(filterGlossaryEntriesForNavigator(entries, "ジャンヌダルク"))
    ).toEqual([]);
    expect(entryIds(filterGlossaryEntriesForNavigator(entries, "めいど"))).toEqual([]);
  });

  it("does not apply boundary policy to Navigator search", () => {
    const entry = glossaryEntry("entry-boundary", "term", "", [
      canonicalForm(
        "entry-boundary",
        "form-boundary-canonical",
        "オーダーメイド",
        "strict",
        "strict"
      ),
      nonCanonicalForm(
        "entry-boundary",
        "form-boundary-alias",
        "AlphaMaidBeta",
        "alias",
        "default",
        "strict",
        "strict"
      )
    ]);

    expect(matchesGlossaryNavigatorSearch(entry, "メイド")).toBe(true);
    expect(matchesGlossaryNavigatorSearch(entry, "maid")).toBe(true);
  });

  it("preserves the existing entry order without relevance ranking", () => {
    const entries = [
      glossaryEntry("entry-gamma", "term", "", [
        canonicalForm("entry-gamma", "form-gamma", "Gamma Maid")
      ]),
      glossaryEntry("entry-alpha", "term", "", [
        canonicalForm("entry-alpha", "form-alpha", "Alpha Maid")
      ])
    ];

    expect(entryIds(filterGlossaryEntriesForNavigator(entries, "maid"))).toEqual([
      "entry-gamma",
      "entry-alpha"
    ]);
  });

  it("re-evaluates refreshed entry lists with the same query", () => {
    const createdEntry = glossaryEntry("entry-created", "term", "", [
      canonicalForm("entry-created", "form-created", "メイド長")
    ]);
    const updatedAwayEntry = glossaryEntry("entry-maid", "term", "", [
      canonicalForm("entry-maid", "form-maid-updated", "王都")
    ]);

    expect(
      entryIds(filterGlossaryEntriesForNavigator([maidEntry, createdEntry], "メイド"))
    ).toEqual(["entry-maid", "entry-created"]);
    expect(
      entryIds(filterGlossaryEntriesForNavigator([updatedAwayEntry], "メイド"))
    ).toEqual([]);
    expect(entryIds(filterGlossaryEntriesForNavigator([], "メイド"))).toEqual([]);
  });
});
