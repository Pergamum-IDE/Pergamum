import { describe, expect, it } from "vitest";
import {
  GlossaryValidationError,
  validateCreateGlossaryEntryInput,
  validateGlossaryEntry,
  validateGlossaryEntryId,
  validateGlossaryEntryKind,
  validateGlossaryForm,
  validateGlossarySurfaceLookupInput,
  validateUpdateGlossaryEntryInput
} from "../../src/shared/glossary";

const entryId = "018f4b8c-7a2b-7c3d-8e4f-123456789abc";
const canonicalFormId = "018f4b8c-7a2b-7c3d-8e4f-123456789abd";
const aliasFormId = "018f4b8c-7a2b-7c3d-8e4f-123456789abe";

describe("glossary validation", () => {
  it("accepts a valid glossary entry with canonical and non-canonical forms", () => {
    expect(
      validateGlossaryEntry({
        id: entryId,
        kind: "place",
        description: "王国の首都",
        forms: [
          {
            id: canonicalFormId,
            entryId,
            surface: "王都アルセリア",
            relation: null,
            warningPolicy: null,
            isCanonical: true,
            createdAt: "2026-08-11T12:00:00.000Z",
            updatedAt: "2026-08-11T12:00:00.000Z"
          },
          {
            id: aliasFormId,
            entryId,
            surface: "アルセリア",
            relation: "alias",
            warningPolicy: "warn",
            isCanonical: false,
            createdAt: "2026-08-11T12:00:00.000Z",
            updatedAt: "2026-08-11T12:00:00.000Z"
          }
        ],
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toMatchObject({
      id: entryId,
      kind: "place",
      description: "王国の首都"
    });
  });

  it("accepts create, update, and exact surface lookup input", () => {
    expect(
      validateCreateGlossaryEntryInput({
        kind: "item",
        canonicalSurface: "魔導炉",
        description: ""
      })
    ).toEqual({
      kind: "item",
      canonicalSurface: "魔導炉",
      description: ""
    });

    expect(
      validateUpdateGlossaryEntryInput({
        id: entryId,
        kind: "concept",
        description: "魔力を生成する技術"
      })
    ).toEqual({
      id: entryId,
      kind: "concept",
      description: "魔力を生成する技術"
    });

    expect(
      validateGlossarySurfaceLookupInput({
        surface: "魔導炉"
      })
    ).toEqual({
      surface: "魔導炉"
    });
  });

  it("rejects non-v7 and non-lowercase IDs", () => {
    expect(() => validateGlossaryEntryId(1)).toThrow(GlossaryValidationError);
    expect(() =>
      validateGlossaryEntryId("018f4b8c-7a2b-4c3d-8e4f-123456789abc")
    ).toThrow(GlossaryValidationError);
    expect(() =>
      validateGlossaryEntryId("018F4B8C-7A2B-7C3D-8E4F-123456789ABC")
    ).toThrow(GlossaryValidationError);
  });

  it("rejects invalid entry kinds and required textual fields", () => {
    expect(() => validateGlossaryEntryKind("chapter")).toThrow(
      GlossaryValidationError
    );

    expect(() =>
      validateCreateGlossaryEntryInput({
        kind: "term",
        canonicalSurface: " ",
        description: "空白のみの canonical surface"
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects invalid canonical form relation and warning policy", () => {
    expect(() =>
      validateGlossaryForm({
        id: canonicalFormId,
        entryId,
        surface: "王都アルセリア",
        relation: "alias",
        warningPolicy: null,
        isCanonical: true,
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);

    expect(() =>
      validateGlossaryForm({
        id: canonicalFormId,
        entryId,
        surface: "王都アルセリア",
        relation: null,
        warningPolicy: "default",
        isCanonical: true,
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects invalid non-canonical form relation and warning policy", () => {
    expect(() =>
      validateGlossaryForm({
        id: aliasFormId,
        entryId,
        surface: "アルセリア",
        relation: null,
        warningPolicy: "default",
        isCanonical: false,
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);

    expect(() =>
      validateGlossaryForm({
        id: aliasFormId,
        entryId,
        surface: "アルセリア",
        relation: "alias",
        warningPolicy: null,
        isCanonical: false,
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects entries without exactly one canonical form", () => {
    const form = {
      id: canonicalFormId,
      entryId,
      surface: "王都アルセリア",
      relation: null,
      warningPolicy: null,
      isCanonical: true,
      createdAt: "2026-08-11T12:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z"
    };

    expect(() =>
      validateGlossaryEntry({
        id: entryId,
        kind: "place",
        description: "王国の首都",
        forms: [],
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);

    expect(() =>
      validateGlossaryEntry({
        id: entryId,
        kind: "place",
        description: "王国の首都",
        forms: [form, { ...form, id: aliasFormId }],
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);
  });
});
