import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { pergamumContextSurfaceAttribute } from "../../src/shared/editContextMenu";
import { MarkdownEditor } from "../../src/renderer/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("marks the editable host with the explicit context menu surface", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MarkdownEditor, {
        value: "body",
        onChange: () => undefined,
        contextSurface: "markdownEditor"
      })
    );

    expect(markup).toContain(
      `${pergamumContextSurfaceAttribute}="markdownEditor"`
    );
  });
});
