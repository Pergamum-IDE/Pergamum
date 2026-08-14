import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Translate } from "../../src/shared/i18n";
import { UtilityWindow } from "../../src/renderer/UtilityWindow";

const translate: Translate = (key) => key;

describe("UtilityWindow", () => {
  it("shows the Debug Log tab alongside Occurrences", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        UtilityWindow,
        {
          activeTab: "debugLog",
          height: 220,
          translate,
          onSelectTab: () => undefined,
          onClose: () => undefined
        },
        React.createElement("p", null, "debug-panel")
      )
    );

    expect(markup).toContain("utilityWindow.tabs.occurrences");
    expect(markup).toContain("utilityWindow.tabs.debugLog");
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain("debug-panel");
  });
});
