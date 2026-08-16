import { useEffect, useRef, useState } from "react";
import type {
  GlossaryEntryKind,
  GlossaryFormMatchBoundary,
  GlossaryFormRelation,
  GlossaryWarningPolicy
} from "../shared/glossary";
import type { Translate } from "../shared/i18n";
import {
  currentDocumentContent,
  type CurrentDocument
} from "./currentDocument";
import type { CurrentEditor } from "./currentEditor";
import type { GlossaryOccurrenceRange } from "./glossaryOccurrenceNavigation";
import { GlossaryEditor } from "./GlossaryEditor";
import { GlossaryPreviewDecorator } from "./GlossaryPreviewDecorator";
import { MarkdownEditor } from "./MarkdownEditor";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";
import { useGlossaryEntriesForMatching } from "./useGlossaryEntriesForMatching";
import { useHorizontalDrag } from "./useHorizontalDrag";
import { clampMarkdownEditorPreviewRatio } from "./workbenchLayout";

const NARROW_MARKDOWN_WORKSPACE_MEDIA_QUERY = "(max-width: 760px)";

function useIsNarrowMarkdownWorkspace(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => window.matchMedia(NARROW_MARKDOWN_WORKSPACE_MEDIA_QUERY).matches
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(
      NARROW_MARKDOWN_WORKSPACE_MEDIA_QUERY
    );

    function handleChange(event: MediaQueryListEvent): void {
      setIsNarrow(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return isNarrow;
}

interface EditorSurfaceProps {
  editor: CurrentEditor;
  projectRootPath: string | null;
  glossaryRefreshToken: number;
  translate: Translate;
  markdownEditorPreviewRatio: number;
  onChangeMarkdownEditorPreviewRatio: (ratio: number) => void;
  onChangeMarkdownContent: (content: string) => void;
  onChangeGlossaryEntryKind: (kind: GlossaryEntryKind) => void;
  onChangeGlossaryEntryDescription: (description: string) => void;
  onChangeGlossaryEntryCanonicalSurface: (surface: string) => void;
  onChangeGlossaryEntryCanonicalMatchBoundaryStart: (
    matchBoundaryStart: GlossaryFormMatchBoundary
  ) => void;
  onChangeGlossaryEntryCanonicalMatchBoundaryEnd: (
    matchBoundaryEnd: GlossaryFormMatchBoundary
  ) => void;
  onAddGlossaryEntryForm: (relation: GlossaryFormRelation) => void;
  onChangeGlossaryEntryFormSurface: (
    formId: string,
    surface: string
  ) => void;
  onChangeGlossaryEntryFormWarningPolicy: (
    formId: string,
    warningPolicy: GlossaryWarningPolicy
  ) => void;
  onChangeGlossaryEntryFormMatchBoundaryStart: (
    formId: string,
    matchBoundaryStart: GlossaryFormMatchBoundary
  ) => void;
  onChangeGlossaryEntryFormMatchBoundaryEnd: (
    formId: string,
    matchBoundaryEnd: GlossaryFormMatchBoundary
  ) => void;
  onDeleteGlossaryEntryForm: (formId: string) => void;
  onDeleteGlossaryEntry: () => void;
  onNavigateToPreviousGlossaryOccurrence: () => void;
  onNavigateToNextGlossaryOccurrence: () => void;
  pendingMarkdownSelection: GlossaryOccurrenceRange | null;
  onPendingMarkdownSelectionApplied: () => void;
}

export function EditorSurface({
  editor,
  projectRootPath,
  glossaryRefreshToken,
  translate,
  markdownEditorPreviewRatio,
  onChangeMarkdownEditorPreviewRatio,
  onChangeMarkdownContent,
  onChangeGlossaryEntryKind,
  onChangeGlossaryEntryDescription,
  onChangeGlossaryEntryCanonicalSurface,
  onChangeGlossaryEntryCanonicalMatchBoundaryStart,
  onChangeGlossaryEntryCanonicalMatchBoundaryEnd,
  onAddGlossaryEntryForm,
  onChangeGlossaryEntryFormSurface,
  onChangeGlossaryEntryFormWarningPolicy,
  onChangeGlossaryEntryFormMatchBoundaryStart,
  onChangeGlossaryEntryFormMatchBoundaryEnd,
  onDeleteGlossaryEntryForm,
  onDeleteGlossaryEntry,
  onNavigateToPreviousGlossaryOccurrence,
  onNavigateToNextGlossaryOccurrence,
  pendingMarkdownSelection,
  onPendingMarkdownSelectionApplied
}: EditorSurfaceProps): JSX.Element {
  switch (editor.kind) {
    case "markdown":
      return (
        <MarkdownEditorSurface
          document={editor.document}
          projectRootPath={projectRootPath}
          glossaryRefreshToken={glossaryRefreshToken}
          translate={translate}
          onChangeMarkdownContent={onChangeMarkdownContent}
          pendingSelection={pendingMarkdownSelection}
          onPendingSelectionApplied={onPendingMarkdownSelectionApplied}
          ratio={markdownEditorPreviewRatio}
          onChangeRatio={onChangeMarkdownEditorPreviewRatio}
        />
      );
    case "glossaryEntry":
      return (
        <GlossaryEditor
          draft={editor.draft}
          translate={translate}
          onChangeKind={onChangeGlossaryEntryKind}
          onChangeDescription={onChangeGlossaryEntryDescription}
          onChangeCanonicalSurface={onChangeGlossaryEntryCanonicalSurface}
          onChangeCanonicalMatchBoundaryStart={
            onChangeGlossaryEntryCanonicalMatchBoundaryStart
          }
          onChangeCanonicalMatchBoundaryEnd={
            onChangeGlossaryEntryCanonicalMatchBoundaryEnd
          }
          onAddForm={onAddGlossaryEntryForm}
          onChangeFormSurface={onChangeGlossaryEntryFormSurface}
          onChangeFormWarningPolicy={
            onChangeGlossaryEntryFormWarningPolicy
          }
          onChangeFormMatchBoundaryStart={
            onChangeGlossaryEntryFormMatchBoundaryStart
          }
          onChangeFormMatchBoundaryEnd={
            onChangeGlossaryEntryFormMatchBoundaryEnd
          }
          onDeleteForm={onDeleteGlossaryEntryForm}
          onDeleteEntry={onDeleteGlossaryEntry}
          onNavigateToPreviousOccurrence={
            onNavigateToPreviousGlossaryOccurrence
          }
          onNavigateToNextOccurrence={onNavigateToNextGlossaryOccurrence}
        />
      );
  }
}

interface MarkdownEditorSurfaceProps {
  document: CurrentDocument;
  projectRootPath: string | null;
  glossaryRefreshToken: number;
  translate: Translate;
  onChangeMarkdownContent: (content: string) => void;
  pendingSelection: GlossaryOccurrenceRange | null;
  onPendingSelectionApplied: () => void;
  ratio: number;
  onChangeRatio: (ratio: number) => void;
}

function MarkdownEditorSurface({
  document,
  projectRootPath,
  glossaryRefreshToken,
  translate,
  onChangeMarkdownContent,
  pendingSelection,
  onPendingSelectionApplied,
  ratio,
  onChangeRatio
}: MarkdownEditorSurfaceProps): JSX.Element {
  const content = currentDocumentContent(document);
  const previewHtml = markdownPreviewRenderer.render(content);
  const { entries, surfaceIndex } = useGlossaryEntriesForMatching(
    projectRootPath,
    glossaryRefreshToken
  );
  const isNarrow = useIsNarrowMarkdownWorkspace();
  const workspaceRef = useRef<HTMLElement | null>(null);
  const ratioAtDragStartRef = useRef(ratio);
  const ratioDrag = useHorizontalDrag({
    onDragStart: () => {
      ratioAtDragStartRef.current = ratio;
    },
    onDragMove: (deltaX) => {
      const containerWidth = workspaceRef.current?.clientWidth;

      if (!containerWidth) {
        return;
      }

      const nextRatio = clampMarkdownEditorPreviewRatio(
        ratioAtDragStartRef.current + deltaX / containerWidth,
        containerWidth
      );

      onChangeRatio(nextRatio);
    }
  });

  useEffect(() => {
    function handleWindowResize(): void {
      const containerWidth = workspaceRef.current?.clientWidth;

      if (!containerWidth) {
        return;
      }

      const clampedRatio = clampMarkdownEditorPreviewRatio(
        ratio,
        containerWidth
      );

      if (clampedRatio !== ratio) {
        onChangeRatio(clampedRatio);
      }
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [ratio, onChangeRatio]);

  return (
    <section
      className="workspace"
      aria-label={translate("workspace.markdownWorkspace")}
      ref={workspaceRef}
      style={
        isNarrow
          ? undefined
          : {
              gridTemplateColumns: `minmax(0, ${ratio}fr) 6px minmax(0, ${1 - ratio}fr)`
            }
      }
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
          onChange={onChangeMarkdownContent}
          pendingSelection={pendingSelection}
          onPendingSelectionApplied={onPendingSelectionApplied}
          contextSurface="markdownEditor"
        />
      </section>

      {!isNarrow ? (
        <div
          className="markdownWorkspaceResizeHandle"
          role="separator"
          aria-orientation="vertical"
          aria-label={translate("workbench.markdownEditorPreviewResizeHandle")}
          onPointerDown={ratioDrag.onPointerDown}
          onPointerMove={ratioDrag.onPointerMove}
          onPointerUp={ratioDrag.onPointerUp}
          onPointerCancel={ratioDrag.onPointerCancel}
        />
      ) : null}

      <section
        className="pane"
        aria-label={translate("workspace.markdownPreview")}
      >
        <div className="paneHeader">
          {translate("workspace.preview")}
        </div>
        <GlossaryPreviewDecorator
          previewHtml={previewHtml}
          entries={entries}
          surfaceIndex={surfaceIndex}
        />
      </section>
    </section>
  );
}
