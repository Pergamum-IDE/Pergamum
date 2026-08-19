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
  /** In-flight document-open correlation id (#152), or null when idle. */
  documentOpenId: string | null;
  /** Fired once after this document's preview has rendered, with its duration. */
  onDocumentOpenPreviewRendered: (
    documentOpenId: string,
    previewRenderDurationMs: number
  ) => void;
  /**
   * Fired once after the just-rendered preview HTML has been committed to
   * the DOM (#154). See GlossaryPreviewDecorator for what "committed" means
   * here and its caveats.
   */
  onDocumentOpenPreviewDomCommitted: (
    documentOpenId: string,
    durationMs: number,
    previewNodeCount: number
  ) => void;
  /** Fired once after glossary preview decoration has finished (#154). */
  onDocumentOpenPreviewDecorationCompleted: (
    documentOpenId: string,
    durationMs: number,
    visitedTextNodeCount: number,
    decoratedNodeCount: number,
    matchCount: number
  ) => void;
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
  onPendingMarkdownSelectionApplied,
  documentOpenId,
  onDocumentOpenPreviewRendered,
  onDocumentOpenPreviewDomCommitted,
  onDocumentOpenPreviewDecorationCompleted
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
          documentOpenId={documentOpenId}
          onDocumentOpenPreviewRendered={onDocumentOpenPreviewRendered}
          onDocumentOpenPreviewDomCommitted={onDocumentOpenPreviewDomCommitted}
          onDocumentOpenPreviewDecorationCompleted={
            onDocumentOpenPreviewDecorationCompleted
          }
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
  documentOpenId: string | null;
  onDocumentOpenPreviewRendered: (
    documentOpenId: string,
    previewRenderDurationMs: number
  ) => void;
  onDocumentOpenPreviewDomCommitted: (
    documentOpenId: string,
    durationMs: number,
    previewNodeCount: number
  ) => void;
  onDocumentOpenPreviewDecorationCompleted: (
    documentOpenId: string,
    durationMs: number,
    visitedTextNodeCount: number,
    decoratedNodeCount: number,
    matchCount: number
  ) => void;
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
  onChangeRatio,
  documentOpenId,
  onDocumentOpenPreviewRendered,
  onDocumentOpenPreviewDomCommitted,
  onDocumentOpenPreviewDecorationCompleted
}: MarkdownEditorSurfaceProps): JSX.Element {
  const content = currentDocumentContent(document);
  const previewRenderStartedAt = performance.now();
  const previewHtml = markdownPreviewRenderer.render(content);
  const previewRenderDurationMs = performance.now() - previewRenderStartedAt;
  const { entries, surfaceIndex } = useGlossaryEntriesForMatching(
    projectRootPath,
    glossaryRefreshToken
  );
  const reportedDocumentOpenIdRef = useRef<string | null>(null);

  // One-shot measurement (#152): fires only when documentOpenId changes
  // (i.e. a new open just applied its editor state and this component has
  // now re-rendered with that document's content), never on ordinary
  // content edits. App.tsx clears documentOpenId after handling this.
  //
  // Guarded by reportedDocumentOpenIdRef against React StrictMode's dev-only
  // double effect invocation (this app renders under <React.StrictMode> —
  // see main.tsx), which would otherwise report the same open twice and
  // duplicate previewRender.completed/usable/completed in dev/dogfood logs.
  useEffect(() => {
    if (documentOpenId && reportedDocumentOpenIdRef.current !== documentOpenId) {
      reportedDocumentOpenIdRef.current = documentOpenId;
      onDocumentOpenPreviewRendered(documentOpenId, previewRenderDurationMs);
    }
    // Deliberately keyed on documentOpenId alone: previewRenderDurationMs
    // is read from this same render's closure, but must not itself be a
    // dependency, or every content edit (not just an open) would re-fire.
  }, [documentOpenId]);
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
          documentOpenId={documentOpenId}
          previewRenderStartedAt={previewRenderStartedAt}
          onPreviewDomCommitted={onDocumentOpenPreviewDomCommitted}
          onPreviewDecorationCompleted={onDocumentOpenPreviewDecorationCompleted}
        />
      </section>
    </section>
  );
}
