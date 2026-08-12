import { useMemo, useState } from "react";
import type {
  MarkdownFile,
  PergamumProject,
  ProjectDocument,
  SaveApplicationSettingsRequest
} from "../shared/api";
import {
  CommandRegistry,
  type CommandArgumentList,
  type CommandId
} from "../shared/commandRegistry";
import {
  createEditorIdForPath,
  createProjectDocumentEditorId,
  editorIdEquals,
  type ActiveProjectContext,
  type EditorId
} from "../shared/editorId";
import {
  t,
  type Translate,
  type TranslationKey,
  type TranslationValues
} from "../shared/i18n";
import { resolveEffectiveSettings } from "../shared/settings";
import { ActivityBar } from "./ActivityBar";
import {
  applyStandaloneSaveResult,
  createFileDocument,
  createProjectDocument,
  currentDocumentContent,
  currentDocumentTitle,
  currentProjectRelativePath,
  isCurrentDocumentDirty,
  isProjectCurrentDocument,
  markCurrentDocumentSaved,
  standaloneSavePath,
  updateCurrentDocumentContent,
  type CurrentDocument
} from "./currentDocument";
import { DocumentTabBar } from "./DocumentTabBar";
import { MarkdownEditor } from "./MarkdownEditor";
import {
  activeCurrentDocument,
  activeOpenDocument,
  activateOpenDocument,
  createInitialOpenDocumentsState,
  createOpenDocumentsStateWithDocument,
  documentTabs,
  hasDirtyOpenDocuments,
  hasOpenDocument,
  isOnlyInitialUntitledDocument,
  openOrActivateDocument,
  replaceOpenDocument,
  updateActiveOpenDocument,
  type OpenDocumentsState
} from "./openDocuments";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";
import { RecentProjectsPanel } from "./RecentProjectsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { defaultSidebarMode } from "./sidebarMode";
import { useApplicationSettings } from "./useApplicationSettings";
import { WelcomeScreen } from "./WelcomeScreen";
import {
  createWorkspaceCommandTitles,
  registerWorkspaceCommands,
  workspaceCommandIds,
  workspaceFocusCommandIdForMode
} from "./workspaceCommands";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

interface StatusMessage {
  key: TranslationKey;
  values?: TranslationValues;
}

function errorMessage(error: unknown, translate: Translate): string {
  return error instanceof Error ? error.message : translate("error.unknown");
}

function projectOpenStatus(
  openedStatus: StatusMessage,
  settingsReloadError: StatusMessage | null,
  translate: Translate
): StatusMessage {
  return settingsReloadError
    ? {
        key: "status.withDetail",
        values: {
          status: translate(openedStatus.key, openedStatus.values),
          detail: translate(settingsReloadError.key, settingsReloadError.values)
        }
      }
    : openedStatus;
}

function projectContextForProject(
  project: PergamumProject | null
): ActiveProjectContext | null {
  return project ? { rootPath: project.rootPath } : null;
}

export function findProjectDocumentByEditorId(
  project: PergamumProject,
  editorId: EditorId,
  activeProjectContext: ActiveProjectContext
): ProjectDocument | null {
  if (editorId.kind !== "projectDocument") {
    return null;
  }

  return (
    project.documents.find((document) =>
      editorIdEquals(
        createProjectDocumentEditorId(
          document.relativePath,
          activeProjectContext
        ),
        editorId
      )
    ) ?? null
  );
}

export function currentDocumentForOpenedFile(
  file: MarkdownFile,
  project: PergamumProject | null,
  activeProjectContext: ActiveProjectContext | null
): CurrentDocument {
  const editorId = createEditorIdForPath(file.path, activeProjectContext);

  if (editorId.kind === "projectDocument") {
    const projectDocument =
      project && activeProjectContext
        ? findProjectDocumentByEditorId(project, editorId, activeProjectContext)
        : null;

    if (!projectDocument) {
      throw new Error("Project document is not listed in the active project.");
    }

    return createProjectDocument(projectDocument, file.content);
  }

  return createFileDocument(file);
}

export function App(): JSX.Element {
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [openDocumentsState, setOpenDocumentsState] =
    useState<OpenDocumentsState>(createInitialOpenDocumentsState);
  const [sidebarMode, setSidebarMode] = useState(defaultSidebarMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState(false);
  const [status, setStatus] = useState<StatusMessage>({ key: "app.ready" });
  const {
    settings,
    displayLanguage,
    isLoading: isSettingsLoading,
    error: settingsError,
    reloadSettings,
    saveSettings
  } = useApplicationSettings();

  const activeDocument = activeOpenDocument(openDocumentsState);
  const currentDocument = activeCurrentDocument(openDocumentsState);
  const activeProjectContext = useMemo(
    () => projectContextForProject(project),
    [project]
  );
  const effectiveSettings = useMemo(
    () => resolveEffectiveSettings(settings, project?.config?.settings),
    [settings, project?.config?.settings]
  );
  const content = currentDocumentContent(currentDocument);
  const isDirty = isCurrentDocumentDirty(currentDocument);
  const translate = useMemo(
    () => (key: TranslationKey, values?: TranslationValues) =>
      t(displayLanguage, key, values),
    [displayLanguage]
  );
  const commandRegistry = useMemo(() => {
    const registry = new CommandRegistry();

    registerWorkspaceCommands(
      registry,
      {
        focusSidebarMode: (mode) => {
          setSidebarMode(mode);
        },
        toggleProjectSettings: () => {
          setIsSettingsOpen((isOpen) => !isOpen);
        }
      },
      createWorkspaceCommandTitles(translate)
    );

    return registry;
  }, [translate]);
  const shouldShowWelcome =
    project === null && isOnlyInitialUntitledDocument(openDocumentsState);
  const previewHtml = useMemo(() => {
    switch (effectiveSettings.preview.renderer) {
      case "markdown":
        return markdownPreviewRenderer.render(content);
    }
  }, [content, effectiveSettings.preview.renderer]);
  const tabs = useMemo(
    () => documentTabs(openDocumentsState),
    [openDocumentsState]
  );

  function confirmProjectSwitch(): boolean {
    if (!hasDirtyOpenDocuments(openDocumentsState)) {
      return true;
    }

    return window.confirm(translate("confirm.discardOpenDocuments"));
  }

  function setActiveDocumentContent(nextContent: string): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenDocument(state, (document) =>
        updateCurrentDocumentContent(document, nextContent)
      )
    );
  }

  function activateDocument(documentId: EditorId): void {
    setOpenDocumentsState((state) => activateOpenDocument(state, documentId));
  }

  function openDocument(document: CurrentDocument): void {
    setOpenDocumentsState((state) =>
      openOrActivateDocument(state, document, activeProjectContext)
    );
  }

  function executeUiCommand<TArgs extends readonly unknown[], TResult>(
    commandId: CommandId<TArgs, TResult>,
    ...args: CommandArgumentList<TArgs>
  ): void {
    void commandRegistry.execute(commandId, ...args).catch((error) => {
      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
    });
  }

  async function openFile(): Promise<void> {
    try {
      const file = await window.pergamum.files.openMarkdown();

      if (!file) {
        setStatus({ key: "status.openCanceled" });
        return;
      }

      const openedDocument = currentDocumentForOpenedFile(
        file,
        project,
        activeProjectContext
      );

      openDocument(openedDocument);
      setStatus({
        key: "status.openedFile",
        values: { name: openedDocument.name }
      });
    } catch (error) {
      setStatus({
        key: "status.documentOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  function replaceSavedDocument(
    documentId: EditorId,
    document: CurrentDocument
  ): boolean {
    const replacement = replaceOpenDocument(
      openDocumentsState,
      documentId,
      document,
      activeProjectContext
    );

    setOpenDocumentsState(replacement.state);

    return replacement.didCollide;
  }

  async function saveFile(): Promise<void> {
    try {
      const documentToSave = activeDocument.document;
      const documentIdToSave = activeDocument.id;

      if (isProjectCurrentDocument(documentToSave)) {
        const result = await window.pergamum.projects.saveProjectDocument(
          documentToSave.relativePath,
          documentToSave.content
        );

        replaceSavedDocument(
          documentIdToSave,
          markCurrentDocumentSaved(documentToSave)
        );
        setStatus({
          key: "status.savedPath",
          values: { path: result.relativePath }
        });
        return;
      }

      const result = await window.pergamum.files.saveMarkdown(
        standaloneSavePath(documentToSave),
        documentToSave.content
      );

      if (!result) {
        setStatus({ key: "status.saveCanceled" });
        return;
      }

      const savedDocument = applyStandaloneSaveResult(documentToSave, result);
      const didCollide = replaceSavedDocument(documentIdToSave, savedDocument);

      setStatus(
        didCollide
          ? {
              key: "status.saveAsTargetAlreadyOpen",
              values: { path: result.path }
            }
          : {
              key: "status.savedPath",
              values: { path: savedDocument.name }
            }
      );
    } catch (error) {
      setStatus({
        key: "status.saveFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function readProjectDocument(
    document: ProjectDocument
  ): Promise<CurrentDocument> {
    const loadedDocument = await window.pergamum.projects.readProjectDocument(
      document.relativePath
    );

    return createProjectDocument(document, loadedDocument.content);
  }

  async function activateProject(
    openedProject: PergamumProject
  ): Promise<StatusMessage> {
    setProject(openedProject);
    const openedProjectContext = projectContextForProject(openedProject);

    if (openedProject.documents.length > 0) {
      const firstDocument = openedProject.documents[0];
      const firstCurrentDocument = await readProjectDocument(firstDocument);

      setOpenDocumentsState((state) =>
        createOpenDocumentsStateWithDocument(
          firstCurrentDocument,
          openedProjectContext,
          state.nextUntitledId
        )
      );

      return {
        key: "status.openedProjectDocument",
        values: {
          projectName: openedProject.name,
          relativePath: firstDocument.relativePath
        }
      };
    }

    setOpenDocumentsState((state) =>
      createInitialOpenDocumentsState(state.nextUntitledId)
    );

    return {
      key: "status.openedProject",
      values: {
        projectName: openedProject.name,
        count: openedProject.documents.length
      }
    };
  }

  async function reloadSettingsAfterProjectOpen(): Promise<StatusMessage | null> {
    try {
      await reloadSettings();
      return null;
    } catch (error) {
      return {
        key: "status.settingsReloadFailed",
        values: { message: errorMessage(error, translate) }
      };
    }
  }

  async function openProject(): Promise<void> {
    if (!confirmProjectSwitch()) {
      setStatus({ key: "status.openProjectCanceled" });
      return;
    }

    try {
      const openedProject = await window.pergamum.projects.openProject();

      if (!openedProject) {
        setStatus({ key: "status.openProjectCanceled" });
        return;
      }

      const settingsReloadError = await reloadSettingsAfterProjectOpen();
      const openedStatus = await activateProject(openedProject);
      setStatus(projectOpenStatus(openedStatus, settingsReloadError, translate));
    } catch (error) {
      setStatus({
        key: "status.projectOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function openRecentProject(projectPath: string): Promise<void> {
    if (!confirmProjectSwitch()) {
      setStatus({ key: "status.openProjectCanceled" });
      return;
    }

    try {
      const openedProject = await window.pergamum.projects.openRecentProject(
        projectPath
      );
      const settingsReloadError = await reloadSettingsAfterProjectOpen();
      const openedStatus = await activateProject(openedProject);
      setIsRecentProjectsOpen(false);
      setStatus(projectOpenStatus(openedStatus, settingsReloadError, translate));
    } catch (error) {
      setStatus({
        key: "status.recentProjectOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function selectProjectDocument(relativePath: string): Promise<void> {
    const document = project?.documents.find(
      (projectDocument) => projectDocument.relativePath === relativePath
    );

    if (!document) {
      setStatus({ key: "status.projectDocumentNotFound" });
      return;
    }

    try {
      const documentId = createProjectDocumentEditorId(
        document.relativePath,
        activeProjectContext
      );

      if (hasOpenDocument(openDocumentsState, documentId)) {
        activateDocument(documentId);
        setStatus({
          key: "status.openedProjectDocumentOnly",
          values: { relativePath: document.relativePath }
        });
        return;
      }

      const openedDocument = await readProjectDocument(document);

      openDocument(openedDocument);
      setStatus({
        key: "status.openedProjectDocumentOnly",
        values: { relativePath: document.relativePath }
      });
    } catch (error) {
      setStatus({
        key: "status.documentOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function changeSettings(
    nextSettings: SaveApplicationSettingsRequest
  ): Promise<void> {
    try {
      await saveSettings(nextSettings);
      setStatus({ key: "status.settingsSaved" });
    } catch (error) {
      setStatus({
        key: "status.settingsSaveFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  return (
    <main className="appShell">
      <header className="toolbar">
        <div className="documentTitle">
          <span>{currentDocumentTitle(currentDocument)}</span>
          {isDirty ? (
            <span className="dirtyIndicator">
              {translate("document.unsaved")}
            </span>
          ) : null}
          {project ? (
            <span className="projectName">
              {translate("project.label", { name: project.name })}
            </span>
          ) : null}
        </div>
        <button type="button" onClick={openProject}>
          {translate("toolbar.openProject")}
        </button>
        <button type="button" onClick={openFile}>
          {translate("common.open")}
        </button>
        <button type="button" onClick={saveFile}>
          {translate("common.save")}
        </button>
        <button
          type="button"
          onClick={() => setIsRecentProjectsOpen((isOpen) => !isOpen)}
        >
          {translate("toolbar.recentProjects")}
        </button>
      </header>

      <section className="appBody">
        <ActivityBar
          activeMode={sidebarMode}
          isProjectSettingsOpen={isSettingsOpen}
          translate={translate}
          onSelectMode={(mode) =>
            executeUiCommand(workspaceFocusCommandIdForMode(mode))
          }
          onToggleProjectSettings={() =>
            executeUiCommand(workspaceCommandIds.toggleSettings)
          }
        />

        <section className="appContent">
          {isSettingsOpen ? (
            <SettingsPanel
              settings={settings}
              isLoading={isSettingsLoading}
              error={settingsError}
              translate={translate}
              onChangeSettings={(nextSettings) => {
                void changeSettings(nextSettings);
              }}
            />
          ) : null}

          {isRecentProjectsOpen ? (
            <RecentProjectsPanel
              recentProjects={settings.recentProjects}
              translate={translate}
              onOpenProject={(projectPath) => {
                void openRecentProject(projectPath);
              }}
            />
          ) : null}

          {shouldShowWelcome ? (
            <WelcomeScreen
              recentProjects={settings.recentProjects}
              translate={translate}
              onOpenProject={() => {
                void openProject();
              }}
              onOpenRecentProject={(projectPath) => {
                void openRecentProject(projectPath);
              }}
            />
          ) : (
            <section className="mainArea">
              <WorkspaceSidebar
                mode={sidebarMode}
                project={project}
                activeRelativePath={currentProjectRelativePath(currentDocument)}
                translate={translate}
                onSelectProjectDocument={(relativePath) => {
                  void selectProjectDocument(relativePath);
                }}
              />

              <section className="editorArea">
                <DocumentTabBar
                  tabs={tabs}
                  activeDocumentId={openDocumentsState.activeDocumentId}
                  translate={translate}
                  onSelectDocument={activateDocument}
                />

                <section
                  className="workspace"
                  aria-label={translate("workspace.markdownWorkspace")}
                >
                  <section
                    className="pane"
                    aria-label={translate("workspace.markdownEditor")}
                  >
                    <div className="paneHeader">
                      {translate("workspace.editor")}
                    </div>
                    <MarkdownEditor
                      value={content}
                      onChange={setActiveDocumentContent}
                    />
                  </section>

                  <section
                    className="pane"
                    aria-label={translate("workspace.markdownPreview")}
                  >
                    <div className="paneHeader">
                      {translate("workspace.preview")}
                    </div>
                    <article
                      className="preview"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </section>
                </section>
              </section>
            </section>
          )}
        </section>
      </section>

      {effectiveSettings.showStatusBar ? (
        <footer className="statusBar">
          {translate(status.key, status.values)}
        </footer>
      ) : null}
    </main>
  );
}
