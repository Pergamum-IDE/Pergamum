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
  const marker = `data-choice-id="${choiceId}"`;
  const markerIndex = markup.indexOf(marker);

  expect(markerIndex).toBeGreaterThan(-1);

  const buttonStart = markup.lastIndexOf("<button", markerIndex);
  const buttonEnd = markup.indexOf(">", markerIndex);

  return markup.slice(buttonStart, buttonEnd);
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
