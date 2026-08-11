import { useMemo, useState } from "react";
import type {
  PergamumProject,
  ProjectDocument,
  SaveApplicationSettingsRequest
} from "../shared/api";
import {
  t,
  type Translate,
  type TranslationKey,
  type TranslationValues
} from "../shared/i18n";
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
import { FileExplorer } from "./FileExplorer";
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
  projectOpenDocumentId,
  replaceOpenDocument,
  updateActiveOpenDocument,
  type OpenDocumentId,
  type OpenDocumentsState
} from "./openDocuments";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";
import { RecentProjectsPanel } from "./RecentProjectsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { useApplicationSettings } from "./useApplicationSettings";
import { WelcomeScreen } from "./WelcomeScreen";

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

export function App(): JSX.Element {
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [openDocumentsState, setOpenDocumentsState] =
    useState<OpenDocumentsState>(createInitialOpenDocumentsState);
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
  const content = currentDocumentContent(currentDocument);
  const isDirty = isCurrentDocumentDirty(currentDocument);
  const translate = useMemo(
    () => (key: TranslationKey, values?: TranslationValues) =>
      t(displayLanguage, key, values),
    [displayLanguage]
  );
  const shouldShowWelcome =
    project === null && isOnlyInitialUntitledDocument(openDocumentsState);
  const previewHtml = useMemo(
    () => markdownPreviewRenderer.render(content),
    [content]
  );
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

  function activateDocument(documentId: OpenDocumentId): void {
    setOpenDocumentsState((state) => activateOpenDocument(state, documentId));
  }

  function openDocument(document: CurrentDocument): void {
    setOpenDocumentsState((state) => openOrActivateDocument(state, document));
  }

  async function openFile(): Promise<void> {
    const file = await window.pergamum.files.openMarkdown();

    if (!file) {
      setStatus({ key: "status.openCanceled" });
      return;
    }

    const openedDocument = createFileDocument(file);

    openDocument(openedDocument);
    setStatus({
      key: "status.openedFile",
      values: { name: openedDocument.name }
    });
  }

  function replaceSavedDocument(
    documentId: OpenDocumentId,
    document: CurrentDocument
  ): boolean {
    const replacement = replaceOpenDocument(
      openDocumentsState,
      documentId,
      document
    );

    setOpenDocumentsState(replacement.state);

    return replacement.didCollide;
  }

  async function saveFile(): Promise<void> {
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

    if (openedProject.documents.length > 0) {
      const firstDocument = openedProject.documents[0];
      const firstCurrentDocument = await readProjectDocument(firstDocument);

      setOpenDocumentsState(
        createOpenDocumentsStateWithDocument(firstCurrentDocument)
      );

      return {
        key: "status.openedProjectDocument",
        values: {
          projectName: openedProject.name,
          relativePath: firstDocument.relativePath
        }
      };
    }

    setOpenDocumentsState(createInitialOpenDocumentsState());

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

    const documentId = projectOpenDocumentId(document.relativePath);

    if (hasOpenDocument(openDocumentsState, documentId)) {
      activateDocument(documentId);
      setStatus({
        key: "status.openedProjectDocumentOnly",
        values: { relativePath: document.relativePath }
      });
      return;
    }

    try {
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
          onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
        >
          {translate("toolbar.settings")}
        </button>
        <button
          type="button"
          onClick={() => setIsRecentProjectsOpen((isOpen) => !isOpen)}
        >
          {translate("toolbar.recentProjects")}
        </button>
      </header>

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
        <>
          <DocumentTabBar
            tabs={tabs}
            activeDocumentId={openDocumentsState.activeDocumentId}
            translate={translate}
            onSelectDocument={activateDocument}
          />
          <section className="mainArea">
            {project ? (
              <FileExplorer
                documents={project.documents}
                activeRelativePath={currentProjectRelativePath(currentDocument)}
                translate={translate}
                onSelectDocument={(relativePath) => {
                  void selectProjectDocument(relativePath);
                }}
              />
            ) : null}

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
        </>
      )}

      {settings.showStatusBar ? (
        <footer className="statusBar">
          {translate(status.key, status.values)}
        </footer>
      ) : null}
    </main>
  );
}
