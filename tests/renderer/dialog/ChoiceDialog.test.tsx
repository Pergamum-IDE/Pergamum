import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t, type Translate } from "../../../src/shared/i18n";
import { ChoiceDialog } from "../../../src/renderer/dialog/ChoiceDialog";
import type { AppChoiceDialogOptions } from "../../../src/renderer/dialog/appDialogTypes";
import type { ClipboardAdapter } from "../../../src/renderer/dialog/clipboardAdapter";

const translateJa: Translate = (key, values) => t("ja", key, values);
const noop = () => undefined;
const noopClipboardAdapter: ClipboardAdapter = {
  writeText: () => Promise.resolve()
};

function baseOptions(
  overrides: Partial<AppChoiceDialogOptions> = {}
): AppChoiceDialogOptions {
  return {
    title: "未保存の変更",
    message: { kind: "plainText", text: "閉じ方を選択してください。" },
    icon: { kind: "warning", tooltip: "警告" },
    choices: [
      { id: "save", label: "保存", role: "primary" },
      { id: "discard", label: "保存しない", role: "destructive" },
      { id: "cancel", label: "キャンセル", role: "cancel" }
    ],
    primaryChoiceId: "save",
    cancelChoiceId: "cancel",
    clipboardText: null,
    ...overrides
  };
}

function renderDialog(
  overrides: {
    options?: AppChoiceDialogOptions;
    platform?: "windows" | "macos" | "linux" | "other";
    translate?: Translate;
    clipboardAdapter?: ClipboardAdapter;
  } = {}
): string {
  return renderToStaticMarkup(
    React.createElement(ChoiceDialog, {
      options: overrides.options ?? baseOptions(),
      platform: overrides.platform ?? "windows",
      translate: overrides.translate ?? translateJa,
      clipboardAdapter: overrides.clipboardAdapter ?? noopClipboardAdapter,
      opener: null,
      onResult: noop
    })
  );
}

function buttonTag(markup: string, choiceId: string): string {
  const button = buttonMarkup(markup, choiceId);
  const buttonEnd = button.indexOf(">");

  return button.slice(0, buttonEnd);
}

function buttonMarkup(markup: string, choiceId: string): string {
  const marker = `data-choice-id="${choiceId}"`;
  const markerIndex = markup.indexOf(marker);

  expect(markerIndex).toBeGreaterThan(-1);

  const buttonStart = markup.lastIndexOf("<button", markerIndex);
  const buttonEnd = markup.indexOf("</button>", markerIndex);

  expect(buttonStart).toBeGreaterThan(-1);
  expect(buttonEnd).toBeGreaterThan(markerIndex);

  return markup.slice(buttonStart, buttonEnd + "</button>".length);
}

function cssRuleBlock(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);

  expect(start).toBeGreaterThan(-1);

  const end = styles.indexOf("}", start);

  expect(end).toBeGreaterThan(start);

  return styles.slice(start, end + 1);
}

describe("ChoiceDialog structure (#192)", () => {
  it("renders three or more choices", () => {
    const markup = renderDialog();

    expect(markup).toContain('data-choice-id="save"');
    expect(markup).toContain('data-choice-id="discard"');
    expect(markup).toContain('data-choice-id="cancel"');
    expect(markup).toContain(">保存<");
    expect(markup).toContain(">保存しない<");
    expect(markup).toContain(">キャンセル<");
  });

  it("renders choice labels as display text while preserving stable choice ids", () => {
    const markup = renderDialog({
      options: baseOptions({
        choices: [
          { id: "stable-save-id", label: "Localized Save", role: "primary" },
          { id: "stable-cancel-id", label: "Localized Cancel", role: "cancel" }
        ],
        primaryChoiceId: "stable-save-id",
        cancelChoiceId: "stable-cancel-id"
      })
    });

    expect(markup).toContain('data-choice-id="stable-save-id"');
    expect(markup).toContain(">Localized Save<");
    expect(markup).not.toContain('data-choice-id="Localized Save"');
  });

  it("does not mark the dialog container as confirm-destructive when a destructive choice is present", () => {
    const markup = renderDialog();
    const primaryButton = buttonTag(markup, "save");

    expect(markup).toContain("appDialog-choice-hasDestructive");
    expect(markup).toContain("appDialog-warning");
    expect(markup).toContain('role="alertdialog"');
    expect(markup).not.toContain("appDialog-destructive");
    expect(primaryButton).toContain("appDialogButton-choice-primary");
    expect(primaryButton).toContain("appDialogButton-confirm");
    expect(primaryButton).not.toContain("appDialogButton-choice-destructive");
  });

  it("uses a warning-specific header tone class for warning choice dialogs", () => {
    const markup = renderDialog();
    const styles = readFileSync("src/renderer/styles.css", "utf8");
    const warningHeaderCss = cssRuleBlock(
      styles,
      ".appDialog-warning .appDialogHeader"
    );

    expect(markup).toContain("appDialog-warning");
    expect(markup).toContain("appDialogIcon-warning");
    expect(warningHeaderCss).toContain(
      "background: var(--app-dialog-warning-header-background)"
    );
    expect(warningHeaderCss).toContain(
      "color: var(--app-dialog-warning-header-foreground)"
    );
    expect(styles).toContain(
      "--app-dialog-warning-header-background: #f7e4e8;"
    );
    expect(styles).not.toContain(
      "--app-dialog-warning-header-background: #eef3f8;"
    );
    expect(styles).not.toContain(
      "--app-dialog-warning-header-foreground: #2563a8;"
    );
  });

  it("does not apply the warning tone class to non-warning choice dialogs", () => {
    const markup = renderDialog({
      options: baseOptions({ icon: { kind: "info", tooltip: "情報" } })
    });

    expect(markup).not.toContain("appDialog-warning");
    expect(markup).toContain("appDialogIcon-info");
  });

  it("applies the choice-destructive button class only to destructive choices", () => {
    const markup = renderDialog();

    expect(buttonTag(markup, "save")).not.toContain(
      "appDialogButton-choice-destructive"
    );
    expect(buttonTag(markup, "discard")).toContain(
      "appDialogButton-choice-destructive"
    );
    expect(buttonTag(markup, "cancel")).not.toContain(
      "appDialogButton-choice-destructive"
    );
  });

  it("does not automatically add icons to destructive-role choices", () => {
    const markup = renderDialog();

    expect(buttonMarkup(markup, "discard")).not.toContain(
      "appDialogButtonIcon"
    );
    expect(markup).not.toContain("feather-alert-triangle");
  });

  it("renders an explicit choice icon as a decorative leading icon", () => {
    const markup = renderDialog({
      options: baseOptions({
        choices: [
          { id: "save", label: "保存", role: "primary" },
          {
            id: "discard",
            label: "保存しない",
            role: "destructive",
            icon: { kind: "alertTriangle" }
          },
          { id: "cancel", label: "キャンセル", role: "cancel" }
        ]
      })
    });
    const saveButton = buttonMarkup(markup, "save");
    const discardButton = buttonMarkup(markup, "discard");
    const cancelButton = buttonMarkup(markup, "cancel");

    expect(discardButton).toContain(
      "appDialogButtonIcon appDialogButtonIcon-alertTriangle"
    );
    expect(discardButton).toContain('aria-hidden="true"');
    expect(discardButton).toContain("feather-alert-triangle");
    expect(discardButton).toContain(">保存しない<");
    expect(discardButton).not.toContain("aria-label");
    expect(saveButton).not.toContain("appDialogButtonIcon");
    expect(cancelButton).not.toContain("appDialogButtonIcon");
  });

  it("uses dialogIcons as the known registry for choice icon SVG rendering", () => {
    const source = readFileSync("src/renderer/dialog/ChoiceDialog.tsx", "utf8");

    expect(source).toContain("dialogChoiceIconSvgByKind[choice.icon.kind]");
    expect(source).not.toContain("alertTriangleIconRaw");
  });

  it("keeps choice destructive styling on the destructive choice button class, not the primary button", () => {
    const styles = readFileSync("src/renderer/styles.css", "utf8");

    expect(styles).toContain(".appDialogButton-choice-destructive");
    expect(styles).not.toContain(
      ".appDialog-choice-hasDestructive .appDialogButton-confirm"
    );
  });

  it("keeps app dialog button hover colors the same as each normal dialog button tone", () => {
    const styles = readFileSync("src/renderer/styles.css", "utf8");
    const neutralHoverCss = cssRuleBlock(styles, ".appDialogButton:hover");
    const primaryHoverCss = cssRuleBlock(
      styles,
      ".appDialogButton-confirm:hover"
    );
    const destructiveHoverCss = cssRuleBlock(
      styles,
      ".appDialogButton-choice-destructive:hover"
    );
    const disabledLookingTokens = /not-allowed|opacity|disabled|muted/i;

    expect(neutralHoverCss).toContain(
      "background: var(--app-dialog-button-background)"
    );
    expect(neutralHoverCss).toContain(
      "color: var(--app-dialog-button-foreground)"
    );
    expect(primaryHoverCss).toContain(
      "background: var(--app-dialog-confirm-background)"
    );
    expect(primaryHoverCss).toContain(
      "color: var(--app-dialog-confirm-foreground)"
    );
    expect(destructiveHoverCss).toContain(
      "background: var(--app-dialog-destructive-confirm-background)"
    );
    expect(destructiveHoverCss).toContain(
      "color: var(--app-dialog-destructive-confirm-foreground)"
    );

    for (const hoverCss of [
      neutralHoverCss,
      primaryHoverCss,
      destructiveHoverCss
    ]) {
      expect(hoverCss).not.toMatch(disabledLookingTokens);
    }
  });

  it("keeps explicit focus-visible styling for app dialog buttons", () => {
    const styles = readFileSync("src/renderer/styles.css", "utf8");
    const focusCss = cssRuleBlock(styles, ".appDialogButton:focus-visible");

    expect(focusCss).toContain("outline:");
    expect(focusCss).toContain("outline-offset:");
  });

  it("renders HTML-like message text as text, not markup", () => {
    const markup = renderDialog({
      options: baseOptions({
        message: {
          kind: "plainText",
          text: "before <script>alert(1)</script> after"
        }
      })
    });

    expect(markup).not.toContain("<script>alert(1)</script>");
    expect(markup).toContain("&lt;script&gt;");
  });

  it("does not use dangerouslySetInnerHTML for message rendering", () => {
    const source = readFileSync("src/renderer/dialog/ChoiceDialog.tsx", "utf8");
    const bodySection = source.slice(
      source.indexOf("appDialogBody"),
      source.indexOf("appDialogFooter")
    );

    expect(bodySection).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("ChoiceDialog action order (#192)", () => {
  it("uses platform action order by default on Windows/Linux", () => {
    const markup = renderDialog({ platform: "windows" });

    expect(markup.indexOf('data-choice-id="save"')).toBeLessThan(
      markup.indexOf('data-choice-id="discard"')
    );
    expect(markup.indexOf('data-choice-id="discard"')).toBeLessThan(
      markup.indexOf('data-choice-id="cancel"')
    );
  });

  it("uses macOS platform action order without simple reverse", () => {
    const markup = renderDialog({ platform: "macos" });

    expect(markup.indexOf('data-choice-id="discard"')).toBeLessThan(
      markup.indexOf('data-choice-id="cancel"')
    );
    expect(markup.indexOf('data-choice-id="cancel"')).toBeLessThan(
      markup.indexOf('data-choice-id="save"')
    );
  });

  it("preserves caller order when requested", () => {
    const markup = renderDialog({
      platform: "macos",
      options: baseOptions({ actionOrderPolicy: "caller" })
    });

    expect(markup.indexOf('data-choice-id="save"')).toBeLessThan(
      markup.indexOf('data-choice-id="discard"')
    );
    expect(markup.indexOf('data-choice-id="discard"')).toBeLessThan(
      markup.indexOf('data-choice-id="cancel"')
    );
  });
});

describe("ChoiceDialog initial focus (#192)", () => {
  it("focuses initialFocusChoiceId when provided", () => {
    const markup = renderDialog({
      options: baseOptions({ initialFocusChoiceId: "discard" })
    });

    expect(buttonTag(markup, "discard")).toContain("autofocus");
    expect(buttonTag(markup, "save")).not.toContain("autofocus");
  });

  it("focuses cancelChoiceId by default when initialFocusChoiceId is omitted", () => {
    const markup = renderDialog();

    expect(buttonTag(markup, "cancel")).toContain("autofocus");
    expect(buttonTag(markup, "save")).not.toContain("autofocus");
  });

  it("does not default-focus a destructive choice when a non-destructive fallback exists", () => {
    const markup = renderDialog({
      options: baseOptions({
        primaryChoiceId: undefined,
        cancelChoiceId: undefined,
        choices: [
          { id: "discard", label: "Discard", role: "destructive" },
          { id: "review", label: "Review", role: "neutral" }
        ]
      })
    });

    expect(buttonTag(markup, "review")).toContain("autofocus");
    expect(buttonTag(markup, "discard")).not.toContain("autofocus");
  });
});

describe("ChoiceDialog result and shortcut scope (#192)", () => {
  it("wires button clicks to stable choice ids, not labels", () => {
    const source = readFileSync("src/renderer/dialog/ChoiceDialog.tsx", "utf8");

    expect(source).toContain("choiceDialogChosenResult(choice.id)");
    expect(source).not.toContain("choiceDialogChosenResult(choice.label)");
  });

  it("does not add shortcut-specific Ctrl/Cmd suppression inside the choice dialog", () => {
    const source = readFileSync("src/renderer/dialog/ChoiceDialog.tsx", "utf8");
    const handlers = readFileSync(
      "src/renderer/dialog/choiceDialogHandlers.ts",
      "utf8"
    );
    const dialogSources = `${source}\n${handlers}`;

    expect(dialogSources).not.toContain("ctrlKey");
    expect(dialogSources).not.toContain("metaKey");
    expect(dialogSources).not.toContain("editor.document.save");
    expect(dialogSources).not.toContain("workbench.commandPalette.open");
  });

  it("does not wire accessKey onto choice buttons", () => {
    const source = readFileSync("src/renderer/dialog/ChoiceDialog.tsx", "utf8");

    expect(source).not.toContain("accessKey");
  });
});

describe("ChoiceDialog clipboard copy button (#192)", () => {
  it("reuses the app dialog copy control when clipboardText is present", () => {
    const markup = renderDialog({
      options: baseOptions({ clipboardText: "diagnostic" })
    });

    expect(markup).toContain("appDialogCopyButton");
    expect(markup).toContain("feather-clipboard");
  });

  it("renders no copy button when clipboardText is null", () => {
    const markup = renderDialog({
      options: baseOptions({ clipboardText: null })
    });

    expect(markup).not.toContain("appDialogCopyButton");
  });
});
