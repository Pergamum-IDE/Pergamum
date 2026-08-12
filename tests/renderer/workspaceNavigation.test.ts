import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlossaryEntry } from "../../src/shared/glossary";
import type { PergamumProject } from "../../src/shared/api";
import {
  createProjectDocumentEditorId,
  editorIdEquals,
  type ActiveProjectContext
} from "../../src/shared/editorId";
import type { Translate } from "../../src/shared/i18n";
import { ActivityBar } from "../../src/renderer/ActivityBar";
import { createProjectDocument } from "../../src/renderer/currentDocument";
import {
  GlossarySidebar,
  GlossarySidebarView
} from "../../src/renderer/GlossarySidebar";
import {
  canonicalGlossarySurface,
  createErrorGlossarySidebarState,
  createLoadedGlossarySidebarState,
  createLoadingGlossarySidebarState,
  createNoProjectGlossarySidebarState,
  loadGlossaryEntries,
  shouldApplyGlossaryLoadResult
} from "../../src/renderer/glossarySidebarState";
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

const projectContext: ActiveProjectContext = {
  rootPath: project.rootPath
};

const timestamp = "2026-01-01T00:00:00.000Z";

function glossaryEntry(
  id: string,
  canonicalSurface: string,
  alternateSurface: string
): GlossaryEntry {
  return {
    id,
    kind: "term",
    description: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    forms: [
      {
        id: `${id}-alternate-form`,
        entryId: id,
        surface: alternateSurface,
        relation: "alias",
        warningPolicy: "default",
        isCanonical: false,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      {
        id: `${id}-canonical-form`,
        entryId: id,
        surface: canonicalSurface,
        relation: null,
        warningPolicy: null,
        isCanonical: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ]
  };
}

const glossaryEntries = [
  glossaryEntry("entry-alpha", "王都", "首都"),
  glossaryEntry("entry-beta", "魔導炉", "炉")
];

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

function stubGlossaryApi(
  entries: GlossaryEntry[] = glossaryEntries
): {
  create: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  lookupSurface: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  const glossaryApi = {
    create: vi.fn(),
    getById: vi.fn(),
    list: vi.fn().mockResolvedValue(entries),
    lookupSurface: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };

  vi.stubGlobal("window", {
    pergamum: {
      glossary: glossaryApi
    }
  });

  return glossaryApi;
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

  it("switches Sidebar content to the Glossary loading state", () => {
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
    expect(markup).toContain("glossary.loading");
    expect(markup).toContain("glossary.add");
    expect(markup).not.toContain("chapter-01.md");
  });

  it("does not call glossary APIs when no project is open", () => {
    const glossaryApi = stubGlossaryApi();

    const markup = renderToStaticMarkup(
      React.createElement(GlossarySidebar, {
        projectRootPath: null,
        translate
      })
    );

    expect(markup).toContain("glossary.noProject");
    expect(glossaryApi.list).not.toHaveBeenCalled();
  });

  it("loads glossary entries through the renderer-facing API", async () => {
    const glossaryApi = stubGlossaryApi();

    await expect(loadGlossaryEntries()).resolves.toBe(glossaryEntries);

    expect(glossaryApi.list).toHaveBeenCalledTimes(1);
    expect(glossaryApi.create).not.toHaveBeenCalled();
    expect(glossaryApi.update).not.toHaveBeenCalled();
    expect(glossaryApi.delete).not.toHaveBeenCalled();
  });

  it("identifies the canonical surface by isCanonical", () => {
    expect(canonicalGlossarySurface(glossaryEntries[0])).toBe("王都");

    const markup = renderToStaticMarkup(
      React.createElement(GlossarySidebarView, {
        state: createLoadedGlossarySidebarState(glossaryEntries, null),
        translate,
        onSelectEntry: () => undefined
      })
    );

    expect(markup).toContain("王都");
    expect(markup).not.toContain("首都");
  });

  it("renders glossary entries in API result order", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GlossarySidebarView, {
        state: createLoadedGlossarySidebarState(glossaryEntries, null),
        translate,
        onSelectEntry: () => undefined
      })
    );

    expect(markup.indexOf("王都")).toBeLessThan(markup.indexOf("魔導炉"));
  });

  it("tracks glossary selection by persistent entry ID", () => {
    const onSelectEntry = vi.fn();
    const element = GlossarySidebarView({
      state: createLoadedGlossarySidebarState(glossaryEntries, null),
      translate,
      onSelectEntry
    });
    const buttons = collectElements(
      element,
      (child) => child.type === "button"
    );
    const secondEntryButton = buttons.find(
      (button) => button.props.title === "魔導炉"
    );

    expect(secondEntryButton).toBeDefined();

    const onClick = secondEntryButton?.props.onClick;
    expect(typeof onClick).toBe("function");
    (onClick as () => void)();

    expect(onSelectEntry).toHaveBeenCalledWith("entry-beta");
  });

  it("preserves selection across reload when the entry still exists", () => {
    const state = createLoadedGlossarySidebarState(
      glossaryEntries,
      "entry-beta"
    );

    expect(state.selectedEntryId).toBe("entry-beta");
  });

  it("clears stale glossary selection when loaded entries change", () => {
    const state = createLoadedGlossarySidebarState(
      [glossaryEntries[0]],
      "entry-beta"
    );

    expect(state.selectedEntryId).toBeNull();
  });

  it("clears stale glossary selection when project identity changes", () => {
    const loadingState = createLoadingGlossarySidebarState(null);

    expect(loadingState.selectedEntryId).toBeNull();
  });

  it("does not apply stale async load results from previous requests", () => {
    expect(shouldApplyGlossaryLoadResult(2, 1)).toBe(false);
    expect(shouldApplyGlossaryLoadResult(2, 2)).toBe(true);
  });

  it("renders glossary loading, empty, and error states", () => {
    const loadingMarkup = renderToStaticMarkup(
      React.createElement(GlossarySidebarView, {
        state: createLoadingGlossarySidebarState(null),
        translate,
        onSelectEntry: () => undefined
      })
    );
    const emptyMarkup = renderToStaticMarkup(
      React.createElement(GlossarySidebarView, {
        state: createLoadedGlossarySidebarState([], null),
        translate,
        onSelectEntry: () => undefined
      })
    );
    const errorMarkup = renderToStaticMarkup(
      React.createElement(GlossarySidebarView, {
        state: createErrorGlossarySidebarState(null),
        translate,
        onSelectEntry: () => undefined
      })
    );
    const noProjectMarkup = renderToStaticMarkup(
      React.createElement(GlossarySidebarView, {
        state: createNoProjectGlossarySidebarState(),
        translate,
        onSelectEntry: () => undefined
      })
    );

    expect(loadingMarkup).toContain("glossary.loading");
    expect(emptyMarkup).toContain("glossary.empty");
    expect(errorMarkup).toContain("glossary.loadError");
    expect(noProjectMarkup).toContain("glossary.noProject");
  });

  it("keeps Sidebar mode switching independent from open document tabs", () => {
    const document = createProjectDocument(project.documents[0], "content");
    const openDocumentsState = createOpenDocumentsStateWithDocument(
      document,
      projectContext
    );
    const tabsBeforeSwitch = documentTabs(openDocumentsState);

    const searchMode = selectSidebarMode("search");
    const glossaryMode = selectSidebarMode("glossary");
    const tabsAfterSwitch = documentTabs(openDocumentsState);

    expect(searchMode).toBe("search");
    expect(glossaryMode).toBe("glossary");
    expect(tabsAfterSwitch).toEqual(tabsBeforeSwitch);
    expect(
      editorIdEquals(
        openDocumentsState.activeDocumentId,
        createProjectDocumentEditorId("chapter-01.md", projectContext)
      )
    ).toBe(true);
  });

  it("keeps glossary selection independent from open document tabs", () => {
    const document = createProjectDocument(project.documents[0], "content");
    const openDocumentsState = createOpenDocumentsStateWithDocument(
      document,
      projectContext
    );
    const tabsBeforeSelection = documentTabs(openDocumentsState);
    const onSelectEntry = vi.fn();
    const element = GlossarySidebarView({
      state: createLoadedGlossarySidebarState(glossaryEntries, null),
      translate,
      onSelectEntry
    });
    const buttons = collectElements(
      element,
      (child) => child.type === "button"
    );
    const entryButton = buttons.find(
      (button) => button.props.title === "王都"
    );

    const onClick = entryButton?.props.onClick;
    expect(typeof onClick).toBe("function");
    (onClick as () => void)();

    expect(onSelectEntry).toHaveBeenCalledWith("entry-alpha");
    expect(documentTabs(openDocumentsState)).toEqual(tabsBeforeSelection);
    expect(
      editorIdEquals(
        openDocumentsState.activeDocumentId,
        createProjectDocumentEditorId("chapter-01.md", projectContext)
      )
    ).toBe(true);
  });

  it("keeps renderer glossary code isolated from SQLite and main process persistence modules", () => {
    const rendererFiles = [
      "src/renderer/GlossarySidebar.tsx",
      "src/renderer/WorkspaceSidebar.tsx",
      "src/renderer/glossarySidebarState.ts"
    ];

    for (const filePath of rendererFiles) {
      const source = readFileSync(filePath, "utf8");

      expect(source).not.toContain("better-sqlite3");
      expect(source).not.toContain("projectDatabase");
      expect(source).not.toContain("glossaryStore");
      expect(source).not.toContain("../main/");
    }
  });
});
