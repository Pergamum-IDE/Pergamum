import { useMemo, useState } from "react";
import type {
  PergamumProject,
  ProjectDocument,
  SaveApplicationSettingsRequest
} from "../shared/api";
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export function App(): JSX.Element {
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [currentDocument, setCurrentDocument] = useState<CurrentDocument>(
    createUntitledDocument
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState(false);
  const [status, setStatus] = useState("Ready");
  const {
    settings,
    isLoading: isSettingsLoading,
    error: settingsError,
    reloadSettings,
    saveSettings
  } = useApplicationSettings();

  const content = currentDocumentContent(currentDocument);
  const isDirty = isCurrentDocumentDirty(currentDocument);
  const previewHtml = useMemo(
    () => markdownPreviewRenderer.render(content),
    [content]
  );

  async function openFile(): Promise<void> {
    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }

    const file = await window.pergamum.files.openMarkdown();

    if (!file) {
      setStatus("Open canceled");
      return;
    }

    const openedDocument = createFileDocument(file);
    setCurrentDocument(openedDocument);
    setStatus(`Opened ${openedDocument.name}`);
  }

  async function saveFile(): Promise<void> {
    if (isProjectCurrentDocument(currentDocument)) {
      const result = await window.pergamum.projects.saveProjectDocument(
        currentDocument.relativePath,
        currentDocument.content
      );

      setCurrentDocument(markCurrentDocumentSaved(currentDocument));
      setStatus(`Saved ${result.relativePath}`);
      return;
    }

    const result = await window.pergamum.files.saveMarkdown(
      standaloneSavePath(currentDocument),
      currentDocument.content
    );

    if (!result) {
      setStatus("Save canceled");
      return;
    }

    const savedDocument = applyStandaloneSaveResult(currentDocument, result);
    setCurrentDocument(savedDocument);
    setStatus(`Saved ${savedDocument.name}`);
  }

  async function loadProjectDocument(document: ProjectDocument): Promise<void> {
    const loadedDocument = await window.pergamum.projects.readProjectDocument(
      document.relativePath
    );

    setCurrentDocument(createProjectDocument(document, loadedDocument.content));
  }

  async function activateProject(
    openedProject: PergamumProject
  ): Promise<string> {
    setProject(openedProject);

    if (openedProject.documents.length > 0) {
      const firstDocument = openedProject.documents[0];
      await loadProjectDocument(firstDocument);

      return `Opened project ${openedProject.name}; current document ${firstDocument.relativePath}`;
    }

    return `Opened project ${openedProject.name} (${openedProject.documents.length} Markdown files)`;
  }

  async function reloadSettingsAfterProjectOpen(): Promise<string | null> {
    try {
      await reloadSettings();
      return null;
    } catch (error) {
      return `settings reload failed: ${errorMessage(error)}`;
    }
  }

  function projectOpenStatus(
    openedStatus: string,
    settingsReloadError: string | null
  ): string {
    return settingsReloadError
      ? `${openedStatus}; ${settingsReloadError}`
      : openedStatus;
  }

  async function openProject(): Promise<void> {
    try {
      const openedProject = await window.pergamum.projects.openProject();

      if (!openedProject) {
        setStatus("Open project canceled");
        return;
      }

      const settingsReloadError = await reloadSettingsAfterProjectOpen();
      const openedStatus = await activateProject(openedProject);
      setStatus(projectOpenStatus(openedStatus, settingsReloadError));
    } catch (error) {
      setStatus(`Project open failed: ${errorMessage(error)}`);
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
      setStatus(`Recent project open failed: ${errorMessage(error)}`);
    }
  }

  async function selectProjectDocument(relativePath: string): Promise<void> {
    const document = project?.documents.find(
      (projectDocument) => projectDocument.relativePath === relativePath
    );

    if (!document) {
      setStatus("Project document not found");
      return;
    }

    try {
      await loadProjectDocument(document);
      setStatus(`Opened ${document.relativePath}`);
    } catch (error) {
      setStatus(`Document open failed: ${errorMessage(error)}`);
    }
  }

  async function changeSettings(
    nextSettings: SaveApplicationSettingsRequest
  ): Promise<void> {
    try {
      await saveSettings(nextSettings);
      setStatus("Settings saved");
    } catch (error) {
      setStatus(`Settings save failed: ${errorMessage(error)}`);
    }
  }

  return (
    <main className="appShell">
      <header className="toolbar">
        <div className="documentTitle">
          <span>{currentDocumentTitle(currentDocument)}</span>
          {isDirty ? <span className="dirtyIndicator">Unsaved</span> : null}
          {project ? (
            <span className="projectName">Project: {project.name}</span>
          ) : null}
        </div>
        <button type="button" onClick={openProject}>
          Open Project
        </button>
        <button type="button" onClick={openFile}>
          Open
        </button>
        <button type="button" onClick={saveFile}>
          Save
        </button>
        <button
          type="button"
          onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setIsRecentProjectsOpen((isOpen) => !isOpen)}
        >
          Recent Projects
        </button>
      </header>

      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          isLoading={isSettingsLoading}
          error={settingsError}
          onChangeSettings={(nextSettings) => {
            void changeSettings(nextSettings);
          }}
        />
      ) : null}

      {isRecentProjectsOpen ? (
        <RecentProjectsPanel
          recentProjects={settings.recentProjects}
          onOpenProject={(projectPath) => {
            void openRecentProject(projectPath);
          }}
        />
      ) : null}

      <section className="mainArea">
        {project ? (
          <FileExplorer
            documents={project.documents}
            activeRelativePath={currentProjectRelativePath(currentDocument)}
            onSelectDocument={(relativePath) => {
              void selectProjectDocument(relativePath);
            }}
          />
        ) : null}

        <section className="workspace" aria-label="Markdown workspace">
          <section className="pane" aria-label="Markdown editor">
            <div className="paneHeader">Editor</div>
            <MarkdownEditor
              value={content}
              onChange={(nextContent) => {
                setCurrentDocument((document) =>
                  updateCurrentDocumentContent(document, nextContent)
                );
              }}
            />
          </section>

          <section className="pane" aria-label="Markdown preview">
            <div className="paneHeader">Preview</div>
            <article
              className="preview"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </section>
        </section>
      </section>

      {settings.showStatusBar ? <footer className="statusBar">{status}</footer> : null}
    </main>
  );
}
