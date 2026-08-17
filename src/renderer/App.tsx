import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent
} from "react";
import type {
  PergamumProject,
  ProjectDocument,
  SaveApplicationSettingsRequest
} from "../shared/api";
import type { EditCommandId, FileMenuCommandId } from "../shared/commandIds";
import type { CommandContext } from "../shared/commandEnablement";
import type {
  DebugLogEditorIdKind,
  DebugLogSaveTargetKind
} from "../shared/debugLog";
import {
  CommandDisabledError,
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
  GlossaryFormMatchBoundary,
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
  applicationCommandIds,
  createApplicationCommandTitles,
  registerApplicationCommands
} from "./applicationCommands";
import { subscribeApplicationMenuCommands } from "./applicationMenuBridge";
import { CommandPalette } from "./CommandPalette";
import {
  createCommandPaletteCommandTitles,
  registerCommandPaletteCommands
} from "./commandPaletteCommands";
import { buildCommandContextSnapshot } from "./commandContextSnapshot";
import {
  applyStandaloneSaveResult,
  createProjectDocument,
  currentDocumentContent,
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
import {
  logRendererDebugEvent,
  rendererDebugErrorInfo
} from "./debugLog";
import { DebugLogPanel } from "./DebugLogPanel";
import { EditorSurface } from "./EditorSurface";
import {
  createContextMenuInteractionIdFactory,
  delegatedContextSurfaceFromDocument,
  executeContextMenuEditCommand,
  handleEditContextMenuEvent,
  hasSelectionInDocument,
  type NativeEditCommandContext
} from "./editContextMenuBridge";
import {
  createEditorCommandTitles,
  editorCommandIds,
  registerEditorCommands
} from "./editorCommands";
import { UtilityWindow } from "./UtilityWindow";
import { GlossaryOccurrencesPanel } from "./GlossaryOccurrencesPanel";
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
  updateGlossaryEntryDraftCanonicalMatchBoundaryEnd,
  updateGlossaryEntryDraftCanonicalMatchBoundaryStart,
  updateGlossaryEntryDraftCanonicalSurface,
  updateGlossaryEntryDraftDescription,
  updateGlossaryEntryDraftFormMatchBoundaryEnd,
  updateGlossaryEntryDraftFormMatchBoundaryStart,
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
import type { GlossaryOccurrenceRange } from "./glossaryOccurrenceNavigation";
import {
  inactiveGlossaryOccurrenceTrackingState,
  navigateGlossaryOccurrenceTracking,
  resolveGlossaryOccurrenceTrackingSession,
  startGlossaryOccurrenceTracking,
  type GlossaryOccurrenceDirection,
  type GlossaryOccurrenceTrackingState,
  type GlossaryOccurrenceTrackingOutcome,
  type NavigateGlossaryOccurrenceTrackingOutcome,
  type ResolveGlossaryOccurrenceTrackingSessionContext,
  type ResolveGlossaryOccurrenceTrackingSessionResult
} from "./glossaryOccurrenceTracking";
import {
  createGlossaryOccurrencesCommandTitles,
  glossaryOccurrencesCommandIds,
  registerGlossaryOccurrencesCommands
} from "./glossaryOccurrencesCommands";
import { createImeCompositionSaveGuard } from "./imeCompositionSaveGuard";
import {
  activeCurrentEditor,
  activeOpenDocument,
  activateOpenDocument,
  closeOpenEditor,
  createInitialOpenDocumentsState,
  documentTabs,
  editorIdForCurrentDocument,
  findOpenDocument,
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
import { createSaveInFlightGuard } from "./saveInFlightGuard";
import { defaultSidebarMode, type SidebarMode } from "./sidebarMode";
import { useApplicationSettings } from "./useApplicationSettings";
import { useHorizontalDrag } from "./useHorizontalDrag";
import { useVerticalDrag } from "./useVerticalDrag";
import {
  createUtilityWindowCommandTitles,
  registerUtilityWindowCommands,
  utilityWindowCommandIds
} from "./utilityWindowCommands";
import { WelcomeScreen } from "./WelcomeScreen";
import {
  clampSidebarWidth,
  clampUtilityWindowHeight,
  createInitialWorkbenchLayoutState,
  resolveActiveActivityMode,
  resolveSidebarToggle,
  resolveUtilityWindowOpenState,
  type UtilityWindowTabId,
  type WorkbenchLayoutState
} from "./workbenchLayout";
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

function debugEditorIdKind(editorId: EditorId): DebugLogEditorIdKind {
  return editorId.kind;
}

function debugSaveTargetKind(editor: CurrentEditor): DebugLogSaveTargetKind {
  switch (editor.kind) {
    case "glossaryEntry":
      return "glossaryEntry";
    case "markdown":
      return isProjectCurrentDocument(editor.document)
        ? "projectDocument"
        : "standaloneMarkdown";
  }
}

export function App(): JSX.Element {
  const [project, setProject] = useState<PergamumProject | null>(null);
  const [openDocumentsState, setOpenDocumentsState] =
    useState<OpenDocumentsState>(createInitialOpenDocumentsState);
  const [sidebarMode, setSidebarMode] = useState(defaultSidebarMode);
  const [layout, setLayout] = useState<WorkbenchLayoutState>(
    createInitialWorkbenchLayoutState
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [status, setStatus] = useState<StatusMessage>({ key: "app.ready" });
  const [glossaryRefreshToken, setGlossaryRefreshToken] = useState(0);
  const [pendingMarkdownSelection, setPendingMarkdownSelection] =
    useState<GlossaryOccurrenceRange | null>(null);
  const [
    glossaryOccurrenceTrackingState,
    setGlossaryOccurrenceTrackingState
  ] = useState<GlossaryOccurrenceTrackingState>(
    inactiveGlossaryOccurrenceTrackingState
  );
  const editorNavigationRef = useRef<EditorNavigation<CurrentEditor> | null>(
    null
  );
  const projectActivationLifetimeRef = useRef(
    new ProjectActivationLifetime()
  );
  const lastActiveMarkdownEditorIdRef = useRef<EditorId | null>(null);
  const navigateGlossaryOccurrenceRef = useRef<
    (
      entryId: GlossaryEntryId,
      direction: GlossaryOccurrenceDirection
    ) => Promise<boolean>
  >(() => Promise.resolve(false));
  const navigateGlossaryOccurrenceTrackingSessionRef = useRef<
    (direction: GlossaryOccurrenceDirection) => Promise<boolean>
  >(() => Promise.resolve(false));
  const openTrackedGlossaryEntryRef = useRef<() => Promise<boolean>>(() =>
    Promise.resolve(false)
  );
  const closeGlossaryOccurrenceTrackingRef = useRef<() => boolean>(
    () => false
  );
  const openProjectCommandRef = useRef<() => Promise<void>>(() =>
    Promise.resolve()
  );
  const openMarkdownDocumentCommandRef = useRef<() => Promise<void>>(() =>
    Promise.resolve()
  );
  const saveCurrentDocumentCommandRef = useRef<() => Promise<void>>(() =>
    Promise.resolve()
  );
  const nativeEditCommandContextRef =
    useRef<NativeEditCommandContext | null>(null);
  const toggleRecentProjectsCommandRef = useRef<() => void>(() => undefined);
  const canSaveCurrentDocumentCommandRef = useRef<() => boolean>(() => false);
  /**
   * Holds the current live command context. Read lazily by the
   * CommandRegistry's injected context provider so `when` re-evaluation at
   * execution time never sees a stale closure (#128).
   */
  const commandContextRef = useRef<CommandContext>({});
  const executeUiCommandRef = useRef<(commandId: FileMenuCommandId) => void>(
    () => undefined
  );
  const mainAreaRef = useRef<HTMLElement | null>(null);
  const editorAreaBodyRef = useRef<HTMLElement | null>(null);
  const sidebarWidthAtDragStartRef = useRef(layout.sidebar.width);
  const sidebarResizeDrag = useHorizontalDrag({
    onDragStart: () => {
      sidebarWidthAtDragStartRef.current = layout.sidebar.width;
    },
    onDragMove: (deltaX) => {
      const nextWidth = clampSidebarWidth(
        sidebarWidthAtDragStartRef.current + deltaX,
        mainAreaRef.current?.clientWidth
      );

      setLayout((current) =>
        current.sidebar.width === nextWidth
          ? current
          : { ...current, sidebar: { ...current.sidebar, width: nextWidth } }
      );
    }
  });
  const utilityWindowHeightAtDragStartRef = useRef(layout.utilityWindow.height);
  const utilityWindowResizeDrag = useVerticalDrag({
    onDragStart: () => {
      utilityWindowHeightAtDragStartRef.current = layout.utilityWindow.height;
    },
    onDragMove: (deltaY) => {
      const nextHeight = clampUtilityWindowHeight(
        utilityWindowHeightAtDragStartRef.current - deltaY,
        editorAreaBodyRef.current?.clientHeight
      );

      setLayout((current) =>
        current.utilityWindow.height === nextHeight
          ? current
          : {
              ...current,
              utilityWindow: { ...current.utilityWindow, height: nextHeight }
            }
      );
    }
  });
  const {
    settings,
    displayLanguage,
    isLoading: isSettingsLoading,
    error: settingsError,
    reloadSettings,
    saveSettings
  } = useApplicationSettings();
  const imeCompositionSaveGuard = useMemo(
    () =>
      createImeCompositionSaveGuard({
        log: (input) => {
          logRendererDebugEvent({
            level: "debug",
            ...input
          });
        }
      }),
    []
  );
  const saveInFlightGuard = useMemo(() => createSaveInFlightGuard(), []);
  const nextContextMenuInteractionId = useMemo(
    () => createContextMenuInteractionIdFactory(),
    []
  );

  const activeDocument = activeOpenDocument(openDocumentsState);
  const currentEditor = activeCurrentEditor(openDocumentsState);
  const activeMarkdownDocument = markdownDocumentForEditor(currentEditor);

  useEffect(() => {
    if (currentEditor.kind === "markdown") {
      lastActiveMarkdownEditorIdRef.current = activeDocument.id;
    }
  }, [currentEditor, activeDocument.id]);
  useEffect(() => {
    function handleWindowResize(): void {
      const sidebarContainerWidth = mainAreaRef.current?.clientWidth;
      const utilityWindowContainerHeight =
        editorAreaBodyRef.current?.clientHeight;

      setLayout((current) => {
        const nextWidth =
          sidebarContainerWidth === undefined
            ? current.sidebar.width
            : clampSidebarWidth(current.sidebar.width, sidebarContainerWidth);
        const nextHeight =
          utilityWindowContainerHeight === undefined
            ? current.utilityWindow.height
            : clampUtilityWindowHeight(
                current.utilityWindow.height,
                utilityWindowContainerHeight
              );

        if (
          nextWidth === current.sidebar.width &&
          nextHeight === current.utilityWindow.height
        ) {
          return current;
        }

        return {
          ...current,
          sidebar: { ...current.sidebar, width: nextWidth },
          utilityWindow: { ...current.utilityWindow, height: nextHeight }
        };
      });
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);
  useEffect(
    () =>
      subscribeApplicationMenuCommands(
        window.pergamum.applicationMenu.onCommand,
        () => (commandId) => {
          logRendererDebugEvent({
            level: "debug",
            event: "application_menu.command.received",
            details: {
              commandId,
              operation: "command",
              result: "succeeded"
            }
          });
          imeCompositionSaveGuard.handleCommand(
            commandId,
            executeUiCommandRef.current
          );
        }
      ),
    [imeCompositionSaveGuard]
  );
  const activeProjectContext = useMemo(
    () => projectContextForProject(project),
    [project]
  );
  useEffect(() => {
    imeCompositionSaveGuard.clearPendingSave("active_editor_changed");
  }, [activeDocument.id, imeCompositionSaveGuard]);
  useEffect(() => {
    imeCompositionSaveGuard.clearPendingSave("project_context_changed");
  }, [activeProjectContext?.rootPath, imeCompositionSaveGuard]);
  useEffect(
    () => () => {
      imeCompositionSaveGuard.clearPendingSave("unmount");
    },
    [imeCompositionSaveGuard]
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
  const commandContext = useMemo(
    () =>
      buildCommandContextSnapshot({
        projectIsOpen: project !== null,
        editorHasDocument:
          currentEditor.kind === "markdown"
            ? Boolean(activeMarkdownDocument)
            : currentEditor.kind === "glossaryEntry",
        editorIsDirty: isDirty,
        editorKindMarkdown: currentEditor.kind === "markdown",
        editorKindGlossary: currentEditor.kind === "glossaryEntry",
        occurrenceTrackingActive:
          glossaryOccurrenceTrackingState.kind === "active"
      }),
    [
      project,
      currentEditor.kind,
      activeMarkdownDocument,
      isDirty,
      glossaryOccurrenceTrackingState.kind
    ]
  );
  commandContextRef.current = commandContext;
  const translate = useMemo(
    () => (key: TranslationKey, values?: TranslationValues) =>
      t(displayLanguage, key, values),
    [displayLanguage]
  );
  const commandRegistry = useMemo(() => {
    const registry = new CommandRegistry();

    registerApplicationCommands(
      registry,
      {
        openProject: () => openProjectCommandRef.current(),
        toggleRecentProjects: () => toggleRecentProjectsCommandRef.current()
      },
      createApplicationCommandTitles(translate)
    );
    registerEditorCommands(
      registry,
      {
        openMarkdownDocument: () => openMarkdownDocumentCommandRef.current(),
        saveCurrentDocument: () => saveCurrentDocumentCommandRef.current(),
        canSaveCurrentDocument: () => canSaveCurrentDocumentCommandRef.current(),
        delegateNativeEditCommand: (commandId) =>
          delegateNativeEditCommand(commandId),
        canDelegateNativeEditCommand: () => true
      },
      createEditorCommandTitles(translate)
    );
    registerWorkspaceCommands(
      registry,
      {
        focusSidebarMode: (mode) => {
          const toggled = resolveSidebarToggle(
            sidebarMode,
            mode,
            layout.sidebar.collapsed
          );

          setSidebarMode(toggled.mode);
          setLayout((current) => {
            if (toggled.collapsed) {
              return current.sidebar.collapsed
                ? current
                : {
                    ...current,
                    sidebar: { ...current.sidebar, collapsed: true }
                  };
            }

            return {
              ...current,
              sidebar: {
                collapsed: false,
                width: clampSidebarWidth(
                  current.sidebar.width,
                  mainAreaRef.current?.clientWidth
                )
              }
            };
          });
        },
        toggleProjectSettings: () => {
          setIsSettingsOpen((isOpen) => !isOpen);
        }
      },
      createWorkspaceCommandTitles(translate)
    );
    registerUtilityWindowCommands(
      registry,
      {
        openUtilityWindow: () => {
          setLayout((current) => ({
            ...current,
            utilityWindow: resolveUtilityWindowOpenState(
              current.utilityWindow,
              true,
              editorAreaBodyRef.current?.clientHeight
            )
          }));
        },
        closeUtilityWindow: () => {
          setLayout((current) => ({
            ...current,
            utilityWindow: resolveUtilityWindowOpenState(
              current.utilityWindow,
              false
            )
          }));
        },
        toggleUtilityWindow: () => {
          setLayout((current) => ({
            ...current,
            utilityWindow: resolveUtilityWindowOpenState(
              current.utilityWindow,
              !current.utilityWindow.open,
              editorAreaBodyRef.current?.clientHeight
            )
          }));
        }
      },
      createUtilityWindowCommandTitles(translate)
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
        },
        navigateToPreviousGlossaryOccurrence: (entryId) =>
          navigateGlossaryOccurrenceRef.current(entryId, "previous"),
        navigateToNextGlossaryOccurrence: (entryId) =>
          navigateGlossaryOccurrenceRef.current(entryId, "next")
      },
      createGlossaryCommandTitles(translate)
    );
    registerGlossaryOccurrencesCommands(
      registry,
      {
        navigateToPreviousOccurrence: () =>
          navigateGlossaryOccurrenceTrackingSessionRef.current("previous"),
        navigateToNextOccurrence: () =>
          navigateGlossaryOccurrenceTrackingSessionRef.current("next"),
        openTrackedGlossaryEntry: () => openTrackedGlossaryEntryRef.current(),
        closeGlossaryOccurrenceTracking: () =>
          closeGlossaryOccurrenceTrackingRef.current()
      },
      createGlossaryOccurrencesCommandTitles(translate)
    );
    registerCommandPaletteCommands(
      registry,
      {
        openCommandPalette: () => {
          setIsCommandPaletteOpen((isOpen) => (isOpen ? isOpen : true));
        }
      },
      createCommandPaletteCommandTitles(translate)
    );

    registry.setCommandContextProvider(() => commandContextRef.current);
    registry.setOnCommandIgnored((commandId) => {
      logRendererDebugEvent({
        level: "debug",
        event: "command.ignored",
        details: {
          commandId,
          result: "ignored",
          reason: "disabled_command"
        }
      });
    });

    return registry;
  }, [activeProjectContext, layout.sidebar.collapsed, sidebarMode, translate]);
  useEffect(
    () =>
      window.pergamum.contextMenu.onCommandSelected((selection) => {
        void executeContextMenuEditCommand(selection, {
          commandRegistry,
          editorIdKind: debugEditorIdKind(activeDocument.id),
          delegatedSurface: delegatedContextSurfaceFromDocument(),
          hasSelection: hasSelectionInDocument(),
          log: logRendererDebugEvent,
          setNativeEditCommandContext: (context) => {
            nativeEditCommandContextRef.current = context;
          },
          clearNativeEditCommandContext: (context) => {
            if (nativeEditCommandContextRef.current === context) {
              nativeEditCommandContextRef.current = null;
            }
          }
        }).catch((error) => {
          logRendererDebugEvent({
            level: "error",
            event: "command.failed",
            details: {
              commandId: selection.commandId,
              operation: "unknown",
              result: "failed",
              statusKey: "status.commandFailed",
              error: rendererDebugErrorInfo(error)
            }
          });
          setStatus({
            key: "status.commandFailed",
            values: { message: errorMessage(error, translate) }
          });
        });
      }),
    [activeDocument.id, commandRegistry, translate]
  );
  const shouldShowWelcome =
    project === null && isOnlyInitialUntitledDocument(openDocumentsState);
  const activeActivityMode = resolveActiveActivityMode(
    sidebarMode,
    layout.sidebar.collapsed,
    project !== null
  );
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

  function setActiveGlossaryEntryCanonicalMatchBoundaryStart(
    matchBoundaryStart: GlossaryFormMatchBoundary
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftCanonicalMatchBoundaryStart(
                editor.draft,
                matchBoundaryStart
              )
            }
          : editor
      )
    );
  }

  function setActiveGlossaryEntryCanonicalMatchBoundaryEnd(
    matchBoundaryEnd: GlossaryFormMatchBoundary
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftCanonicalMatchBoundaryEnd(
                editor.draft,
                matchBoundaryEnd
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

  function setActiveGlossaryEntryFormMatchBoundaryStart(
    formId: string,
    matchBoundaryStart: GlossaryFormMatchBoundary
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftFormMatchBoundaryStart(
                editor.draft,
                formId,
                matchBoundaryStart
              )
            }
          : editor
      )
    );
  }

  function setActiveGlossaryEntryFormMatchBoundaryEnd(
    formId: string,
    matchBoundaryEnd: GlossaryFormMatchBoundary
  ): void {
    setOpenDocumentsState((state) =>
      updateActiveOpenEditor(state, (editor) =>
        editor.kind === "glossaryEntry"
          ? {
              ...editor,
              draft: updateGlossaryEntryDraftFormMatchBoundaryEnd(
                editor.draft,
                formId,
                matchBoundaryEnd
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

  function handleActivityBarModeClick(mode: SidebarMode): void {
    executeUiCommand(workspaceFocusCommandIdForMode(mode));
  }

  function handleChangeMarkdownEditorPreviewRatio(ratio: number): void {
    setLayout((current) =>
      current.markdownEditorPreview.ratio === ratio
        ? current
        : { ...current, markdownEditorPreview: { ratio } }
    );
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
    logRendererDebugEvent({
      level: "debug",
      event: "command.invoked",
      details: {
        commandId: String(commandId)
      }
    });

    void commandRegistry.execute(commandId, ...args).catch((error) => {
      if (error instanceof CommandDisabledError) {
        return;
      }

      logRendererDebugEvent({
        level: "error",
        event: "command.failed",
        details: {
          commandId: String(commandId),
          operation: "unknown",
          result: "failed",
          statusKey: "status.commandFailed",
          error: rendererDebugErrorInfo(error)
        }
      });
      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
    });
  }

  executeUiCommandRef.current = (commandId) => {
    executeUiCommand(commandId);
  };

  async function delegateNativeEditCommand(
    commandId: EditCommandId
  ): Promise<void> {
    const context = nativeEditCommandContextRef.current;

    if (!context || context.commandId !== commandId) {
      return;
    }

    await window.pergamum.edit.delegateNativeEdit(context);
  }

  function handleContextMenuCapture(
    event: ReactMouseEvent<HTMLElement>
  ): void {
    handleEditContextMenuEvent(event, {
      commandRegistry,
      nextInteractionId: nextContextMenuInteractionId,
      editorIdKind: debugEditorIdKind(activeDocument.id),
      hasSelection: () => hasSelectionInDocument(),
      log: logRendererDebugEvent,
      popupEditMenu: window.pergamum.contextMenu.popupEditMenu
    });
  }

  function handleCompositionStartCapture(): void {
    imeCompositionSaveGuard.handleCompositionStart();
    logRendererDebugEvent({
      level: "debug",
      event: "ime.composition.started",
      details: {
        editorIdKind: debugEditorIdKind(activeDocument.id),
        hasPendingSave: imeCompositionSaveGuard.hasPendingSave(),
        hasScheduledSave: imeCompositionSaveGuard.hasScheduledSave()
      }
    });
  }

  function handleCompositionEndCapture(): void {
    imeCompositionSaveGuard.handleCompositionEnd((commandId) => {
      executeUiCommandRef.current(commandId);
    });
    logRendererDebugEvent({
      level: "debug",
      event: "ime.composition.ended",
      details: {
        editorIdKind: debugEditorIdKind(activeDocument.id),
        hasPendingSave: imeCompositionSaveGuard.hasPendingSave(),
        hasScheduledSave: imeCompositionSaveGuard.hasScheduledSave()
      }
    });
  }

  function handleAppBlurCapture(
    event: ReactFocusEvent<HTMLElement>
  ): void {
    const nextTarget = event.relatedTarget;
    const hasRelatedTarget = nextTarget instanceof Node;
    const nextTargetInsideAppShell =
      hasRelatedTarget && event.currentTarget.contains(nextTarget);
    const willClearPendingSave = !hasRelatedTarget || !nextTargetInsideAppShell;

    if (
      imeCompositionSaveGuard.isComposing() ||
      imeCompositionSaveGuard.hasPendingSave() ||
      imeCompositionSaveGuard.hasScheduledSave()
    ) {
      logRendererDebugEvent({
        level: "debug",
        event: "ime.focus.checked",
        details: {
          hasRelatedTarget,
          nextTargetInsideAppShell,
          documentHasFocus: document.hasFocus(),
          willClearPendingSave
        }
      });
    }

    if (willClearPendingSave) {
      imeCompositionSaveGuard.clearPendingSave("focus_left_app_shell");
    }
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
    const editorIdKind = debugEditorIdKind(activeDocument.id);

    if (activeDocument.editor.kind !== "glossaryEntry") {
      logRendererDebugEvent({
        level: "debug",
        event: "save.skipped",
        details: {
          editorIdKind,
          operation: "save",
          result: "ignored",
          reason: "unsupported_editor"
        }
      });
      return;
    }

    const documentIdToSave = activeDocument.id;
    const draftToSave = activeDocument.editor.draft;

    if (!isGlossaryEntryDraftDirty(draftToSave)) {
      logRendererDebugEvent({
        level: "debug",
        event: "save.skipped",
        details: {
          editorIdKind,
          operation: "save",
          result: "ignored",
          reason: "glossary_not_dirty"
        }
      });
      return;
    }

    if (draftToSave.saveState === "saving") {
      logRendererDebugEvent({
        level: "debug",
        event: "save.skipped",
        details: {
          editorIdKind,
          operation: "save",
          result: "ignored",
          reason: "glossary_already_saving"
        }
      });
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
        logRendererDebugEvent({
          level: "debug",
          event: "save.skipped",
          details: {
            editorIdKind,
            operation: "save",
            result: "ignored",
            reason: "project_context_changed"
          }
        });
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
      logRendererDebugEvent({
        level: "debug",
        event: "save.succeeded",
        details: {
          editorIdKind,
          operation: "save",
          result: "succeeded",
          saveTargetKind: "glossaryEntry"
        }
      });
    } catch (error) {
      logRendererDebugEvent({
        level: "error",
        event: "save.failed",
        details: {
          editorIdKind,
          operation: "save",
          result: "failed",
          error: rendererDebugErrorInfo(error)
        }
      });
      if (
        !projectActivationLifetimeRef.current.isProjectActivationCurrent(
          projectGeneration
        )
      ) {
        logRendererDebugEvent({
          level: "debug",
          event: "save.skipped",
          details: {
            editorIdKind,
            operation: "save",
            result: "ignored",
            reason: "project_context_changed"
          }
        });
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

  async function deleteActiveGlossaryEntry(): Promise<void> {
    if (activeDocument.editor.kind !== "glossaryEntry") {
      return;
    }

    const documentIdToDelete = activeDocument.id;
    const entryIdToDelete = activeDocument.editor.draft.entry.id;
    const confirmMessage = translate(
      "glossaryEditor.deleteEntryConfirmMessage"
    );
    const projectGeneration =
      projectActivationLifetimeRef.current.captureProjectActivationGeneration();

    try {
      const result = await window.pergamum.glossary.delete(
        entryIdToDelete,
        confirmMessage
      );

      if (
        !projectActivationLifetimeRef.current.isProjectActivationCurrent(
          projectGeneration
        )
      ) {
        return;
      }

      if (!result.deleted) {
        return;
      }

      editorNavigation.invalidateEditor(documentIdToDelete);
      setOpenDocumentsState((state) =>
        closeOpenEditor(state, documentIdToDelete)
      );
      setGlossaryRefreshToken((token) => token + 1);
      setGlossaryOccurrenceTrackingState((state) =>
        state.kind === "active" && state.entryId === entryIdToDelete
          ? inactiveGlossaryOccurrenceTrackingState
          : state
      );
    } catch (error) {
      if (
        !projectActivationLifetimeRef.current.isProjectActivationCurrent(
          projectGeneration
        )
      ) {
        return;
      }

      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
    }
  }

  function openUtilityWindowOnOccurrencesTab(): void {
    setLayout((current) => ({
      ...current,
      utilityWindow: {
        ...resolveUtilityWindowOpenState(
          current.utilityWindow,
          true,
          editorAreaBodyRef.current?.clientHeight
        ),
        activeTab: "occurrences"
      }
    }));
  }

  function selectUtilityWindowTab(tab: UtilityWindowTabId): void {
    setLayout((current) => ({
      ...current,
      utilityWindow: {
        ...current.utilityWindow,
        activeTab: tab
      }
    }));
  }

  async function navigateGlossaryOccurrence(
    entryId: GlossaryEntryId,
    direction: GlossaryOccurrenceDirection
  ): Promise<boolean> {
    if (
      activeDocument.editor.kind !== "glossaryEntry" ||
      activeDocument.editor.draft.entry.id !== entryId
    ) {
      return false;
    }

    const entry = activeDocument.editor.draft.entry;
    const targetEditorId = lastActiveMarkdownEditorIdRef.current;
    const targetOpenDocument = targetEditorId
      ? findOpenDocument(openDocumentsState, targetEditorId)
      : null;
    const targetDocument =
      targetOpenDocument && targetOpenDocument.editor.kind === "markdown"
        ? {
            editorId: targetOpenDocument.id,
            content: currentDocumentContent(targetOpenDocument.editor.document)
          }
        : null;

    let outcome: GlossaryOccurrenceTrackingOutcome;

    try {
      outcome = startGlossaryOccurrenceTracking({
        currentSession: glossaryOccurrenceTrackingState,
        entry,
        entryLabel: canonicalGlossarySurface(entry),
        targetDocument,
        direction
      });
    } catch (error) {
      logRendererDebugEvent({
        level: "error",
        event: "glossary.occurrences.scan.failed",
        details: {
          editorIdKind: "glossaryEntry",
          operation: "scan",
          result: "failed",
          statusKey: "status.commandFailed",
          error: rendererDebugErrorInfo(error)
        }
      });
      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
      return false;
    }

    switch (outcome.kind) {
      case "noTargetDocument":
        setStatus({ key: "status.glossaryOccurrenceNoActiveDocument" });
        return false;
      case "noOccurrences":
        setStatus({ key: "status.glossaryOccurrenceNotFound" });
        return false;
      case "tracking": {
        const didOpen = await editorNavigation.openEditor(
          outcome.session.targetMarkdownEditorId,
          { history: "skip" }
        );

        if (!didOpen) {
          setStatus({ key: "status.glossaryOccurrenceNoActiveDocument" });
          return false;
        }

        setGlossaryOccurrenceTrackingState(outcome.session);
        setPendingMarkdownSelection(outcome.range);
        openUtilityWindowOnOccurrencesTab();
        return true;
      }
    }
  }

  navigateGlossaryOccurrenceRef.current = navigateGlossaryOccurrence;

  function resolveGlossaryOccurrenceTrackingSessionContext(): ResolveGlossaryOccurrenceTrackingSessionContext {
    return {
      openDocumentsState,
      getGlossaryEntryById: window.pergamum.glossary.getById
    };
  }

  function applyGlossaryOccurrenceTrackingResolutionFailure(
    kind: Exclude<ResolveGlossaryOccurrenceTrackingSessionResult["kind"], "resolved">
  ): void {
    if (kind === "inactive") {
      return;
    }

    setGlossaryOccurrenceTrackingState(inactiveGlossaryOccurrenceTrackingState);
    setStatus({
      key:
        kind === "entryMissing"
          ? "status.glossaryOccurrenceEntryNotFound"
          : "status.glossaryOccurrenceNoActiveDocument"
    });
  }

  async function navigateGlossaryOccurrenceTrackingSession(
    direction: GlossaryOccurrenceDirection
  ): Promise<boolean> {
    const resolved = await resolveGlossaryOccurrenceTrackingSession(
      glossaryOccurrenceTrackingState,
      resolveGlossaryOccurrenceTrackingSessionContext()
    );

    if (resolved.kind !== "resolved") {
      applyGlossaryOccurrenceTrackingResolutionFailure(resolved.kind);
      return false;
    }

    let outcome: NavigateGlossaryOccurrenceTrackingOutcome;

    try {
      outcome = navigateGlossaryOccurrenceTracking({
        session: resolved.session,
        content: resolved.targetContent,
        direction
      });
    } catch (error) {
      logRendererDebugEvent({
        level: "error",
        event: "glossary.occurrences.scan.failed",
        details: {
          editorIdKind: resolved.session.targetMarkdownEditorId.kind,
          operation: "scan",
          result: "failed",
          statusKey: "status.commandFailed",
          error: rendererDebugErrorInfo(error)
        }
      });
      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
      return false;
    }

    if (outcome.kind === "noOccurrences") {
      setGlossaryOccurrenceTrackingState(
        inactiveGlossaryOccurrenceTrackingState
      );
      setStatus({ key: "status.glossaryOccurrenceNotFound" });
      return false;
    }

    const didOpen = await editorNavigation.openEditor(
      outcome.session.targetMarkdownEditorId,
      { history: "skip" }
    );

    if (!didOpen) {
      setGlossaryOccurrenceTrackingState(
        inactiveGlossaryOccurrenceTrackingState
      );
      setStatus({ key: "status.glossaryOccurrenceNoActiveDocument" });
      return false;
    }

    setGlossaryOccurrenceTrackingState(outcome.session);
    setPendingMarkdownSelection(outcome.range);
    return true;
  }

  navigateGlossaryOccurrenceTrackingSessionRef.current =
    navigateGlossaryOccurrenceTrackingSession;

  async function openTrackedGlossaryEntry(): Promise<boolean> {
    const resolved = await resolveGlossaryOccurrenceTrackingSession(
      glossaryOccurrenceTrackingState,
      resolveGlossaryOccurrenceTrackingSessionContext()
    );

    if (resolved.kind !== "resolved") {
      applyGlossaryOccurrenceTrackingResolutionFailure(resolved.kind);
      return false;
    }

    const entryId = resolved.session.entryId;

    try {
      const didOpen = await commandRegistry.execute(
        glossaryCommandIds.openEntry,
        entryId
      );

      if (!didOpen) {
        setGlossaryOccurrenceTrackingState(
          inactiveGlossaryOccurrenceTrackingState
        );
        setStatus({ key: "status.glossaryOccurrenceEntryNotFound" });
      }

      return didOpen;
    } catch (error) {
      setGlossaryOccurrenceTrackingState(
        inactiveGlossaryOccurrenceTrackingState
      );
      setStatus({
        key: "status.commandFailed",
        values: { message: errorMessage(error, translate) }
      });
      return false;
    }
  }

  openTrackedGlossaryEntryRef.current = openTrackedGlossaryEntry;

  function closeGlossaryOccurrenceTracking(): boolean {
    if (glossaryOccurrenceTrackingState.kind !== "active") {
      return false;
    }

    setGlossaryOccurrenceTrackingState(inactiveGlossaryOccurrenceTrackingState);
    return true;
  }

  closeGlossaryOccurrenceTrackingRef.current = closeGlossaryOccurrenceTracking;

  async function saveFile(): Promise<void> {
    const editorIdKind = debugEditorIdKind(activeDocument.id);

    logRendererDebugEvent({
      level: "debug",
      event: "save.requested",
      details: {
        editorIdKind,
        operation: "save",
        isDirty,
        canSave
      }
    });

    await saveInFlightGuard.run(
      async () => {
        const saveTargetKind = debugSaveTargetKind(activeDocument.editor);

        logRendererDebugEvent({
          level: "debug",
          event: "save.started",
          details: {
            editorIdKind,
            operation: "save",
            saveTargetKind
          }
        });

        if (activeDocument.editor.kind === "glossaryEntry") {
          await saveGlossaryEntry();
          return;
        }

        try {
          if (activeDocument.editor.kind !== "markdown") {
            logRendererDebugEvent({
              level: "debug",
              event: "save.skipped",
              details: {
                editorIdKind,
                operation: "save",
                result: "ignored",
                reason: "unsupported_editor"
              }
            });
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
            logRendererDebugEvent({
              level: "debug",
              event: "save.succeeded",
              details: {
                editorIdKind,
                operation: "save",
                result: "succeeded",
                saveTargetKind: "projectDocument"
              }
            });
            return;
          }

          const result = await window.pergamum.files.saveMarkdown(
            standaloneSavePath(documentToSave),
            documentToSave.content
          );

          if (!result) {
            setStatus({ key: "status.saveCanceled" });
            logRendererDebugEvent({
              level: "debug",
              event: "save.skipped",
              details: {
                editorIdKind,
                operation: "save",
                result: "cancelled",
                reason: "standalone_save_canceled"
              }
            });
            return;
          }

          const savedDocument = applyStandaloneSaveResult(
            documentToSave,
            result
          );
          const didCollide = replaceSavedDocument(
            documentIdToSave,
            savedDocument
          );

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
          logRendererDebugEvent({
            level: "debug",
            event: "save.succeeded",
            details: {
              editorIdKind,
              operation: "save",
              result: "succeeded",
              saveTargetKind: "standaloneMarkdown"
            }
          });
        } catch (error) {
          logRendererDebugEvent({
            level: "error",
            event: "save.failed",
            details: {
              editorIdKind,
              operation: "save",
              result: "failed",
              error: rendererDebugErrorInfo(error)
            }
          });
          setStatus({
            key: "status.saveFailed",
            values: { message: errorMessage(error, translate) }
          });
        }
      },
      () => {
        logRendererDebugEvent({
          level: "debug",
          event: "save.in_flight.ignored",
          details: {
            editorIdKind: debugEditorIdKind(activeDocument.id),
            operation: "save",
            result: "ignored"
          }
        });
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
  ): Promise<StatusMessage | null> {
    const activationToken =
      projectActivationLifetimeRef.current.startProjectContextSwitch();
    const openedProjectContext: ActiveProjectContext = {
      rootPath: openedProject.rootPath
    };

    editorNavigation.reset();
    lastActiveMarkdownEditorIdRef.current = null;
    setPendingMarkdownSelection(null);
    setGlossaryOccurrenceTrackingState(inactiveGlossaryOccurrenceTrackingState);
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

  openProjectCommandRef.current = openProject;
  openMarkdownDocumentCommandRef.current = openFile;
  saveCurrentDocumentCommandRef.current = saveFile;
  toggleRecentProjectsCommandRef.current = () => {
    setIsRecentProjectsOpen((isOpen) => !isOpen);
  };
  canSaveCurrentDocumentCommandRef.current = () => canSave;

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
    <main
      className="appShell"
      onCompositionStartCapture={handleCompositionStartCapture}
      onCompositionEndCapture={handleCompositionEndCapture}
      onBlurCapture={handleAppBlurCapture}
      onContextMenuCapture={handleContextMenuCapture}
    >
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
        <button
          type="button"
          onClick={() => executeUiCommand(applicationCommandIds.openProject)}
        >
          {translate("toolbar.openProject")}
        </button>
        <button
          type="button"
          onClick={() =>
            executeUiCommand(editorCommandIds.openMarkdownDocument)
          }
        >
          {translate("common.open")}
        </button>
        <button
          type="button"
          onClick={() => executeUiCommand(editorCommandIds.saveDocument)}
          disabled={
            !commandRegistry.isEnabledForContext(
              editorCommandIds.saveDocument,
              commandContext
            )
          }
        >
          {translate("common.save")}
        </button>
        <button
          type="button"
          onClick={() =>
            executeUiCommand(applicationCommandIds.toggleRecentProjects)
          }
        >
          {translate("toolbar.recentProjects")}
        </button>
      </header>

      <section className="appBody">
        <ActivityBar
          activeMode={activeActivityMode}
          isProjectSettingsOpen={isSettingsOpen}
          translate={translate}
          onSelectMode={handleActivityBarModeClick}
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
            <section className="mainArea" ref={mainAreaRef}>
              {!layout.sidebar.collapsed ? (
                <>
                  <div
                    className="workbenchSidebar"
                    style={{ width: layout.sidebar.width }}
                  >
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
                  </div>
                  <div
                    className="workbenchSidebarResizeHandle"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={translate("workbench.sidebarResizeHandle")}
                    onPointerDown={sidebarResizeDrag.onPointerDown}
                    onPointerMove={sidebarResizeDrag.onPointerMove}
                    onPointerUp={sidebarResizeDrag.onPointerUp}
                    onPointerCancel={sidebarResizeDrag.onPointerCancel}
                  />
                </>
              ) : null}

              <section className="editorArea">
                <DocumentTabBar
                  tabs={tabs}
                  activeDocumentId={openDocumentsState.activeDocumentId}
                  translate={translate}
                  onSelectDocument={activateDocument}
                  isUtilityWindowOpen={layout.utilityWindow.open}
                  onToggleUtilityWindow={() =>
                    executeUiCommand(utilityWindowCommandIds.toggle)
                  }
                />

                <section className="editorAreaBody" ref={editorAreaBodyRef}>
                  <EditorSurface
                    editor={currentEditor}
                    projectRootPath={project?.rootPath ?? null}
                    glossaryRefreshToken={glossaryRefreshToken}
                    translate={translate}
                    markdownEditorPreviewRatio={
                      layout.markdownEditorPreview.ratio
                    }
                    onChangeMarkdownEditorPreviewRatio={
                      handleChangeMarkdownEditorPreviewRatio
                    }
                    onChangeMarkdownContent={setActiveDocumentContent}
                    onChangeGlossaryEntryKind={setActiveGlossaryEntryKind}
                    onChangeGlossaryEntryDescription={
                      setActiveGlossaryEntryDescription
                    }
                    onChangeGlossaryEntryCanonicalSurface={
                      setActiveGlossaryEntryCanonicalSurface
                    }
                    onChangeGlossaryEntryCanonicalMatchBoundaryStart={
                      setActiveGlossaryEntryCanonicalMatchBoundaryStart
                    }
                    onChangeGlossaryEntryCanonicalMatchBoundaryEnd={
                      setActiveGlossaryEntryCanonicalMatchBoundaryEnd
                    }
                    onAddGlossaryEntryForm={addActiveGlossaryEntryForm}
                    onChangeGlossaryEntryFormSurface={
                      setActiveGlossaryEntryFormSurface
                    }
                    onChangeGlossaryEntryFormWarningPolicy={
                      setActiveGlossaryEntryFormWarningPolicy
                    }
                    onChangeGlossaryEntryFormMatchBoundaryStart={
                      setActiveGlossaryEntryFormMatchBoundaryStart
                    }
                    onChangeGlossaryEntryFormMatchBoundaryEnd={
                      setActiveGlossaryEntryFormMatchBoundaryEnd
                    }
                    onDeleteGlossaryEntryForm={deleteActiveGlossaryEntryForm}
                    onDeleteGlossaryEntry={() => {
                      void deleteActiveGlossaryEntry();
                    }}
                    onNavigateToPreviousGlossaryOccurrence={() => {
                      if (currentEditor.kind === "glossaryEntry") {
                        executeUiCommand(
                          glossaryCommandIds.previousOccurrence,
                          currentEditor.draft.entry.id
                        );
                      }
                    }}
                    onNavigateToNextGlossaryOccurrence={() => {
                      if (currentEditor.kind === "glossaryEntry") {
                        executeUiCommand(
                          glossaryCommandIds.nextOccurrence,
                          currentEditor.draft.entry.id
                        );
                      }
                    }}
                    pendingMarkdownSelection={pendingMarkdownSelection}
                    onPendingMarkdownSelectionApplied={() => {
                      setPendingMarkdownSelection(null);
                    }}
                  />

                  {layout.utilityWindow.open ? (
                    <>
                      <div
                        className="utilityWindowResizeHandle"
                        role="separator"
                        aria-orientation="horizontal"
                        aria-label={translate(
                          "workbench.utilityWindowResizeHandle"
                        )}
                        onPointerDown={utilityWindowResizeDrag.onPointerDown}
                        onPointerMove={utilityWindowResizeDrag.onPointerMove}
                        onPointerUp={utilityWindowResizeDrag.onPointerUp}
                        onPointerCancel={
                          utilityWindowResizeDrag.onPointerCancel
                        }
                      />
                      <UtilityWindow
                        activeTab={layout.utilityWindow.activeTab}
                        height={layout.utilityWindow.height}
                        translate={translate}
                        onSelectTab={selectUtilityWindowTab}
                        onClose={() =>
                          executeUiCommand(utilityWindowCommandIds.close)
                        }
                      >
                        {layout.utilityWindow.activeTab === "debugLog" ? (
                          <DebugLogPanel translate={translate} />
                        ) : (
                          <GlossaryOccurrencesPanel
                            session={glossaryOccurrenceTrackingState}
                            translate={translate}
                            onNavigatePrevious={() =>
                              executeUiCommand(
                                glossaryOccurrencesCommandIds.previous
                              )
                            }
                            onNavigateNext={() =>
                              executeUiCommand(
                                glossaryOccurrencesCommandIds.next
                              )
                            }
                            onOpenEntry={() =>
                              executeUiCommand(
                                glossaryOccurrencesCommandIds.openEntry
                              )
                            }
                            onCloseTracking={() =>
                              executeUiCommand(
                                glossaryOccurrencesCommandIds.closeTracking
                              )
                            }
                          />
                        )}
                      </UtilityWindow>
                    </>
                  ) : null}
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

      {isCommandPaletteOpen ? (
        <CommandPalette
          commandRegistry={commandRegistry}
          translate={translate}
          isComposing={imeCompositionSaveGuard.isComposing}
          commandContext={commandContext}
          onExecuteCommand={(commandId) => {
            executeUiCommand(commandId);
            setIsCommandPaletteOpen(false);
          }}
          onBlockedCommand={(commandId) => {
            logRendererDebugEvent({
              level: "debug",
              event: "command.blocked",
              details: {
                commandId: String(commandId),
                source: "commandPalette",
                reason: "disabled_command"
              }
            });
          }}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      ) : null}
    </main>
  );
}
