import { describe, expect, it } from "vitest";
import {
  GlossaryValidationError,
  validateCreateGlossaryEntryInput,
  validateGlossaryEntry,
  validateGlossaryEntryId,
  validateUpdateGlossaryEntryInput
} from "../../src/shared/glossary";

describe("glossary validation", () => {
  it("accepts a valid glossary entry", () => {
    expect(
      validateGlossaryEntry({
        id: 1,
        term: "王都アルセリア",
        description: "王国の首都",
        createdAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toEqual({
      id: 1,
      term: "王都アルセリア",
      description: "王国の首都",
      createdAt: "2026-08-11T12:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z"
    });
  });

  it("accepts create and update input", () => {
    expect(
      validateCreateGlossaryEntryInput({
        term: "魔導炉",
        description: ""
      })
    ).toEqual({
      term: "魔導炉",
      description: ""
    });

    expect(
      validateUpdateGlossaryEntryInput({
        id: 1,
        term: "大型魔導炉",
        description: "魔力を生成する設備"
      })
    ).toEqual({
      id: 1,
      term: "大型魔導炉",
      description: "魔力を生成する設備"
    });
  });

  it("rejects invalid IDs and terms", () => {
    expect(() => validateGlossaryEntryId(0)).toThrow(GlossaryValidationError);
    expect(() => validateGlossaryEntryId("1")).toThrow(GlossaryValidationError);

    expect(() =>
      validateCreateGlossaryEntryInput({
        term: " ",
        description: "空白のみの term"
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects invalid field types", () => {
    expect(() =>
      validateCreateGlossaryEntryInput({
        term: "帝国",
        description: 42
      })
    ).toThrow(GlossaryValidationError);

    expect(() =>
      validateGlossaryEntry({
        id: 1,
        term: "帝国",
        description: "北方の大国",
        createdAt: "not a timestamp",
        updatedAt: "2026-08-11T12:00:00.000Z"
      })
    ).toThrow(GlossaryValidationError);
  });
});
