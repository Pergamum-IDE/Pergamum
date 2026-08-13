import { useMemo, useRef, useState } from "react";
import type {
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
  createGlossaryEntryEditorId,
  createProjectDocumentEditorId,
  type ActiveProjectContext,
  type EditorId
} from "../shared/editorId";
import type {
  CreateGlossaryEntryInput,
  GlossaryEntry,
  GlossaryEntryId,
  GlossaryEntryKind,
  GlossaryFormRelation,
  GlossaryWarningPolicy
} from "../shared/glossary";
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
  createProjectDocument,
  isProjectCurrentDocument,
  markCurrentDocumentSaved,
  standaloneSavePath,
  updateCurrentDocumentContent,
  type CurrentDocument
} from "./currentDocument";
import {
  createGlossaryEntryCurrentEditor,
  createMarkdownCurrentEditor,
  currentEditorGlossaryEntryId,
  currentEditorProjectRelativePath,
  currentEditorTitle,
  isCurrentEditorDirty,
  markdownDocumentForEditor,
  type CurrentEditor
} from "./currentEditor";
import { DocumentTabBar } from "./DocumentTabBar";
import { EditorSurface } from "./EditorSurface";
import {
  EditorNavigation,
  type EditorResolveResult,
  type OpenEditorOptions
} from "./editorNavigation";
import {
  applyGlossaryEntryDraftSaveResult,
  addGlossaryEntryDraftForm,
  deleteGlossaryEntryDraftForm,
  glossaryEntryDraftUpdateInput,
  isGlossaryEntryDraftDirty,
  markGlossaryEntryDraftSaveFailed,
  markGlossaryEntryDraftSaving,
  updateGlossaryEntryDraftCanonicalSurface,
  updateGlossaryEntryDraftDescription,
  updateGlossaryEntryDraftFormSurface,
  updateGlossaryEntryDraftFormWarningPolicy,
  updateGlossaryEntryDraftKind
} from "./glossaryEntryDraft";
import { canonicalGlossarySurface } from "./glossaryPresentation";
import {
  createGlossaryCommandTitles,
  glossaryCommandIds,
  registerGlossaryCommands
} from "./glossaryCommands";
import {
  activeCurrentEditor,
  activeOpenDocument,
  activateOpenDocument,
  createInitialOpenDocumentsState,
  documentTabs,
  editorIdForCurrentDocument,
  hasDirtyOpenDocuments,
  hasOpenDocument,
  isOnlyInitialUntitledDocument,
  openOrActivateEditor,
  replaceOpenDocument,
  updateActiveOpenDocument,
  updateActiveOpenEditor,
  updateOpenEditor,
  type OpenDocumentsState
} from "./openDocuments";
import { currentDocumentForOpenedFile } from "./projectDocumentResolution";
import {
  loadFirstProjectDocumentIfCurrent,
  openFirstProjectDocumentAfterContextSwitch,
  ProjectActivationLifetime,
  resetOpenDocumentsForProjectContextSwitch
} from "./projectActivationState";
import { RecentProjectsPanel } from "./RecentProjectsPanel";
import { resolveCurrentEditor } from "./resolveCurrentEditor";
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

export function App(): JSX.Element {
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [openDocumentsState, setOpenDocumentsState] =
    useState<OpenDocumentsState>(createInitialOpenDocumentsState);
  const [sidebarMode, setSidebarMode] = useState(defaultSidebarMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState(false);
  const [status, setStatus] = useState<StatusMessage>({ key: "app.ready" });
  const [glossaryRefreshToken, setGlossaryRefreshToken] = useState(0);
  const editorNavigationRef = useRef<EditorNavigation<CurrentEditor> | null>(
    null
  );
  const projectActivationLifetimeRef = useRef(
    new ProjectActivationLifetime()
  );
  const {
    settings,
    displayLanguage,
    isLoading: isSettingsLoading,
    error: settingsError,
    reloadSettings,
    saveSettings
  } = useApplicationSettings();

  const activeDocument = activeOpenDocument(openDocumentsState);
  const currentEditor = activeCurrentEditor(openDocumentsState);
  const activeMarkdownDocument = markdownDocumentForEditor(currentEditor);
  const activeProjectContext = useMemo(
    () => projectContextForProject(project),
    [project]
  );
  const effectiveSettings = useMemo(
    () => resolveEffectiveSettings(settings, project?.config?.settings),
    [settings, project?.config?.settings]
  );
  const isDirty = isCurrentEditorDirty(currentEditor);
  const isSavingGlossaryEntry =
    currentEditor.kind === "glossaryEntry" &&
    currentEditor.draft.saveState === "saving";
  const canSaveGlossaryEntry =
    currentEditor.kind === "glossaryEntry" &&
    !isSavingGlossaryEntry &&
    currentEditor.draft.canonicalSurface.trim().length > 0;
  const canSave =
    currentEditor.kind === "markdown"
      ? Boolean(activeMarkdownDocument)
      : canSaveGlossaryEntry;
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
    registerGlossaryCommands(
      registry,
      {
        openGlossaryEntry: async (entryId) => {
          const editorId = createGlossaryEntryEditorId(
            entryId,
            activeProjectContext
          );

          return await openEditorFromExplicitActivation(editorId);
        },
        createGlossaryEntry: async (input) => {
          const projectGeneration =
            projectActivationLifetimeRef.current.captureProjectActivationGeneration();
          let entry: GlossaryEntry;

          try {
            entry = await window.pergamum.glossary.create(input);
          } catch (error) {
            if (
              !projectActivationLifetimeRef.current.isProjectActivationCurrent(
                projectGeneration
              )
            ) {
              return false;
            }

            throw error;
          }

          if (
            !projectActivationLifetimeRef.current.isProjectActivationCurrent(
              projectGeneration
            )
          ) {
            return false;
          }

          setGlossaryRefreshToken((token) => token + 1);

          const editorId = createGlossaryEntryEditorId(
            entry.id,
            activeProjectContext
          );

          return await openEditorFromExplicitActivation(editorId, {
            history: "record",
            resolvedEditor: createGlossaryEntryCurrentEditor(entry)
          });
        }
      },
      createGlossaryCommandTitles(translate)
    );

    return registry;
  }, [activeProjectContext, translate]);
  const shouldShowWelcome =
    project === null && isOnlyInitialUntitledDocument(openDocumentsState);
  const tabs = useMemo(
    () => documentTabs(openDocumentsState),
    [openDocumentsState]
  );
  if (!editorNavigationRef.current) {
    editorNavigationRef.current = new EditorNavigation({
      resolveEditor,
      applyEditor
    });
  }
  const editorNavigation = editorNavigationRef.current;
  editorNavigation.updateAdapter({
    resolveEditor,
    applyEditor
  });

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

  function setActiveGlossaryEntryKind(kind: GlossaryEntryKind): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? { ...editor, draft: updateGlossaryEntryDraftKind(editor.draft, kind) }
          : editor
      )
    );
  }

  function setActiveGlossaryEntryDescription(description: string): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftDescription(
                editor.draft,
                description
              )
            }
          : editor
      )
    );
  }

  function setActiveGlossaryEntryCanonicalSurface(surface: string): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftCanonicalSurface(
                editor.draft,
                surface
              )
            }
          : editor
      )
    );
  }

  function addActiveGlossaryEntryForm(
    relation: GlossaryFormRelation
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: addGlossaryEntryDraftForm(editor.draft, relation)
            }
          : editor
      )
    );
  }

  function setActiveGlossaryEntryFormSurface(
    formId: string,
    surface: string
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftFormSurface(
                editor.draft,
                formId,
                surface
              )
            }
          : editor
      )
    );
  }

  function setActiveGlossaryEntryFormWarningPolicy(
    formId: string,
    warningPolicy: GlossaryWarningPolicy
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftFormWarningPolicy(
                editor.draft,
                formId,
                warningPolicy
              )
            }
          : editor
      )
    );
  }

  function deleteActiveGlossaryEntryForm(formId: string): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: deleteGlossaryEntryDraftForm(editor.draft, formId)
            }
          : editor
      )
    );
  }

  async function createGlossaryEntryFromSidebar(
    input: CreateGlossaryEntryInput
  ): Promise<boolean> {
    try {
      return await commandRegistry.execute(
        glossaryCommandIds.createEntry,
        input
      );
    } catch (error) {
      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
      return false;
    }
  }

  function activateDocument(documentId: EditorId): void {
    openEditorFromUi(documentId);
  }

  async function resolveEditor(
    editorId: EditorId
  ): Promise<EditorResolveResult<CurrentEditor>> {
    return resolveCurrentEditor(editorId, {
      openDocumentsState,
      project,
      activeProjectContext,
      readProjectDocument,
      getGlossaryEntryById: window.pergamum.glossary.getById
    });
  }

  function applyEditor(editorId: EditorId, editor: CurrentEditor): void {
    setOpenDocumentsState((state) => {
      if (hasOpenDocument(state, editorId)) {
        return activateOpenDocument(state, editorId);
      }

      return openOrActivateEditor(state, editor, activeProjectContext);
    });
  }

  function openEditor(
    editorId: EditorId,
    options?: OpenEditorOptions<CurrentEditor>
  ): Promise<boolean> {
    return editorNavigation.openEditor(editorId, options);
  }

  function openEditorFromExplicitActivation(
    editorId: EditorId,
    options?: OpenEditorOptions<CurrentEditor>
  ): Promise<boolean> {
    projectActivationLifetimeRef.current.markExplicitEditorActivation();

    return openEditor(editorId, options);
  }

  function openEditorFromUi(
    editorId: EditorId,
    options?: OpenEditorOptions<CurrentEditor>
  ): void {
    void openEditorFromExplicitActivation(editorId, options).catch((error) => {
      setStatus({
        key: "status.documentOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    });
  }

  async function openDocument(document: CurrentDocument): Promise<boolean> {
    const editorId = editorIdForCurrentDocument(
      document,
      activeProjectContext
    );

    if (!editorId) {
      throw new Error("Untitled editors must already have an EditorId.");
    }

    return await openEditorFromExplicitActivation(editorId, {
      history: "record",
      resolvedEditor: createMarkdownCurrentEditor(document)
    });
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

      await openDocument(openedDocument);
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

  async function saveGlossaryEntry(): Promise<void> {
    if (activeDocument.editor.kind !== "glossaryEntry") {
      return;
    }

    const documentIdToSave = activeDocument.id;
    const draftToSave = activeDocument.editor.draft;

    if (
      !isGlossaryEntryDraftDirty(draftToSave) ||
      draftToSave.saveState === "saving"
    ) {
      return;
    }

    const projectGeneration =
      projectActivationLifetimeRef.current.captureProjectActivationGeneration();

    setOpenDocumentsState((state) =>
      updateOpenEditor(state, documentIdToSave, (editor) =>
        editor.kind === "glossaryEntry"
          ? { ...editor, draft: markGlossaryEntryDraftSaving(editor.draft) }
          : editor
      )
    );

    try {
      const savedEntry = await window.pergamum.glossary.update(
        glossaryEntryDraftUpdateInput(draftToSave)
      );

      if (
        !projectActivationLifetimeRef.current.isProjectActivationCurrent(
          projectGeneration
        )
      ) {
        return;
      }

      setOpenDocumentsState((state) =>
        updateOpenEditor(state, documentIdToSave, (editor) =>
          editor.kind === "glossaryEntry"
            ? {
                ...editor,
                draft: applyGlossaryEntryDraftSaveResult(
                  editor.draft,
                  savedEntry
                )
              }
            : editor
        )
      );
      setGlossaryRefreshToken((token) => token + 1);
      setStatus({
        key: "status.savedPath",
        values: { path: canonicalGlossarySurface(savedEntry) }
      });
    } catch (error) {
      if (
        !projectActivationLifetimeRef.current.isProjectActivationCurrent(
          projectGeneration
        )
      ) {
        return;
      }

      setOpenDocumentsState((state) =>
        updateOpenEditor(state, documentIdToSave, (editor) =>
          editor.kind === "glossaryEntry"
            ? {
                ...editor,
                draft: markGlossaryEntryDraftSaveFailed(editor.draft)
              }
            : editor
        )
      );
      setStatus({
        key: "status.saveFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function saveFile(): Promise<void> {
    if (activeDocument.editor.kind === "glossaryEntry") {
      await saveGlossaryEntry();
      return;
    }

    try {
      if (activeDocument.editor.kind !== "markdown") {
        return;
      }

      const documentToSave = activeDocument.editor.document;
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
  ): Promise<StatusMessage | null> {
    const activationToken =
      projectActivationLifetimeRef.current.startProjectContextSwitch();
    const openedProjectContext: ActiveProjectContext = {
      rootPath: openedProject.rootPath
    };

    editorNavigation.reset();
    setOpenDocumentsState((state) =>
      resetOpenDocumentsForProjectContextSwitch(state)
    );
    setProject(openedProject);

    if (openedProject.documents.length > 0) {
      const firstDocument = openedProject.documents[0];
      const firstCurrentDocument = await loadFirstProjectDocumentIfCurrent(
        projectActivationLifetimeRef.current,
        activationToken,
        () => readProjectDocument(firstDocument)
      );

      if (!firstCurrentDocument) {
        return null;
      }

      setOpenDocumentsState((state) =>
        openFirstProjectDocumentAfterContextSwitch(
          state,
          firstCurrentDocument,
          openedProjectContext
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

      if (!openedStatus) {
        return;
      }

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

      if (!openedStatus) {
        return;
      }

      setIsRecentProjectsOpen(false);
      setStatus(projectOpenStatus(openedStatus, settingsReloadError, translate));
    } catch (error) {
      setStatus({
        key: "status.recentProjectOpenFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  async function activateProjectDocument(relativePath: string): Promise<void> {
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

      const didOpen = await openEditorFromExplicitActivation(documentId);

      setStatus(
        didOpen
          ? {
              key: "status.openedProjectDocumentOnly",
              values: { relativePath: document.relativePath }
            }
          : { key: "status.projectDocumentNotFound" }
      );
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
          <span>{currentEditorTitle(currentEditor)}</span>
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
        <button
          type="button"
          onClick={saveFile}
          disabled={!canSave}
        >
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
                highlightedProjectDocumentRelativePath={
                  currentEditorProjectRelativePath(currentEditor)
                }
                highlightedGlossaryEntryId={
                  currentEditorGlossaryEntryId(currentEditor)
                }
                glossaryRefreshToken={glossaryRefreshToken}
                translate={translate}
                onActivateProjectDocument={(relativePath) => {
                  void activateProjectDocument(relativePath);
                }}
                onActivateGlossaryEntry={(entryId) => {
                  executeUiCommand(glossaryCommandIds.openEntry, entryId);
                }}
                onCreateGlossaryEntry={createGlossaryEntryFromSidebar}
              />

              <section className="editorArea">
                <DocumentTabBar
                  tabs={tabs}
                  activeDocumentId={openDocumentsState.activeDocumentId}
                  translate={translate}
                  onSelectDocument={activateDocument}
                />

                <EditorSurface
                  editor={currentEditor}
                  projectRootPath={project?.rootPath ?? null}
                  glossaryRefreshToken={glossaryRefreshToken}
                  translate={translate}
                  onChangeMarkdownContent={setActiveDocumentContent}
                  onChangeGlossaryEntryKind={setActiveGlossaryEntryKind}
                  onChangeGlossaryEntryDescription={
                    setActiveGlossaryEntryDescription
                  }
                  onChangeGlossaryEntryCanonicalSurface={
                    setActiveGlossaryEntryCanonicalSurface
                  }
                  onAddGlossaryEntryForm={addActiveGlossaryEntryForm}
                  onChangeGlossaryEntryFormSurface={
                    setActiveGlossaryEntryFormSurface
                  }
                  onChangeGlossaryEntryFormWarningPolicy={
                    setActiveGlossaryEntryFormWarningPolicy
                  }
                  onDeleteGlossaryEntryForm={deleteActiveGlossaryEntryForm}
                />
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
