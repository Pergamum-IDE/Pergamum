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
import { GlossaryEditor } from "./GlossaryEditor";
import { GlossaryPreviewDecorator } from "./GlossaryPreviewDecorator";
import { MarkdownEditor } from "./MarkdownEditor";
import { markdownPreviewRenderer } from "./preview/markdownPreviewRenderer";
import { useGlossaryEntriesForMatching } from "./useGlossaryEntriesForMatching";

interface EditorSurfaceProps {
  editor: CurrentEditor;
  projectRootPath: string | null;
  glossaryRefreshToken: number;
  translate: Translate;
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
}

export function EditorSurface({
  editor,
  projectRootPath,
  glossaryRefreshToken,
  translate,
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
  onDeleteGlossaryEntryForm
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
}

function MarkdownEditorSurface({
  document,
  projectRootPath,
  glossaryRefreshToken,
  translate,
  onChangeMarkdownContent
}: MarkdownEditorSurfaceProps): JSX.Element {
  const content = currentDocumentContent(document);
  const previewHtml = markdownPreviewRenderer.render(content);
  const { entries, surfaceIndex } = useGlossaryEntriesForMatching(
    projectRootPath,
    glossaryRefreshToken
  );

  return (
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
          onChange={onChangeMarkdownContent}
        />
      </section>

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
