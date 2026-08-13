import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlossaryHoverCard } from "../../src/renderer/GlossaryHoverCard";
import type { GlossaryHoverCardContent } from "../../src/renderer/glossaryHoverCardContent";

describe("GlossaryHoverCard", () => {
  it("renders unique match details", () => {
    const content: GlossaryHoverCardContent = {
      matchedSurface: "アル",
      isAmbiguous: false,
      candidates: [
        {
          entryId: "entry-albert",
          formId: "form-alias",
          canonicalSurface: "アルベルト",
          matchedSurface: "アル",
          relation: "alias",
          warningPolicy: "default",
          kind: "person",
          descriptionPreview: "辺境領の若き領主。",
          isMissingEntry: false
        }
      ]
    };
    const markup = renderToStaticMarkup(
      React.createElement(GlossaryHoverCard, { content })
    );

    expect(markup).toContain("アルベルト");
    expect(markup).toContain("アル");
    expect(markup).toContain("alias");
    expect(markup).toContain("default");
    expect(markup).toContain("person");
    expect(markup).toContain("辺境領の若き領主。");
  });

  it("renders ambiguous candidates", () => {
    const content: GlossaryHoverCardContent = {
      matchedSurface: "重複",
      isAmbiguous: true,
      candidates: [
        {
          entryId: "entry-canonical",
          formId: "form-canonical",
          canonicalSurface: "重複",
          matchedSurface: "重複",
          relation: "canonical",
          warningPolicy: null,
          kind: "term",
          descriptionPreview: "canonical description",
          isMissingEntry: false
        },
        {
          entryId: "entry-alias",
          formId: "form-alias",
          canonicalSurface: "別名の本体",
          matchedSurface: "重複",
          relation: "alias",
          warningPolicy: "warn",
          kind: "place",
          descriptionPreview: "alias description",
          isMissingEntry: false
        }
      ]
    };
    const markup = renderToStaticMarkup(
      React.createElement(GlossaryHoverCard, { content })
    );

    expect(markup).toContain("2 candidates");
    expect(markup).toContain("重複");
    expect(markup).toContain("別名の本体");
    expect(markup).toContain("canonical");
    expect(markup).toContain("alias");
    expect(markup).toContain("term");
    expect(markup).toContain("place");
    expect(markup).toContain("canonical description");
    expect(markup).toContain("alias description");
  });
});
