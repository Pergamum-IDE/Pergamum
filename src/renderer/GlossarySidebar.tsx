import { useEffect, useRef, useState } from "react";
import {
  glossaryEntryKinds,
  type CreateGlossaryEntryInput,
  type GlossaryEntryId,
  type GlossaryEntryKind
} from "../shared/glossary";
import type { Translate } from "../shared/i18n";
import {
  canonicalGlossarySurface,
  createErrorGlossarySidebarState,
  createLoadedGlossarySidebarState,
  createLoadingGlossarySidebarState,
  createNoProjectGlossarySidebarState,
  loadGlossaryEntries,
  shouldApplyGlossaryLoadResult,
  type GlossarySidebarState
} from "./glossarySidebarState";

interface GlossarySidebarProps {
  projectRootPath: string | null;
  highlightedEntryId: GlossaryEntryId | null;
  refreshToken: number;
  translate: Translate;
  onActivateEntry: (entryId: GlossaryEntryId) => void;
  onCreateEntry: (input: CreateGlossaryEntryInput) => Promise<boolean>;
}

export interface GlossaryCreateFormState {
  isOpen: boolean;
  canonicalSurface: string;
  kind: GlossaryEntryKind;
  isSubmitting: boolean;
  error: string | null;
}

export const initialGlossaryCreateFormState: GlossaryCreateFormState = {
  isOpen: false,
  canonicalSurface: "",
  kind: glossaryEntryKinds[0],
  isSubmitting: false,
  error: null
};

interface GlossarySidebarViewProps {
  state: GlossarySidebarState;
  highlightedEntryId: GlossaryEntryId | null;
  translate: Translate;
  onSelectEntry: (entryId: GlossaryEntryId) => void;
  onActivateEntry: (entryId: GlossaryEntryId) => void;
  canCreateEntry: boolean;
  createForm: GlossaryCreateFormState;
  onToggleCreateForm: () => void;
  onChangeCreateSurface: (surface: string) => void;
  onChangeCreateKind: (kind: GlossaryEntryKind) => void;
  onSubmitCreateForm: () => void;
}

function initialGlossarySidebarState(
  projectRootPath: string | null
): GlossarySidebarState {
  return projectRootPath
    ? createLoadingGlossarySidebarState(null)
    : createNoProjectGlossarySidebarState();
}

export function GlossarySidebarView({
  state,
  highlightedEntryId,
  translate,
  onSelectEntry,
  onActivateEntry,
  canCreateEntry,
  createForm,
  onToggleCreateForm,
  onChangeCreateSurface,
  onChangeCreateKind,
  onSubmitCreateForm
}: GlossarySidebarViewProps): JSX.Element {
  let content: JSX.Element;

  switch (state.status) {
    case "noProject":
      content = (
        <div className="workspacePlaceholder">
          {translate("glossary.noProject")}
        </div>
      );
      break;
    case "loading":
      content = (
        <div className="workspacePlaceholder" role="status">
          {translate("glossary.loading")}
        </div>
      );
      break;
    case "error":
      content = (
        <div className="workspacePlaceholder" role="alert">
          {translate("glossary.loadError")}
        </div>
      );
      break;
    case "loaded":
      content =
        state.entries.length === 0 ? (
          <div className="workspacePlaceholder">
            {translate("glossary.empty")}
          </div>
        ) : (
          <div
            className="workspaceSidebarList"
            aria-label={translate("glossary.entries")}
          >
            {state.entries.map((entry) => {
              const label = canonicalGlossarySurface(entry);
              const isHighlighted = highlightedEntryId === entry.id;
              const isSelected = state.selectedEntryId === entry.id;

              return (
                <button
                  type="button"
                  key={entry.id}
                  className={
                    [
                      "workspaceSidebarItem",
                      isHighlighted ? "isActive" : null,
                      isSelected ? "isSelected" : null
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  aria-current={isHighlighted ? "page" : undefined}
                  data-selected={isSelected ? "true" : undefined}
                  title={label}
                  onClick={() => {
                    onSelectEntry(entry.id);
                    onActivateEntry(entry.id);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      break;
  }

  return (
    <aside
      className="workspaceSidebarPanel"
      aria-label={translate("glossary.sidebarTitle")}
    >
      <div className="sidebarHeader">
        {translate("glossary.sidebarTitle")}
      </div>
      <div className="workspacePlaceholderList">
        {content}
      </div>
      {createForm.isOpen ? (
        <form
          className="glossaryCreateForm"
          aria-label={translate("glossary.create.title")}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitCreateForm();
          }}
        >
          <label className="glossaryCreateFormField">
            <span>{translate("glossary.create.surfaceLabel")}</span>
            <input
              type="text"
              value={createForm.canonicalSurface}
              disabled={createForm.isSubmitting}
              onChange={(event) => onChangeCreateSurface(event.target.value)}
            />
          </label>
          <label className="glossaryCreateFormField">
            <span>{translate("glossary.create.kindLabel")}</span>
            <select
              value={createForm.kind}
              disabled={createForm.isSubmitting}
              onChange={(event) =>
                onChangeCreateKind(event.target.value as GlossaryEntryKind)
              }
            >
              {glossaryEntryKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          {createForm.error ? (
            <p className="glossaryCreateFormError" role="alert">
              {createForm.error}
            </p>
          ) : null}
          <div className="glossaryCreateFormActions">
            <button
              type="button"
              onClick={onToggleCreateForm}
              disabled={createForm.isSubmitting}
            >
              {translate("glossary.create.cancel")}
            </button>
            <button
              type="submit"
              disabled={
                createForm.isSubmitting ||
                createForm.canonicalSurface.trim().length === 0
              }
            >
              {translate("glossary.create.submit")}
            </button>
          </div>
        </form>
      ) : null}
      <div className="workspaceSidebarActions">
        <button
          type="button"
          className="workspaceSidebarButton"
          disabled={!canCreateEntry}
          onClick={onToggleCreateForm}
        >
          {translate("glossary.add")}
        </button>
      </div>
    </aside>
  );
}

export function GlossarySidebar({
  projectRootPath,
  highlightedEntryId,
  refreshToken,
  translate,
  onActivateEntry,
  onCreateEntry
}: GlossarySidebarProps): JSX.Element {
  const [state, setState] = useState<GlossarySidebarState>(() =>
    initialGlossarySidebarState(projectRootPath)
  );
  const [createForm, setCreateForm] = useState<GlossaryCreateFormState>(
    initialGlossaryCreateFormState
  );
  const projectRootPathRef = useRef<string | null>(projectRootPath);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    const didProjectChange = projectRootPathRef.current !== projectRootPath;
    projectRootPathRef.current = projectRootPath;

    if (!projectRootPath) {
      setState(createNoProjectGlossarySidebarState());
      return;
    }

    setState((currentState) =>
      createLoadingGlossarySidebarState(
        didProjectChange ? null : currentState.selectedEntryId
      )
    );

    let isActive = true;

    void loadGlossaryEntries()
      .then((entries) => {
        if (
          !isActive ||
          !shouldApplyGlossaryLoadResult(
            loadRequestIdRef.current,
            requestId
          )
        ) {
          return;
        }

        setState((currentState) =>
          createLoadedGlossarySidebarState(
            entries,
            didProjectChange ? null : currentState.selectedEntryId
          )
        );
      })
      .catch(() => {
        if (
          !isActive ||
          !shouldApplyGlossaryLoadResult(
            loadRequestIdRef.current,
            requestId
          )
        ) {
          return;
        }

        setState((currentState) =>
          createErrorGlossarySidebarState(
            didProjectChange ? null : currentState.selectedEntryId
          )
        );
      });

    return () => {
      isActive = false;
    };
  }, [projectRootPath, refreshToken]);

  useEffect(() => {
    if (!projectRootPath) {
      setCreateForm(initialGlossaryCreateFormState);
    }
  }, [projectRootPath]);

  async function submitCreateForm(): Promise<void> {
    const canonicalSurface = createForm.canonicalSurface.trim();

    if (canonicalSurface.length === 0 || createForm.isSubmitting) {
      return;
    }

    setCreateForm((currentForm) => ({
      ...currentForm,
      isSubmitting: true,
      error: null
    }));

    try {
      const didOpen = await onCreateEntry({
        kind: createForm.kind,
        canonicalSurface,
        description: ""
      });

      if (didOpen) {
        setCreateForm(initialGlossaryCreateFormState);
      } else {
        setCreateForm((currentForm) => ({
          ...currentForm,
          isSubmitting: false,
          error: translate("glossary.create.error")
        }));
      }
    } catch {
      setCreateForm((currentForm) => ({
        ...currentForm,
        isSubmitting: false,
        error: translate("glossary.create.error")
      }));
    }
  }

  return (
    <GlossarySidebarView
      state={state}
      highlightedEntryId={highlightedEntryId}
      translate={translate}
      onSelectEntry={(entryId) =>
        setState((currentState) => ({
          ...currentState,
          selectedEntryId: entryId
        }))
      }
      onActivateEntry={onActivateEntry}
      canCreateEntry={projectRootPath !== null}
      createForm={createForm}
      onToggleCreateForm={() =>
        setCreateForm((currentForm) =>
          currentForm.isOpen
            ? initialGlossaryCreateFormState
            : { ...initialGlossaryCreateFormState, isOpen: true }
        )
      }
      onChangeCreateSurface={(canonicalSurface) =>
        setCreateForm((currentForm) => ({
          ...currentForm,
          canonicalSurface
        }))
      }
      onChangeCreateKind={(kind) =>
        setCreateForm((currentForm) => ({ ...currentForm, kind }))
      }
      onSubmitCreateForm={() => {
        void submitCreateForm();
      }}
    />
  );
}
