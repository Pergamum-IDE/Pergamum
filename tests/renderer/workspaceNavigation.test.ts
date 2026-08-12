import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PergamumProject } from "../../src/shared/api";
import type { Translate } from "../../src/shared/i18n";
import { ActivityBar } from "../../src/renderer/ActivityBar";
import { createProjectDocument } from "../../src/renderer/currentDocument";
import { GlossarySidebar } from "../../src/renderer/GlossarySidebar";
import {
  createOpenDocumentsStateWithDocument,
  documentTabs
} from "../../src/renderer/openDocuments";
import type { SidebarMode } from "../../src/renderer/sidebarMode";
import { selectSidebarMode } from "../../src/renderer/sidebarMode";
import { WorkspaceSidebar } from "../../src/renderer/WorkspaceSidebar";

const translate: Translate = (key) => key;

const project: PergamumProject = {
  rootPath: "C:\\Novel",
  name: "Novel",
  config: null,
  documents: [
    {
      relativePath: "chapter-01.md",
      name: "chapter-01.md"
    },
    {
      relativePath: "chapter-02.md",
      name: "chapter-02.md"
    }
  ]
};

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function collectElements(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<ElementProps>) => boolean
): React.ReactElement<ElementProps>[] {
  const elements: React.ReactElement<ElementProps>[] = [];

  React.Children.forEach(node, (child) => {
    if (!React.isValidElement<ElementProps>(child)) {
      return;
    }

    if (predicate(child)) {
      elements.push(child);
    }

    elements.push(...collectElements(child.props.children, predicate));
  });

  return elements;
}

function activityBarButtons(
  activeMode: SidebarMode,
  onSelectMode: (mode: SidebarMode) => void
): React.ReactElement<ElementProps>[] {
  const element = ActivityBar({
    activeMode,
    isProjectSettingsOpen: false,
    translate,
    onSelectMode,
    onToggleProjectSettings: () => undefined
  });

  return collectElements(
    element,
    (child) => child.type === "button"
  );
}

describe("workspace navigation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Activity Bar with Files, Search, and Glossary modes", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActivityBar, {
        activeMode: "files",
        isProjectSettingsOpen: false,
        translate,
        onSelectMode: () => undefined,
        onToggleProjectSettings: () => undefined
      })
    );

    expect(markup).toContain("activity.label");
    expect(markup).toContain("activity.files");
    expect(markup).toContain("activity.searchReplace");
    expect(markup).toContain("activity.glossary");
    expect(markup).toContain("activity.projectSettings");
    expect(markup).toContain("aria-pressed=\"true\"");
    expect(markup).not.toContain("disabled");
  });

  it("treats Files, Search, and Glossary as Sidebar mode selectors", () => {
    const onSelectMode = vi.fn<(mode: SidebarMode) => void>();
    const buttons = activityBarButtons("files", onSelectMode);

    const modeLabels = [
      ["activity.files", "files"],
      ["activity.searchReplace", "search"],
      ["activity.glossary", "glossary"]
    ] as const;

    for (const [label, mode] of modeLabels) {
      const button = buttons.find(
        (candidate) => candidate.props["aria-label"] === label
      );
      expect(button).toBeDefined();
      expect(button?.props.disabled).toBeUndefined();

      const onClick = button?.props.onClick;
      expect(typeof onClick).toBe("function");
      (onClick as () => void)();
      expect(onSelectMode).toHaveBeenLastCalledWith(mode);
    }
  });

  it("positions Project Settings in the secondary Activity Bar group", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActivityBar, {
        activeMode: "search",
        isProjectSettingsOpen: true,
        translate,
        onSelectMode: () => undefined,
        onToggleProjectSettings: () => undefined
      })
    );

    const secondaryGroupIndex = markup.indexOf("activityBarSecondary");
    const projectSettingsIndex = markup.indexOf("activity.projectSettings");

    expect(secondaryGroupIndex).toBeGreaterThan(-1);
    expect(projectSettingsIndex).toBeGreaterThan(secondaryGroupIndex);
  });

  it("renders the existing File Explorer in Files mode", () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceSidebar, {
        mode: "files",
        project,
        activeRelativePath: "chapter-02.md",
        translate,
        onSelectProjectDocument: () => undefined
      })
    );

    expect(markup).toContain("explorer.projectFiles");
    expect(markup).toContain("chapter-01.md");
    expect(markup).toContain("chapter-02.md");
    expect(markup).toContain("aria-current=\"page\"");
  });

  it("switches Sidebar content to the Search placeholder", () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceSidebar, {
        mode: "search",
        project,
        activeRelativePath: "chapter-02.md",
        translate,
        onSelectProjectDocument: () => undefined
      })
    );

    expect(markup).toContain("search.sidebarTitle");
    expect(markup).toContain("search.notImplemented");
    expect(markup).not.toContain("chapter-01.md");
  });

  it("switches Sidebar content to the Glossary placeholder", () => {
    const markup = renderToStaticMarkup(
      React.createElement(WorkspaceSidebar, {
        mode: "glossary",
        project,
        activeRelativePath: "chapter-02.md",
        translate,
        onSelectProjectDocument: () => undefined
      })
    );

    expect(markup).toContain("glossary.sidebarTitle");
    expect(markup).toContain("glossary.empty");
    expect(markup).toContain("glossary.add");
    expect(markup).not.toContain("chapter-01.md");
  });

  it("keeps Sidebar mode switching independent from open document tabs", () => {
    const document = createProjectDocument(project.documents[0], "content");
    const openDocumentsState = createOpenDocumentsStateWithDocument(document);
    const tabsBeforeSwitch = documentTabs(openDocumentsState);

    const searchMode = selectSidebarMode("search");
    const glossaryMode = selectSidebarMode("glossary");
    const tabsAfterSwitch = documentTabs(openDocumentsState);

    expect(searchMode).toBe("search");
    expect(glossaryMode).toBe("glossary");
    expect(tabsAfterSwitch).toEqual(tabsBeforeSwitch);
    expect(openDocumentsState.activeDocumentId).toBe("project:chapter-01.md");
  });

  it("does not call glossary APIs from the Glossary sidebar placeholder", () => {
    const glossaryApi = {
      create: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      lookupSurface: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };

    vi.stubGlobal("window", {
      pergamum: {
        glossary: glossaryApi
      }
    });

    renderToStaticMarkup(
      React.createElement(GlossarySidebar, {
        translate
      })
    );

    expect(glossaryApi.create).not.toHaveBeenCalled();
    expect(glossaryApi.getById).not.toHaveBeenCalled();
    expect(glossaryApi.list).not.toHaveBeenCalled();
    expect(glossaryApi.lookupSurface).not.toHaveBeenCalled();
    expect(glossaryApi.update).not.toHaveBeenCalled();
    expect(glossaryApi.delete).not.toHaveBeenCalled();
  });
});
