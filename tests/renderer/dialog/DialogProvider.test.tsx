import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t, type Translate } from "../../../src/shared/i18n";
import { DialogProvider } from "../../../src/renderer/dialog/DialogProvider";

const translate: Translate = (key, values) => t("ja", key, values);

describe("DialogProvider (#182)", () => {
  it("renders its children", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DialogProvider, {
        actionOrder: "confirmCancel",
        translate,
        children: React.createElement(
          "div",
          { className: "harnessChild" },
          "child"
        )
      })
    );

    expect(markup).toContain("harnessChild");
  });

  it("does not render a confirm dialog until confirm() is called (no pending request initially)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DialogProvider, {
        actionOrder: "confirmCancel",
        translate,
        children: React.createElement("div", null, "child")
      })
    );

    expect(markup).not.toContain("appDialogBackdrop");
    expect(markup).not.toContain('role="dialog"');
  });
});
