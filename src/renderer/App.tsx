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
  createUntitledDocument,
  type CurrentDocument,
  currentDocumentContent,
  currentDocumentTitle,
  currentProjectRelativePath,
  isCurrentDocumentDirty,
  isInitialUntitledDocument,
  isProjectCurrentDocument,
  markCurrentDocumentSaved,
  standaloneSavePath,
  updateCurrentDocumentContent
} from "./currentDocument";
import { FileExplorer } from "./FileExplorer";
import { MarkdownEditor } from "./MarkdownEditor";
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

export function App(): JSX.Element {
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [currentDocument, setCurrentDocument] = useState<CurrentDocument>(
    createUntitledDocument
  );
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

  const content = currentDocumentContent(currentDocument);
  const isDirty = isCurrentDocumentDirty(currentDocument);
  const translate = useMemo(
    () => (key: TranslationKey, values?: TranslationValues) =>
      t(displayLanguage, key, values),
    [displayLanguage]
  );
  const shouldShowWelcome =
    project === null && isInitialUntitledDocument(currentDocument);
  const previewHtml = useMemo(
    () => markdownPreviewRenderer.render(content),
    [content]
  );

  async function openFile(): Promise<void> {
    if (isDirty && !window.confirm(translate("confirm.discardUnsaved"))) {
      return;
    }

    const file = await window.pergamum.files.openMarkdown();

    if (!file) {
      setStatus({ key: "status.openCanceled" });
      return;
    }

    const openedDocument = createFileDocument(file);
    setCurrentDocument(openedDocument);
    setStatus({
      key: "status.openedFile",
      values: { name: openedDocument.name }
    });
  }

  async function saveFile(): Promise<void> {
    if (isProjectCurrentDocument(currentDocument)) {
      const result = await window.pergamum.projects.saveProjectDocument(
        currentDocument.relativePath,
        currentDocument.content
      );

      setCurrentDocument(markCurrentDocumentSaved(currentDocument));
      setStatus({
        key: "status.savedPath",
        values: { path: result.relativePath }
      });
      return;
    }

    const result = await window.pergamum.files.saveMarkdown(
      standaloneSavePath(currentDocument),
      currentDocument.content
    );

    if (!result) {
      setStatus({ key: "status.saveCanceled" });
      return;
    }

    const savedDocument = applyStandaloneSaveResult(currentDocument, result);
    setCurrentDocument(savedDocument);
    setStatus({
      key: "status.savedPath",
      values: { path: savedDocument.name }
    });
  }

  async function loadProjectDocument(document: ProjectDocument): Promise<void> {
    const loadedDocument = await window.pergamum.projects.readProjectDocument(
      document.relativePath
    );

    setCurrentDocument(createProjectDocument(document, loadedDocument.content));
  }

  async function activateProject(
    openedProject: PergamumProject
  ): Promise<StatusMessage> {
    setProject(openedProject);

    if (openedProject.documents.length > 0) {
      const firstDocument = openedProject.documents[0];
      await loadProjectDocument(firstDocument);

      return {
        key: "status.openedProjectDocument",
        values: {
          projectName: openedProject.name,
          relativePath: firstDocument.relativePath
        }
      };
    }

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

  function projectOpenStatus(
    openedStatus: StatusMessage,
    settingsReloadError: StatusMessage | null
  ): StatusMessage {
    return settingsReloadError
      ? {
          key: "status.withDetail",
          values: {
            status: translate(openedStatus.key, openedStatus.values),
            detail: translate(
              settingsReloadError.key,
              settingsReloadError.values
            )
          }
        }
      : openedStatus;
  }

  async function openProject(): Promise<void> {
    try {
      const openedProject = await window.pergamum.projects.openProject();

      if (!openedProject) {
        setStatus({ key: "status.openProjectCanceled" });
        return;
      }

      const settingsReloadError = await reloadSettingsAfterProjectOpen();
      const openedStatus = await activateProject(openedProject);
      setStatus(projectOpenStatus(openedStatus, settingsReloadError));
    } catch (error) {
      setStatus({
        key: "status.projectOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function openRecentProject(projectPath: string): Promise<void> {
    try {
      const openedProject = await window.pergamum.projects.openRecentProject(
        projectPath
      );
      const settingsReloadError = await reloadSettingsAfterProjectOpen();
      const openedStatus = await activateProject(openedProject);
      setIsRecentProjectsOpen(false);
      setStatus(projectOpenStatus(openedStatus, settingsReloadError));
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
      await loadProjectDocument(document);
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
              <div className="paneHeader">{translate("workspace.editor")}</div>
              <MarkdownEditor
                value={content}
                onChange={(nextContent) => {
                  setCurrentDocument((document) =>
                    updateCurrentDocumentContent(document, nextContent)
                  );
                }}
              />
            </section>

            <section
              className="pane"
              aria-label={translate("workspace.markdownPreview")}
            >
              <div className="paneHeader">{translate("workspace.preview")}</div>
              <article
                className="preview"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </section>
          </section>
        </section>
      )}

      {settings.showStatusBar ? (
        <footer className="statusBar">
          {translate(status.key, status.values)}
        </footer>
      ) : null}
    </main>
  );
}
