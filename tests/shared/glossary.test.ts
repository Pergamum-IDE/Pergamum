import { describe, expect, it } from "vitest";
import {
  GlossaryValidationError,
  validateCreateGlossaryEntryInput,
  validateGlossary,
  validateGlossaryEntry
} from "../../src/shared/glossary";

describe("glossary validation", () => {
  it("accepts a valid glossary", () => {
    expect(
      validateGlossary({
        entries: [
          {
            id: "entry-1",
            name: "王都アルセリア",
            aliases: ["王都", "アルセリア"],
            category: "Place",
            description: "王国の首都",
            notes: "第一章から登場"
          }
        ]
      })
    ).toEqual({
      entries: [
        {
          id: "entry-1",
          name: "王都アルセリア",
          aliases: ["王都", "アルセリア"],
          category: "Place",
          description: "王国の首都",
          notes: "第一章から登場"
        }
      ]
    });
  });

  it("rejects duplicate entry IDs", () => {
    expect(() =>
      validateGlossary({
        entries: [
          {
            id: "duplicate",
            name: "帝国",
            aliases: []
          },
          {
            id: "duplicate",
            name: "皇国",
            aliases: []
          }
        ]
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects empty IDs and names", () => {
    expect(() =>
      validateGlossaryEntry({
        id: "",
        name: "帝国",
        aliases: []
      })
    ).toThrow(GlossaryValidationError);

    expect(() =>
      validateGlossaryEntry({
        id: "entry-1",
        name: "   ",
        aliases: []
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects invalid known fields", () => {
    expect(() =>
      validateGlossaryEntry({
        id: "entry-1",
        name: "帝国",
        aliases: [],
        description: 42
      })
    ).toThrow(GlossaryValidationError);
  });

  it("rejects invalid aliases", () => {
    expect(() =>
      validateCreateGlossaryEntryInput({
        name: "第三皇女",
        aliases: ["皇女殿下", ""]
      })
    ).toThrow(GlossaryValidationError);

    expect(() =>
      validateCreateGlossaryEntryInput({
        name: "第三皇女",
        aliases: ["エリシア", " エリシア "]
      })
    ).toThrow(GlossaryValidationError);
  });
});
