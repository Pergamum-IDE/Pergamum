import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocumentTabBar } from "../../src/renderer/DocumentTabBar";
import type { DocumentTab } from "../../src/renderer/openDocuments";
import { t, type Translate } from "../../src/shared/i18n";
import {
  createEditorIdForPath,
  createGlossaryEntryEditorId,
  createProjectDocumentEditorId,
  type ActiveProjectContext,
  type EditorId
} from "../../src/shared/editorId";

const realTranslateEn: Translate = (key, values) => t("en", key, values);
const realTranslateJa: Translate = (key, values) => t("ja", key, values);
const noop = () => undefined;

const projectContext: ActiveProjectContext = { rootPath: "C:\\Novel" };
const projectDocumentId: EditorId = createProjectDocumentEditorId(
  "chapter-01.md",
  projectContext
);
const externalFileId: EditorId = createEditorIdForPath(
  "C:\\Outside\\notes.md",
  null
);
const glossaryEntryId: EditorId = createGlossaryEntryEditorId(
  "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
  projectContext
);

function renderTabBar(tabs: DocumentTab[], translate: Translate = realTranslateEn): string {
  return renderToStaticMarkup(
    React.createElement(DocumentTabBar, {
      tabs,
      activeDocumentId: tabs[0]?.id ?? projectDocumentId,
      translate,
      onSelectDocument: noop,
      isUtilityWindowOpen: false,
      onToggleUtilityWindow: noop
    })
  );
}

describe("DocumentTabBar", () => {
  it("renders the alert-triangle warning icon before the file name for an external Markdown tab", () => {
    const markup = renderTabBar([
      {
        id: externalFileId,
        title: "notes.md",
        isDirty: false,
        isExternalMarkdownFile: true
      }
    ]);

    const iconIndex = markup.indexOf("documentTabExternalIcon");
    const titleIndex = markup.indexOf("documentTabTitle");

    expect(iconIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(iconIndex);
    // The actual alert-triangle.svg content (feather icon class name) is
    // what gets injected, not a placeholder/different icon.
    expect(markup).toContain("feather-alert-triangle");
  });

  it("does not render the warning icon for a project document tab", () => {
    const markup = renderTabBar([
      {
        id: projectDocumentId,
        title: "chapter-01.md",
        isDirty: false,
        isExternalMarkdownFile: false
      }
    ]);

    expect(markup).not.toContain("documentTabExternalIcon");
    expect(markup).not.toContain("feather-alert-triangle");
  });

  it("does not render the warning icon for a glossary editor tab", () => {
    const markup = renderTabBar([
      {
        id: glossaryEntryId,
        title: "王都",
        isDirty: false,
        isExternalMarkdownFile: false
      }
    ]);

    expect(markup).not.toContain("documentTabExternalIcon");
  });

  it("gives the icon an accessible label and tooltip with the exact English warning text", () => {
    const markup = renderTabBar([
      {
        id: externalFileId,
        title: "notes.md",
        isDirty: false,
        isExternalMarkdownFile: true
      }
    ]);

    expect(markup).toContain('aria-label="This file is outside the project"');
    expect(markup).toContain('title="This file is outside the project"');
  });

  it("gives the icon the exact Japanese warning text when translated", () => {
    const markup = renderTabBar(
      [
        {
          id: externalFileId,
          title: "notes.md",
          isDirty: false,
          isExternalMarkdownFile: true
        }
      ],
      realTranslateJa
    );

    expect(markup).toContain(
      'aria-label="\u6CE8\u610F\uFF1A\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u5916\u306E\u30D5\u30A1\u30A4\u30EB\u3067\u3059"'
    );
  });

  it("does not replace the tab title — the file name text is still present alongside the icon", () => {
    const markup = renderTabBar([
      {
        id: externalFileId,
        title: "notes.md",
        isDirty: false,
        isExternalMarkdownFile: true
      }
    ]);

    expect(markup).toContain(">notes.md<");
  });

  it("gives the icon role=img for clearer accessible semantics", () => {
    const markup = renderTabBar([
      {
        id: externalFileId,
        title: "notes.md",
        isDirty: false,
        isExternalMarkdownFile: true
      }
    ]);

    const iconIndex = markup.indexOf("documentTabExternalIcon");
    const iconTagEnd = markup.indexOf(">", iconIndex);
    const iconOpenTag = markup.slice(iconIndex, iconTagEnd);

    expect(iconOpenTag).toContain('role="img"');
  });

  it("exposes the external-file warning on the tab button's own title attribute, combined with the file name, since nested-element tooltips are inconsistent across browsers", () => {
    const markup = renderTabBar([
      {
        id: externalFileId,
        title: "notes.md",
        isDirty: false,
        isExternalMarkdownFile: true
      }
    ]);

    expect(markup).toContain(
      'title="notes.md — This file is outside the project"'
    );
  });

  it("keeps a project document tab's own title attribute as the plain file name — no warning suffix appended", () => {
    const markup = renderTabBar([
      {
        id: projectDocumentId,
        title: "chapter-01.md",
        isDirty: false,
        isExternalMarkdownFile: false
      }
    ]);

    const tabButtonStart = markup.indexOf("<button");
    const tabButtonTagEnd = markup.indexOf(">", tabButtonStart);
    const tabButtonOpenTag = markup.slice(tabButtonStart, tabButtonTagEnd);

    expect(tabButtonOpenTag).toContain('title="chapter-01.md"');
    expect(tabButtonOpenTag).not.toContain("outside the project");
  });

  it("still shows the dirty indicator alongside the warning icon when both apply", () => {
    const markup = renderTabBar([
      {
        id: externalFileId,
        title: "notes.md",
        isDirty: true,
        isExternalMarkdownFile: true
      }
    ]);

    expect(markup).toContain("documentTabExternalIcon");
    expect(markup).toContain("documentTabDirtyIndicator");
  });
});
