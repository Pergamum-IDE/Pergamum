import { useEffect, useRef, useState } from "react";
import type { GlossaryEntryId } from "../shared/glossary";
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
  translate: Translate;
  onActivateEntry: (entryId: GlossaryEntryId) => void;
}

interface GlossarySidebarViewProps {
  state: GlossarySidebarState;
  highlightedEntryId: GlossaryEntryId | null;
  translate: Translate;
  onSelectEntry: (entryId: GlossaryEntryId) => void;
  onActivateEntry: (entryId: GlossaryEntryId) => void;
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
  onActivateEntry
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
      <div className="workspaceSidebarActions">
        <button type="button" className="workspaceSidebarButton" disabled>
          {translate("glossary.add")}
        </button>
      </div>
    </aside>
  );
}

export function GlossarySidebar({
  projectRootPath,
  highlightedEntryId,
  translate,
  onActivateEntry
}: GlossarySidebarProps): JSX.Element {
  const [state, setState] = useState<GlossarySidebarState>(() =>
    initialGlossarySidebarState(projectRootPath)
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
  }, [projectRootPath]);

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
    />
  );
}
